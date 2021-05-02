/**
 * @license
 * Copyright 2021 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */

import { DocumentData, FirestoreDataConverter, QueryDocumentSnapshot } from "@google-cloud/firestore";
import type {PackageInfo, PackageVersion} from '../../gen/resolvers';

export const PackageStatus = {
  INITIALIZING: 1,
  // UPDATING: 2,
  READY: 3,
  // NOT_FOUND: 4,
  // INVALID: 5,
  // ERROR: 6,
} as const;
export type PackageStatus = typeof PackageStatus[keyof typeof PackageStatus];

export const VersionStatus = {
  INITIALIZING: 1,
  READY: 2,
  // ERROR: 3,
} as const;
export type VersionStatus = typeof VersionStatus[keyof typeof VersionStatus];

export type PackageInfoFields = Omit<PackageInfo, 'versions'> & {
  status: PackageStatus;
};

export const packageInfoConverter: FirestoreDataConverter<PackageInfoFields> = {
  fromFirestore(snapshot: QueryDocumentSnapshot<DocumentData>): PackageInfoFields {
    return {
      name: snapshot.id,
      description: snapshot.get('description'),
      status: snapshot.get('status'),
    };
  },
  toFirestore(_packageInfo: PackageInfoFields) {
    throw new Error('not implemented');
  }
};

export type PackageVersionFields = PackageVersion & {
  status: VersionStatus;
};

export const packageVersionConverter: FirestoreDataConverter<PackageVersionFields> = {
  fromFirestore(snapshot: QueryDocumentSnapshot<DocumentData>): PackageVersionFields {
    return {
      version: snapshot.id,
      description: snapshot.get('description'),
      status: snapshot.get('status'),
    };
  },
  toFirestore(_packageInfo: PackageVersionFields) {
    throw new Error('not implemented');
  }
};
