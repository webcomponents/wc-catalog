/**
 * @license
 * Copyright 2021 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */

import {
  DocumentData,
  FirestoreDataConverter,
  QueryDocumentSnapshot,
  FieldValue,
  Timestamp,
} from '@google-cloud/firestore';
import {Firestore} from '@google-cloud/firestore';
import firebase from 'firebase-admin';
import {CustomElementInfo, getCustomElements} from './manifest.js';
import {fetchCustomElementsManifest, fetchPackage, Package} from './npm.js';
import {
  CustomElement,
  DistTag,
  PackageInfo,
  PackageStatus,
  PackageVersion,
  VersionStatus,
} from 'wc-org-shared/lib/schema.js';
import {
  Module,
  Package as CustomElementsManifest,
  Reference,
} from 'custom-elements-manifest/schema';

const projectId = 'wc-catalog';

firebase.initializeApp({projectId});

export const db = new Firestore({projectId});

/**
 * Returns a Firestore document ID based on the package name.
 */
export const getPackageDocId = (packageName: string) =>
  packageName.replaceAll('/', '__');

/**
 * Returns the package name based on the package document ID.
 */
export const getPackageName = (getPackageDocId: string) =>
  getPackageDocId.replaceAll('__', '/');


export const packageInfoConverter: FirestoreDataConverter<
  Omit<PackageInfo, 'version'>
> = {
  fromFirestore(
    snapshot: QueryDocumentSnapshot<DocumentData>
  ): Omit<PackageInfo, 'version'> {
    const distTags = snapshot.get('distTags');
    const graphQLDistTags = Object.entries(distTags).map(
      ([tag, version]) => ({tag, version} as DistTag)
    );
    return {
      name: snapshot.id,
      lastUpdate: (snapshot.get('lastUpdate') as Timestamp).toDate(),
      status: snapshot.get('status'),
      description: snapshot.get('description'),
      distTags: graphQLDistTags,
    };
  },
  toFirestore(_packageInfo: PackageInfo) {
    throw new Error('not implemented');
  },
};

export const packageVersionConverter: FirestoreDataConverter<PackageVersion> = {
  fromFirestore(snapshot: QueryDocumentSnapshot<DocumentData>): PackageVersion {
    return {
      version: snapshot.id,
      status: snapshot.get('status'),
      lastUpdate: (snapshot.get('lastUpdate') as Timestamp).toDate(),
      description: snapshot.get('description'),
      author: snapshot.get('author'),
      time: snapshot.get('time'),
      homepage: snapshot.get('homepage'),
      customElements: snapshot.get('customElements'),
      customElementsManifest: snapshot.get('customElementsManifest'),
    };
  },
  toFirestore(_packageInfo: PackageVersion) {
    throw new Error('not implemented');
  },
};

export const customElementConverter: FirestoreDataConverter<CustomElement> = {
  fromFirestore(snapshot: QueryDocumentSnapshot<DocumentData>): CustomElement {
    return {
      tagName: snapshot.get('tagName'),
      className: snapshot.get('className'),
      customElementExport: snapshot.get('customElementExport'),
      jsExport: snapshot.get('jsExport'),
    };
  },
  toFirestore(_packageInfo: CustomElement) {
    throw new Error('not implemented');
  },
};

/**
 * Gets a PackageVersion object from the database, including all the
 * custom elements exported by the package.
 */
export const getPackageVersion = async (
  packageName: string,
  version: string
): Promise<PackageVersion> => {
  const packageDocId = getPackageDocId(packageName);
  const packageRef = db.collection('packages').doc(packageDocId);
  const versionRef = packageRef.collection('versions').doc(version);
  const versionDoc = await versionRef
    .withConverter(packageVersionConverter)
    .get();
  const versionData = versionDoc.data();
  if (versionData === undefined) {
    throw new Error();
  }
  const customElementsRef = versionDoc.ref.collection('customElements');
  const customElementsResults = await customElementsRef
    .withConverter(customElementConverter)
    .get();
  const customElements: Array<CustomElement> = [];
  (versionData as Mutable<PackageVersion, 'customElements'>).customElements =
    customElements;
  for (const customElementDoc of customElementsResults.docs) {
    customElements.push(customElementDoc.data());
  }
  return versionData;
};

/**
 * Gets the PackageInfo for a package, excluding package versions.
 * 
 * Currently only works for packages with a status of 
 */
export const getPackageInfo = async (
  packageName: string
): Promise<PackageInfo | undefined> => {
  const packageDocId = getPackageDocId(packageName);
  // console.log('packageInfo', packageName, packageDocId);
  const packageRef = db.collection('packages').doc(packageDocId);
  const packageDoc = await packageRef.withConverter(packageInfoConverter).get();
  if (packageDoc.exists) {
    const packageInfo = packageDoc.data()!;
    const status = packageInfo.status;
    switch (status) {
      case PackageStatus.READY: {
        return packageInfo;
      }
      case PackageStatus.INITIALIZING:
      case PackageStatus.INVALID:
      case PackageStatus.NOT_FOUND:
      case PackageStatus.ERROR:
      case PackageStatus.UPDATING: {
        throw new Error(`Unhandled package status ${status}`);
      }
      default:
        // exhaustiveness check
        status as void;
    }
    throw new Error(`Unhandled package status  ${status}`);
  } else {
    return undefined;
  }
};

