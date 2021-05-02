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

import type {Resolvers} from '../gen/resolvers';

const base  = dirname(new URL(import.meta.url).pathname);
const schemaSource = await readFile(resolve(base, './schema.graphql'), 'utf8');

// console.log(schemaSource);

const schema = buildSchema(schemaSource);
// console.log(schema);

firebase.initializeApp({
  projectId: 'wc-org',
});

const db = new Firestore({
  projectId: 'wc-org'
});
const docRef = db.collection('hello').doc('world');

const resolvers: Resolvers = {
  Query: {
    count: async () => {
      // This should work but gets stuck at 1:
      // await docRef.set({count: FieldValue.increment(1)});
      // const doc = await docRef.get();
      // const count = doc.get('count');

      // Racy increment:
      const doc = await docRef.get();
      const count = (doc.get('count') ?? 0) + 1;
      await docRef.set({count});
      return count;
    },
  },
};

const app = new Koa();

const router = new Router();

router.all('/graphql', graphqlHTTP({
  schema,
  rootValue: resolvers.Query,
  graphiql: true,
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
