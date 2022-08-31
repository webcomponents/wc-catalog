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
  DocumentReference,
  Query,
  CollectionReference,
} from '@google-cloud/firestore';
import {Firestore} from '@google-cloud/firestore';
import firebase from 'firebase-admin';
import {
  CustomElementInfo,
  getCustomElements as getCustomElementsFromManifest,
  referenceString,
} from '@webcomponents/custom-element-manifest-tools';
import {fetchCustomElementsManifest, fetchPackage, Package} from './npm.js';
import {
  CustomElement,
  DistTag,
  PackageInfo,
  PackageStatus,
  PackageVersion,
  VersionStatus,
} from '@webcomponents/registry-api/lib/schema.js';
import type {Package as CustomElementsManifest} from 'custom-elements-manifest/schema';

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
      status: snapshot.get('status'),
      lastUpdate: (snapshot.get('lastUpdate') as Timestamp).toDate(),
      version: snapshot.id,
      // TODO: convert from Map to list
      distTags: snapshot.get('distTags'),
      description: snapshot.get('description'),
      type: snapshot.get('type'),
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
      package: snapshot.get('package'),
      version: snapshot.get('version'),
      // TODO: convert from Map to list
      distTags: snapshot.get('distTags'),
      author: snapshot.get('author'),
      tagName: snapshot.get('tagName'),
      className: snapshot.get('className'),
      customElementExport: snapshot.get('customElementExport'),
      declaration: snapshot.get('declaration'),
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
): Promise<PackageVersion | undefined> => {
  const packageDocId = getPackageDocId(packageName);
  const packageRef = db
    .collection('packages')
    .doc(packageDocId) as DocumentReference<PackageInfoData>;
  const versionRef = packageRef.collection('versions').doc(version);
  const versionDoc = await versionRef
    .withConverter(packageVersionConverter)
    .get();
  return versionDoc.data();
};

export const getCustomElements = async (
  packageName: string,
  version: string,
  tagName?: string
): Promise<CustomElement[]> => {
  const packageDocId = getPackageDocId(packageName);
  const packageRef = db
    .collection('packages')
    .doc(packageDocId) as DocumentReference<PackageInfoData>;
  const versionRef = packageRef.collection('versions').doc(version);
  const customElementsRef = versionRef.collection('customElements');
  let customElementsQuery:
    | CollectionReference<CustomElement>
    | Query<CustomElement> = customElementsRef.withConverter(
    customElementConverter
  );
  if (tagName !== undefined) {
    customElementsQuery = customElementsQuery.where('tagName', '==', tagName);
  }
  const customElementsResults = await customElementsQuery.get();
  return customElementsResults.docs.map((d) => d.data());
};

/**
 * Gets the PackageInfo for a package, excluding package versions.
 *
 * Currently only works for packages with a status of READY
 */
