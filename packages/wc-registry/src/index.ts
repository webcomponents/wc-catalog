/**
 * @license
 * Copyright 2021 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */

import Koa from 'koa';
import Router from '@koa/router';
import type {AddressInfo} from 'net';

const app = new Koa();

const router = new Router();
router.get('/', (ctx) => {
  ctx.status = 200;
  ctx.type = 'html';
  ctx.body = '<h1>Hello</h1>';
});

app.use(router.routes());
app.use(router.allowedMethods());

const server = app.listen(8080, () => {
  const port = (server.address() as AddressInfo).port;
  console.log(`Server started: http://localhost:${port}`);
});
