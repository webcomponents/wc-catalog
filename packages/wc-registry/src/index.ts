/**
 * @license
 * Copyright 2021 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */

import sourceMapSupport from 'source-map-support';
import Koa from 'koa';
import Router from '@koa/router';
import type {AddressInfo} from 'net';

import {
  getGraphQLParameters,
  processRequest,
  renderGraphiQL,
  shouldRenderGraphiQL,
} from 'graphql-helix';
import bodyParser from 'koa-bodyparser';

import {schema} from './lib/graphql.js';

sourceMapSupport.install();

const app = new Koa();

const router = new Router();

router.use(bodyParser());

router.all('/graphql', async (context) => {
  const request = {
    body: context.request.body,
    headers: context.req.headers,
    method: context.request.method,
    query: context.request.query,
  };

  if (shouldRenderGraphiQL(request)) {
    context.body = renderGraphiQL({});
  } else {
    const {operationName, query, variables} = getGraphQLParameters(request);

    const result = await processRequest({
      operationName,
      query,
      variables,
      request,
      schema,
    });

    if (result.type === 'RESPONSE') {
      result.headers.forEach(({name, value}) =>
        context.response.set(name, value)
      );
      context.status = result.status;
      context.body = result.payload;
    } else {
      throw new Error(`Result type ${result.type} not supported`);
    }
  }
});

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
