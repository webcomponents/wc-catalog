// import {readFile} from 'fs/promises';
// import {createRequire} from 'module';
import Router from '@koa/router';
import apolloClient from '@apollo/client/core/core.cjs';

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
        element(
          packageName: "${packageName}"
          elementName: "${elementName}"
        ) {
          tagName
          className
          customElementExport
        }
      }
    `,
  });

  const data = result.data;

  context.body = `
    <h1>Element: ${packageName}/${elementName}</h1>
    <pre>${JSON.stringify(data)}</pre>
  `;
  context.type = 'html';
  context.status = 200;
});
