/**
 * @license
 * Copyright 2021 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */

import {readFile} from 'fs/promises';
import {createRequire} from 'module';
import {makeExecutableSchema} from '@graphql-tools/schema';
import type {Resolvers} from 'wc-org-shared/lib/schema.js';
import {
  deletePackage,
  getElement,
  getElements,
  getPackageInfo,
  getPackageVersion,
  importPackage,
} from './firestore.js';

const require = createRequire(import.meta.url);

const schemaPath = require.resolve('wc-org-shared/src/lib/schema.graphql');
const schemaSource = await readFile(schemaPath, 'utf8');

const resolvers: Resolvers = {
  Query: {
    async package(_parent, {packageName}: {packageName: string}) {
      console.log('query package', packageName);
      const packageInfo = await getPackageInfo(packageName);
      if (packageInfo !== undefined) {
        return packageInfo;
      } else {
        console.log(`package ${packageName} not found in db`);
        const packageInfo = await importPackage(packageName);
        return packageInfo;
      }
    },
    async elements(_parent, {tag, limit}: {tag?: string|null, limit?: number|null}) {
      return getElements({tag, limit});
    },
    async element(_parent, {packageName, elementName, tag}: {packageName: string, elementName: string, tag: string}) {
      return getElement({packageName, elementName, tag});
    }
  },
  PackageInfo: {
    version: (packageInfo, {versionOrTag}, _context, _info) => {
      console.log('PackageInfo version', packageInfo.name, versionOrTag);
      const distTags = packageInfo.distTags;
      const version =
        distTags.find((distTag) => distTag.tag === versionOrTag)?.version ??
        versionOrTag;
      if (version === undefined) {
        throw new Error(`tag ${packageInfo.name}@${versionOrTag} not found`);
      }
      return getPackageVersion(packageInfo.name, version);
    },
  },
  Mutation: {
    async importPackage(_parent, {packageName}: {packageName: string}) {
      console.log('mutation deletePackage', packageName);
      const packageInfo = await importPackage(packageName);
      return packageInfo;
    },
    async deletePackage(_parent, {packageName}: {packageName: string}) {
      console.log('mutation deletePackage', packageName);
      // TODO: authentication and authorization!
      await deletePackage(packageName);
      return true;
    },
  },
};

export const schema = makeExecutableSchema({
  typeDefs: schemaSource,
  resolvers,
});
