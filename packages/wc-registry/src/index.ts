/**
 * @license
 * Copyright 2021 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */

import Koa from 'koa';
import Router from '@koa/router';
import type {AddressInfo} from 'net';

import firebase from 'firebase-admin';

import {Firestore} from '@google-cloud/firestore';

import {buildSchema} from 'graphql';
import {readFile} from 'fs/promises';
import {resolve, dirname} from 'path';
import graphqlHTTP from 'koa-graphql';

import type {PackageInfo, PackageVersion, Resolvers} from '../gen/resolvers';
import { packageInfoConverter, PackageStatus, packageVersionConverter, VersionStatus } from './lib/firestore.js';
import { getPackage } from './lib/npm.js';

const base  = dirname(new URL(import.meta.url).pathname);
const schemaSource = await readFile(resolve(base, './schema.graphql'), 'utf8');

const schema = buildSchema(schemaSource);

firebase.initializeApp({
  projectId: 'wc-org',
});

const db = new Firestore({
  projectId: 'wc-org'
});
const packagesRef = db.collection('packages');

const resolvers: Resolvers = {
  Query: {
    // @ts-expect-error
    async packageInfo({packageName}: {packageName: string}) {
      console.log('packageInfo', packageName);
      const packageRef = packagesRef.doc(packageName);
      const packageDoc = await packageRef.withConverter(packageInfoConverter).get();
      if (packageDoc.exists) {
        const packageInfo = packageDoc.data()!;
        const status = packageInfo.status;
        switch (status) {
          case PackageStatus.READY: {
            const versionsRef = packageRef.collection('versions');
            const versionsResults = await versionsRef.withConverter(packageVersionConverter).get();
            const versions: Array<PackageVersion> = [];
            for (const versionDoc of versionsResults.docs) {
              versions.push(versionDoc.data());
            }
            return {
              ...packageInfo,
              versions,
            };
          }
          case PackageStatus.INITIALIZING: {
            throw new Error(`unhandled ${status}`);
            return undefined;
          }
          default:
            // exhaustiveness check
            status as void;
        }
        throw new Error(`unhandled ${status}`);
      } else {
        console.log('package not found in db');
        const [, npmPackage] = await Promise.all([
          // Mark package as initializing.
          packageRef.create({status: PackageStatus.INITIALIZING}),
          await getPackage(packageName),
        ]);

        const versions = Object.entries(npmPackage.versions);
        const versionMap = new Map<string, PackageVersion>();

        await Promise.all(versions.map(async ([version, versionData]) => {
          // First, write initial data including the "initialized" status
          const versionRef = packageRef.collection('versions').doc(version);
          /* const versionDoc = */ await versionRef.create({
            status: VersionStatus.INITIALIZING,
            description: versionData.description,
            type: versionData.type,
          });

          // // Next, download the tarball so we can get at custom-elements.json
          // console.log('downloading tarball for', version);
          // const destination = await downloadPackage(npmPackage, version, './package_downloads/');

          versionMap.set(version, {
            version,
            description: versionData.description,
            // type: versionData.type,
          });
        }));

        // Mark package as ready.
        await packageRef.set({status: PackageStatus.READY});

        const packageInfo: PackageInfo = {
          name: packageName,
          description: 'TODO',
          versions: [...versionMap.values()],
        };
        return packageInfo;
      }
    },
  },
};

const app = new Koa();

const router = new Router();

router.all('/graphql', graphqlHTTP({
  schema,
  rootValue: resolvers.Query,
  graphiql: true,
  formatError: (error, _ctx) => ({
    message: error.message,
    locations: error.locations,
    stack: error.stack ? error.stack.split('\n') : [],
    path: error.path
  }),
}));

router.get('/', async (ctx) => {
  ctx.status = 200;
  ctx.type = 'html';
  ctx.body = `
    <h1>Web Components Registry</h1>
    <p>
      This server hosts a GraphQL API for interacting with the
      web components registry.
    </p>
    <p>See the interactive query editor at <a href="/graphql">/graphql</a>.
  `;
});

app.use(router.routes());
app.use(router.allowedMethods());

const server = app.listen(8080, () => {
  const port = (server.address() as AddressInfo).port;
  console.log(`Server started: http://localhost:${port}`);
});
