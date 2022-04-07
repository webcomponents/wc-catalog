# `wc-registry`

This package contains the server that runs the component registry API and database.

## Architecture

The registry is a Google Cloud Run application running Node. This means that it's basically a plain Node server applications that deployed's in a Docker container that responds to HTTP port 80.

Data is stored in Firestore, which is a document database well-suited to the document-type structure that we'll use to describe web component packages.

The API endpoint is GraphQL.
