# webcomponents.org monorepo

A new implementation of the webcompoents.org site

This repo contains several packages:

- `@webcomponents/registry`: A data-only backend that indexes npm packages and provides a GraphQL API into the database
- `@webcomponents/registry-api`: GraphQL schemas and TypeScript interfaces for the registry API.
- `@webcomponents/site-server`: A frontend server that serves the user-facing webcompoents.org site
- `@webcomponents/site-content`: An HTML client served by the frontend server
- `@webcomponents/custom-element-manifest-tools`: Tools for working with Custom Element Manifests

## Quick Start

1. Install dependencies:
    ```bash
    npm ci
    ```
2. Start the registry server:
    ```bash
    cd packages/registry
    npm run emulators:start & npm run dev
    ```
    This starts a GraphQL service. The web server only serves a simple welcome page and an interactive GraphiQL editor at `/graphql`.
3. Start the site server:
    ```bash
    cd packages/site-server
    npm run dev
    ```