/**
 * Imports a package from npm.
 * 
 * 
 */
export const importPackage = async (
  packageName: string
): Promise<PackageInfo> => {
  const packageDocId = getPackageDocId(packageName);
  const packageRef = db.collection('packages').doc(packageDocId);

  const [_createResult, npmPackage] = await Promise.all([
    // Mark package as initializing.
    packageRef.create({
      status: PackageStatus.INITIALIZING,
      lastUpdate: FieldValue.serverTimestamp(),
    }),
    await fetchPackage(packageName),
  ]);

  const versions = await importPackageVersions(packageName, npmPackage);
  const distTags = npmPackage['dist-tags'];
  const latestVersion = distTags['latest']!;
  const latestVersionData = versions.find((v) => v.version === latestVersion);

  // Mark package as ready.
  const readyResult = await packageRef.set({
    name: packageName,
    lastUpdate: FieldValue.serverTimestamp(),
    status: PackageStatus.READY,
    description: 'TODO',
    distTags,
  });

  // TODO: dedupe with the set() call above, maybe reuse the packageInfoConverter
  const graphQLDistTags = Object.entries(distTags).map(([tag, version]) => ({
    tag,
    version,
  }));
  return {
    name: packageName,
    // Is this the same as the timestamp set in the create() call above?
    lastUpdate: readyResult.writeTime,
    status: PackageStatus.READY,
    description: 'TODO',
    distTags: graphQLDistTags,
    version: latestVersionData,
  };
};

const importPackageVersions = async (
  packageName: string,
  npmPackage: Package
) => {
  const packageDocId = getPackageDocId(packageName);
  const packageRef = db.collection('packages').doc(packageDocId);

  const npmVersions = Object.entries(npmPackage.versions);
  const versions: Array<PackageVersion> = [];

  const time = npmPackage.time;

  await Promise.all(
    npmVersions.map(async ([version, versionData]) => {
      // console.log(version, versionData);
      // First, write initial data including the "initialized" status
      const versionRef = packageRef.collection('versions').doc(version);
      const customElementsPath = versionData.customElements;

      await versionRef.create({
        status: VersionStatus.INITIALIZING,
        lastUpdate: FieldValue.serverTimestamp(),
        description: versionData.description ?? '',
        type: versionData.type ?? 'commonjs',
        // customElements: customElements ?? null,
      });

      let customElementsManifest: CustomElementsManifest | undefined =
        undefined;
      let customElementsManifestString: string | undefined = undefined;
      let customElements: Array<CustomElementInfo> | undefined = undefined;

      if (customElementsPath !== undefined) {
        customElementsManifest = await fetchCustomElementsManifest(
          packageName,
          version,
          customElementsPath
        );

        if (customElementsManifest) {
          // console.log('found customElementsManifest', version);
          customElementsManifestString = JSON.stringify(customElementsManifest);
          customElements = getCustomElements(customElementsManifest);
          // console.log('customElements', customElements);
        }
      }

      const versionTime = time[version];

      // Store version data and mark version as ready
      const readyResult = await versionRef.set({
        status: VersionStatus.READY,
        lastUpdate: FieldValue.serverTimestamp(),
        description: versionData.description,
        author: versionData.author?.name ?? '',
        time: versionTime,
        homepage: versionData.homepage ?? null,
        // customElements: customElements ?? null,
        // customElementsManifest: customElementsManifestString ?? null,
      });

      // TODO: store custom elements in collection

      if (customElements) {
        const customElementsRef = versionRef.collection('customElements');
        for (const c of customElements) {
          const ceRef = customElementsRef.doc();
          const customElement = customElementInfoToSchema(packageName, c);
          ceRef.set({
            tagName: customElement.tagName,
            className: customElement.className,
            customElementExport: customElement.customElementExport,
            jsExport: customElement.jsExport,
          });
        }
      }

      versions.push({
        version,
        status: VersionStatus.READY,
        lastUpdate: readyResult.writeTime,
        description: versionData.description,
        // type: versionData.type,
        author: versionData.author?.name ?? '',
        time: versionTime,
        homepage: versionData.homepage,
        customElements: customElements?.map((c) =>
          customElementInfoToSchema(packageName, c)
        ),
        customElementsManifest: customElementsManifestString,
      });
    })
  );

  return versions;
};

const customElementInfoToSchema = (
  packageName: string,
  info: CustomElementInfo
): CustomElement => {
  return {
    tagName: info.export.name,
    className: info.declaration.name,
    customElementExport: referenceString(packageName, info.module, info.export),
    jsExport: referenceString(packageName, info.module, info.declaration),
    // declaration: info.,
  };
};

const referenceString = (packageName: string, mod: Module, ref: Reference) => {
  return `${packageName}/${mod.path}#${ref.name}`;
};

export const deletePackage = async (packageName: string) => {
  const packageDocId = getPackageDocId(packageName);
  const packageRef = db.collection('packages').doc(packageDocId);
  const versionsRef = packageRef.collection('versions');
  const versions = await versionsRef.get();
  for (const v of versions.docs) {
    await v.ref.delete();
  }
  await packageRef.delete();
};

type Mutable<T extends {[x: string]: any}, K extends string> = {
  [P in K]: T[P];
};
