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

firebase.initializeApp({
  projectId: 'wc-org',
});

const db = new Firestore({
  projectId: 'wc-org'
});
const docRef = db.collection('hello').doc('world');

const app = new Koa();

const router = new Router();
router.get('/', async (ctx) => {
  // This should work but gets stuck at 1:
  // await docRef.set({count: FieldValue.increment(1)});
  // const doc = await docRef.get();
  // const count = doc.get('count');

  // Racy increment:
  const doc = await docRef.get();
  const count = (doc.get('count') ?? 0) + 1;
  await docRef.set({count});

  ctx.status = 200;
  ctx.type = 'html';
  ctx.body = `
    <h1>Hello</h1>
    <p>This view has been loaded ${count} times.</p>
  `;
});

app.use(router.routes());
app.use(router.allowedMethods());

const server = app.listen(8080, () => {
  const port = (server.address() as AddressInfo).port;
  console.log(`Server started: http://localhost:${port}`);
});
