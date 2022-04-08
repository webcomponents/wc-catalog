/**
 * @license
 * Copyright 2021 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */

import {
  DocumentData,
  FirestoreDataConverter,
  QueryDocumentSnapshot,
} from '@google-cloud/firestore';
import {Firestore} from '@google-cloud/firestore';
import firebase from 'firebase-admin';
import {CustomElementInfo, getCustomElements} from './manifest.js';
import {fetchCustomElementsManifest, fetchPackage, Package} from './npm.js';
import {
  CustomElement,
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

// /**
//  * The status of a package.
//  *
//  * Concurrent requests for package metadata, which may trigger fetching from
//  * npm, are possible. We need to ensure there's only one writing request via
//  * transactions that lock on the status field.
//  *
//  * Because packages have versions that update over a time, a package may have
//  * a pending mutation task from initial fetching, or updating by querying and
//  * fetching new version metadata.
//  *
//  * Packages may not exist, in which case we record that they're not found in
//  * order to avoid flooding npm with invalid requests.
//  *
//  * Errors while fetching packages are divided into two categories:
//  *  - Invalid packages for which we were able to fetch metadata, but something
//  * in it was incorrect. Hopefully this never happens, but is included for
//  * completeness.
//  *  - Errors, such as network failures. In these cases we should be able to
//  * retry fetching package metadata.
//  */
// export const PackageStatus = {
//   /**
//    * The package is being downloaded and indexed for the first time.
//    */
//   INITIALIZING: 1,

//   /**
//    * Packages may be read from, but there is a pending update task and
//    * new versions of the package are being downloaded and indexed.
//    */
//   // UPDATING: 2,

//   /**
//    * The package is indexed and read to be read.
//    */
//   READY: 3,

//   /**
//    * The package was not found on npm
//    */
//   // NOT_FOUND: 4,

//   /**
//    * The package metadata was invalid. This is not a retryable error unless a
//    * new package version is published.
//    */
//   // INVALID: 5,

//   /**
//    * A retryable error occured, such as network failure.
//    */
//   // ERROR: 6,
// } as const;
// export type PackageStatus = typeof PackageStatus[keyof typeof PackageStatus];

// /**
//  * The status of a package version.
//  *
//  * This is similar to the package status, except that package versions are
//  * immutable and can never be updated.
//  */
// export const VersionStatus = {
//   INITIALIZING: 1,
//   READY: 2,
//   // ERROR: 3,
// } as const;
// export type VersionStatus = typeof VersionStatus[keyof typeof VersionStatus];

// export type PackageInfoFields = Omit<PackageInfo, 'versions'> & {
//   status: PackageStatus;
// };

export const packageInfoConverter: FirestoreDataConverter<
  Omit<PackageInfo, 'versions'>
> = {
  fromFirestore(
    snapshot: QueryDocumentSnapshot<DocumentData>
  ): Omit<PackageInfo, 'versions'> {
    return {
      name: snapshot.id,
      status: snapshot.get('status'),
      description: snapshot.get('description'),
    };
  },
  toFirestore(_packageInfo: PackageInfo) {
    throw new Error('not implemented');
  },
};

// export type PackageVersionFields = PackageVersion & {
//   status: VersionStatus;
// };

export const packageVersionConverter: FirestoreDataConverter<PackageVersion> = {
  fromFirestore(snapshot: QueryDocumentSnapshot<DocumentData>): PackageVersion {
    return {
      version: snapshot.id,
      status: snapshot.get('status'),
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
        const versionsRef = packageRef.collection('versions');
        const versionsResults = await versionsRef
          .withConverter(packageVersionConverter)
          .get();
        const versions: Array<PackageVersion> = [];
        for (const versionDoc of versionsResults.docs) {
          const versionData = {...versionDoc.data()};
          versions.push(versionData);
          const customElementsRef = versionDoc.ref.collection('customElements');
          const customElementsResults = await customElementsRef
            .withConverter(customElementConverter)
            .get();
          const customElements: Array<CustomElement> = [];
          versionData.customElements = customElements;
          for (const customElementDoc of customElementsResults.docs) {
            customElements.push(customElementDoc.data());
          }
        }
        return {
          ...packageInfo,
          versions,
        };
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

export const importPackage = async (
  packageName: string
): Promise<PackageInfo> => {
  const packageDocId = getPackageDocId(packageName);
  const packageRef = db.collection('packages').doc(packageDocId);

  const [_createResult, npmPackage] = await Promise.all([
    // Mark package as initializing.
    packageRef.create({status: PackageStatus.INITIALIZING}),
    await fetchPackage(packageName),
  ]);

  const versions = await importPackageVersions(packageName, npmPackage);

  // Mark package as ready.
  await packageRef.set({status: PackageStatus.READY});

  return {
    name: packageName,
    status: PackageStatus.READY,
    description: 'TODO',
    versions,
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
          console.log('found customElementsManifest', version);
          customElementsManifestString = JSON.stringify(customElementsManifest);
          customElements = getCustomElements(customElementsManifest);
          console.log('customElements', customElements);
        }
      }

      const versionTime = time[version];

      // Store version data and mark version as ready
      await versionRef.set({
        status: VersionStatus.READY,
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