export const getPackageInfo = async (
  packageName: string
): Promise<PackageInfo | undefined> => {
  const packageDocId = getPackageDocId(packageName);
  console.log('packageInfo', packageName, packageDocId);
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
 */
export const importPackage = async (
  packageName: string
): Promise<PackageInfo> => {
  const packageDocId = getPackageDocId(packageName);
  const packageRef = db
    .collection('packages')
    .doc(packageDocId) as DocumentReference<PackageInfoData>;

  const [_createResult, npmPackage] = await Promise.all([
    // Mark package as initializing.
    (packageRef as unknown as DocumentReference<PackageInfoStatus>).create({
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
    lastUpdate: readyResult.writeTime.toDate(),
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

  await Promise.all(
    npmVersions.map(async ([version, versionData]) => {
      // First, write initial data including the "initialized" status
      const versionRef = packageRef.collection('versions').doc(version);
      await versionRef.create({
        status: VersionStatus.INITIALIZING,
        lastUpdate: FieldValue.serverTimestamp(),
      });

      // Look for a customElements field in package.json, fetch the file if the
      // field exists, and extract custom elements from it.
      let customElementsManifest: CustomElementsManifest | undefined =
        undefined;
      let customElementsManifestString: string | undefined = undefined;
      let customElements: Array<CustomElementInfo> | undefined = undefined;

      if (versionData.customElements !== undefined) {
        customElementsManifest = await fetchCustomElementsManifest(
          packageName,
          version,
          versionData.customElements
        );

        if (customElementsManifest) {
          customElementsManifestString = JSON.stringify(customElementsManifest);
          customElements = getCustomElementsFromManifest(
            customElementsManifest,
            packageName,
            version
          );
        }
      }

      const packageTime = npmPackage.time[version]!;
      const packageType = versionData.type ?? 'commonjs';
      const author = versionData.author?.name ?? '';
      const distTags = npmPackage['dist-tags'];
      const versionDistTags = Object.entries(distTags)
        .filter(([, v]) => v === version)
        .map(([t]) => t);

      // Store package data and mark version as ready
      // TODO: we want this type to match the schema and converter type. How do
      // we get strongly typed refs?
      const readyResult = await versionRef.set({
        status: VersionStatus.READY,
        lastUpdate: FieldValue.serverTimestamp(),
        // package: packageName,
        version,
        description: versionData.description ?? '',
        type: packageType,
        distTags: versionDistTags,
        author,
        // TODO: convert to Timestamp
        time: packageTime,
        homepage: versionData.homepage ?? null,
        customElementsManifest: customElementsManifestString ?? null,
      });

      // Store custom elements data in subcollection
      if (customElements !== undefined) {
        const customElementsRef = versionRef.collection('customElements');
        for (const c of customElements) {
          const ceRef = customElementsRef.doc();
          // const customElement = customElementInfoToSchema(packageName, c);
          ceRef.set({
            package: packageName,
            version,
            distTags: versionDistTags,
            author,
            tagName: c.export.name,
            className: c.declaration.name,
            // TODO (justinfagnani): we need to namespace custom element exports
            customElementExport: referenceString(
              packageName,
              c.module,
              c.export.name
            ),
            declaration: referenceString(
              packageName,
              c.module,
              c.declaration.name
            ),
          });
        }
      }

      versions.push({
        status: VersionStatus.READY,
        lastUpdate: readyResult.writeTime.toDate(),
        version,
        distTags: versionDistTags,
        description: versionData.description,
        type: packageType,
        author: author,
        time: new Date(packageTime),
        homepage: versionData.homepage,
        customElements: customElements?.map((c) => ({
          package: packageName,
          version,
          distTags: versionDistTags,
          author,
          tagName: c.export.name,
          className: c.declaration.name,
          customElementExport: referenceString(
            packageName,
            c.module,
            c.export.name
          ),
          declaration: referenceString(
            packageName,
            c.module,
            c.declaration.name
          ),
        })),
        customElementsManifest: customElementsManifestString,
      });
    })
  );

  return versions;
};

// const customElementInfoToSchema = (
//   packageName: string,
//   info: CustomElementInfo
// ): CustomElement => {
//   return {
//     tagName: info.export.name,
//     className: info.declaration.name,
//     customElementExport: referenceString(packageName, info.module, info.export),
//     jsExport: referenceString(packageName, info.module, info.declaration),
//     // declaration: info.,
//   };
// };

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

export const getElements = async ({
  tag,
  limit,
}: {
  tag?: string | null;
  limit?: number | null;
}): Promise<CustomElement[]> => {
  const elementsRef = db.collectionGroup('customElements');
  let elementsQuery: Query<CustomElement> = elementsRef.withConverter(
    customElementConverter
  );
  if (tag) {
    elementsQuery = elementsQuery.where('distTags', 'array-contains', tag);
  }
  if (limit) {
    elementsQuery = elementsQuery.limit(limit);
  }
  const elements = await elementsQuery.get();
  return elements.docs.map((d) => {
    console.log('custom element', d.ref.path);
    return d.data();
  });
};

export const getElement = async ({
  packageName,
  elementName,
  tag,
}: {
  packageName: string;
  elementName: string;
  tag?: string | null;
  limit?: number | null;
}): Promise<CustomElement> => {
  const elementsRef = db.collectionGroup('customElements');
  let elementsQuery: Query<CustomElement> = elementsRef
    .withConverter(customElementConverter)
    .where('package', '==', packageName)
    .where('tagName', '==', elementName)
    .where('distTags', 'array-contains', tag ?? 'latest');

  const elements = await elementsQuery.get();
  if (elements.size === 0) {
    throw new Error(`Not found`);
  }
  if (elements.size > 1) {
    throw new Error(`More than one result: ${elements.size}`);
  }
  const elementDoc = elements.docs[0]!;
  console.log('custom element', elementDoc.ref.path);
  return elementDoc.data();
};

// type Mutable<T extends {[x: string]: any}, K extends string> = {
//   [P in K]: T[P];
// };

/**
 * Generates a type representing a Firestore document from a GraphQL schema
 * type.
 *
 *  - Removes __typename
 *  - Date -> Timestamp
 *  - Removes specified collection fields
 *  - Transforms list of tuples to maps
 */
type FirestoreType<
  SchemaType,
  MapFields extends {[k: string]: string},
  Collections extends string
> = {
  [K in keyof SchemaType]: K extends '__typename'
    ? never
    : K extends Date
    ? Timestamp
    : K extends keyof MapFields
    ? {
        [key: string]: MapFields[K] extends string
          ? SchemaType[K] extends ReadonlyArray<infer T>
            ? Omit<T, MapFields[K]>
            : never
          : MapFields[K];
      }
    : K extends Collections
    ? never
    : SchemaType[K];
};

/**
 * Subset of fields usable for initial Firestore create() calls.
 */
type PackageInfoStatus = {
  status: string;
  lastUpdate: Timestamp;
};

/**
 * Firestore DocumentData for PackageInfo documents.
 */
type PackageInfoData = FirestoreType<
  PackageInfo,
  {distTags: string},
  'version'
>;
