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
  getCustomElements,
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
    version: async (packageInfo, {versionOrTag}, context, _info) => {
      // TODO(justinfagnani): strongly type context?
      context.packageName = packageInfo.name;
      console.log('PackageInfo version', packageInfo.name, versionOrTag);

      // Check to see if versionOrTag is a distTag
      const distTags = packageInfo.distTags;
      const version =
        distTags.find((distTag) => distTag.tag === versionOrTag)?.version ??
        versionOrTag;
        
      const packageVersion = await getPackageVersion(packageInfo.name, version);
      if (packageVersion === undefined) {
        throw new Error(`tag ${packageInfo.name}@${versionOrTag} not found`);
      }
      return packageVersion;
    },
  },
  PackageVersion: {
    customElements: async (packageVersion, {tagName}: {tagName?: string | null}, context, _info) => {
      const packageName = context.packageName;
      // console.log('tagName', tagName);
      // console.log(_info.path.prev);
      // console.log('packageVersion', packageVersion);
      // console.log('_context', _context);
      // console.log('_info', _info);
      return getCustomElements(packageName, packageVersion.version, tagName ?? undefined);
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
