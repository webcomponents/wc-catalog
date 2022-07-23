/**
 * @license
 * Copyright 2022 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */

// import {readFile} from 'fs/promises';
// import {createRequire} from 'module';
import Router from '@koa/router';
import apolloClient from '@apollo/client/core/core.cjs';
import baseLayout from 'wc-org-content/site/_includes/layouts/base.11ty.cjs';
import {renderElement} from './elementTemplate.js';

const {ApolloClient, InMemoryCache, gql} = apolloClient;

const client = new ApolloClient({
  uri: 'http://localhost:8080/graphql',
  cache: new InMemoryCache(),
});

// const require = createRequire(import.meta.url);
// const schemaPath = require.resolve('wc-org-shared/src/lib/schema.graphql');
// const schemaSource = await readFile(schemaPath, 'utf8');

export const catalogRouter = new Router();

catalogRouter.get('/element/:path+', async (context) => {
  const {params} = context;

  const elementPath = params['path'];
  const elementPathSegments = elementPath!.split('/');
  const isScoped = elementPathSegments[0]?.startsWith('@');
  const packageName = isScoped
    ? elementPathSegments[0] + '/' + elementPathSegments[1]
    : elementPathSegments[0];
  const elementName = elementPathSegments[isScoped ? 2 : 1];

  const result = await client.query({
    query: gql`
      {
        package(packageName: "${packageName}") {
          name
          description
          version {
            version
            description
            customElements(tagName: "${elementName}") {
              tagName
              declaration
              customElementExport
              declaration
            }
            customElementsManifest
          }
        }
      }
    `,
  });

  if (result.errors !== undefined && result.errors.length > 0) {
    throw new Error(result.errors.map((e) => e.message).join('\n'));
  }
  const {data} = result;
  const packageVersion = data.package?.version;
  if (packageVersion === undefined) {
    throw new Error(`No such package version: ${packageName}`);
  }
  const customElementsManifest =
    packageVersion.customElementsManifest !== undefined &&
    JSON.parse(packageVersion.customElementsManifest);

  const customElement = packageVersion.customElements?.[0];

  if (customElement === undefined || customElement.tagName !== elementName) {
    throw new Error('Internal error');
  }

  const page = baseLayout.render({
    title: 'Catalog',
    content: renderElement({
      packageName: packageName!,
      elementName: elementName!,
      declarationReference: customElement.declaration,
      customElementExport: customElement.export,
      manifest: customElementsManifest,
    }),
  });

  // console.log('page', page);
  context.body = page;
  context.type = 'html';
  context.status = 200;
});

// const replacements: Record<string, string> = {
//   '<': '&lt;',
//   '>': '&gt;',
//   '&': '&amp;',
//   "'": '&#39;',
//   '"': '&quot;',
// };
// const replacer = (s: string) => replacements[s]!;
// const escapeHTML = (html: string) => html.replaceAll(/[<>&'"]/g, replacer);
