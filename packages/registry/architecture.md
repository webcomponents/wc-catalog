# Architecture

The @webcomponents/registry package is a headless database service with a GraphQL API for importing and querying web component data from npm that is stored in [Custom Element Manifests](https://github.com/webcomponents/custom-elements-manifest).

This registry acts an index of the data available on the npm registry and in the custom element manifest. It stores what is needed to efficiently perform queries, but does not store _all_ the detailed information in a package's package.json files or custom element manifests.

We need to store just enough data to answer questions such as:

- Which packages contain custom elements?
- What custom elements does a package contain?
- What is the path to the custom elements manifest?
- What data do we need to cache to perform queries and render summaries and collections of custom elements across packages?

## Runtime

The server is written in TypeScript to be run on modern Node (16+). It's written as a plain Node server, but intended to be run on a first target of Google Cloud Run, mainly due to the dependency on Google Cloud Firestore.

## GraphQL

The schema is defined in GraphQL SDL in ([@webcomponents/registry-api/src/lib/schema.graphql](../registry-api/src/lib/schema.graphql)). Using [GraphQL Code Generator](https://www.graphql-code-generator.com/) the schema is compiled into TypeScript. We generate interfaces for the GraphQL types and resolvers, and when operations are needed we will generate typed document nodes for them.

The code generator is run with `npm run build:graphql` (in `registry-api`). The generated files are output to `/out` and copied to their final destination with `npm run build:copy`. The `npm run build` command runs the TypeScript, GraphQL and copy scripts together.

The schema is combined with resolvers and made executable with the [`makeExecutableSchema` utility](https://www.graphql-tools.com/docs/generate-schema/) from [GraphQL Tools](https://www.graphql-tools.com/).

## Server

The server uses [Koa](https://koajs.com/) and [GraphQL Helix](https://github.com/contrawork/graphql-helix) to serve GraphQL requests and a [GraphiQL interface](https://github.com/graphql/graphiql/blob/main/packages/graphiql/README.md). The GraphQL endpoint and GraphiQL interface are available at [localhost:8080/graphql]().

GraphiQL is a great way to develop the server and try out queries.

## Firestore

[Google Cloud Firestore](https://cloud.google.com/firestore) is used to store data. It's easy-to-use, requires no configuration or maintence, authenticate Cloud Run services automatically, and is fast and has a good document model for our use case.

We use the Firebase emulators, which have a Firestore emulator, for local development.

The Firebase emulators can be started by running `npm run emulators:start`. Once running you can connected to the emulators by starting the server with `npm run dev`. The emulator starts a GUI for viewing and interacting with the database at [http://localhost:4000/]().

The server has not been deployed to Google Cloud Run yet, so local development is the only way to run the server right now.

## Schema

There are two schemas at work in this server: The GraphQL schema that defines the API and the implicit Firestore schema use to store data. They are closely related, but not identical.

Firestore is a document database modeled around collections. Every document belongs to a collection, and collections either belong to documents or are root collections. See the [Firestore Data model documentation](https://cloud.google.com/firestore/docs/data-model).

npm packages have data that is common to all versions and data specific to each version. We model this with a top-level packages collection which contains package documents. Packages then contain versions, and versions contain custom elements.

Firestore documents are often reference with `/` separated paths. Paths have an alternating `{collection}/{document_id}` pattern. The structure for our schema looks like `/packages/{package_name}/versions/{version}/customElements/{id}`.

Firestore enables searching nested collections with a single query, so we can search across all custom element documents even though they're nested in packages and versions. Because custom elements will likely be included in many versions of a package, we need to design the schema to indicate which are the current version for efficient queries.

## Search

TODO

## Data sources

We read from the npm registry for package and version data and from Unpkg for the contents of the custom elements manifest. Using the Unpkg CDN means we don't have to download and locally unpack TAR files from the npm registry.

## Importing lifecycle

The server is initially designed to import packages on-demand as information is requested about them. This works well for querying a specific package, though it's insufficient for querying across packages if important packages haven't already been imported yet.

Importing package data is a multi-step asynchronous process, and we can receive requests for package metadata during an import, so we track the state of a package in the database.

When a package is first imported it's document is created with an initial state of `INITIALIZING`. Concurrent requests should block on this state and wait for the package to be ready (not yet implemented). When package metadata has been downloaded and indexed the package document is updated to the `READY` state. If new version data is being downloaded the package will be in `UPDATING` state, which means that the current data is readable, but possibly stale. Requests can optionally block on the updating state. A few error states are tracked as well.

## Authentication & authorization

TODO: Not implemented

While the registry query API is public, we need authorization for database mutation / maintainence operations, or personalization, like starring and tagging packages/elements, removing packages, maintaing tags, etc.

The [Google Cloud Identity Platform](https://cloud.google.com/identity-platform) offers authentication as a service that works well with Cloud Run. App-specific permissions can be kept in a users collection.
