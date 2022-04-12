# webcomponents.org v2 Design

## Stack

* Server
  * Google Cloud Run
  * Node 17
  * Firestore
  * GraphQL via graphql-helix and graphql-tools
* Client
  * Web components with Lit
  * Apollo GraphQL Client
  * Playground Elements
* Static site generation
  * eleventy
* Schema
  * GraphQL SDL
  * graphql-codegen to generate TypeScript interfaces

## Catalog

### Indexing Packages

The catalog will initially be oriented around open-source packages published to npm. This is where the vast majority of elements are now published.

Cataloging closed-source elements is not a goal, as that would require indexing proprietary information about where to retrieve elements, their license and cost, etc.

Package sources other than npm, like GitHub packages or package-less distributions available via HTTP, may be included in the future. npm sources will be namespaced to prevserve the ability to add new sources.

On npm, we will require that packages have a `"customElements"` field in their `package.json`, and that it contains a valid custom elements manifest. This is so that we don't have to download package tarballs in order to detect if a package has a custom elements manifest, and so that we don't have to analyze source code to find custom element definitions.

#### Collections

Design systems and other groups of components benefit from first-class support in the catalog. Users may want to search for collections of components rather than individual components.

Collections don't neccesaarily correspond to packages. Many design systems publish each component as a separate npm package.

We would like a way for element authors to define their own collections controll exactly what elements are included. For this it would be ideal to have a centralized definition of a collection. Even though a collection is not published to npm, a collection definition could be published to a well-known URL, such as a file stored in GitHub. A custom element manifest can then include references to collection definitions so that while indexing element we can discover and index collections.

### Schema

The catalog server has two schemas in play: A GraphQL schema and an implcit Firestore schema (implicit, since Firestore is schemaless). We will try to keep these as close as possible. Some places where schemas differ:
* IDs: Firestore documents have immutable IDs that must be unique within their subcollection. This makes immutable package data like package name, or the version string for a specific version, well-suited to be document IDs. They will name to GraphQL fields like name or version.
* Collections: Firestore has both array-valued fields and subcollections. In GraphQL these are both described by a array-valued field, so Firestore subcollections will be mapped to GraphQL array fields.
* Dates vs Timestamps: Firestore has a Timestamp data type that will be converted to JS dates for GraphQL
* Maps: Firestore supports map-valued fields. GraphQL only supports list values, so we must convert maps to lists of key/value pairs.
* Denormalized fields in Firestore documents may or may not be present in the GraphQL schema.

Firestore stores data in documents and collections. Collections and documents have immutable IDs, and can be referenced by a path of alternating collection IDs and document IDs. This forms a hierarchy somewhat like a filesystem.

GraphQL schemas describe a graph of types, though query results are always a tree. GraphQL fields with a list type can represent Firestore collections. Since Firestore is schemaless we'll use the GraphQL schema types to describe Firestore documents.

#### Package, PackageVersion, and CustomElement

One root Firestore collection is `packages`, containing `Package` documents. A `Package` represents a single package name and all published versions of the package, under the subcollection `versions`. `PackageVersion` describes a single publisend version of a package. `PackageVersion` then contains a `customElements` collection of `CustomElement` documents.

We end up with a hierarchy like:

`Package` -> `versions` -> `PackageVersion` -> `customElements` -> `CustomElement`

Only one of the `PackageVersion` documents represents the latest versino of a package. Queries will generally be performed against the lastest versions. Other versions will be available for documentation.

#### Collections

Since ollections don't neccesaarily correspond to packages, we will have a separate root collection to represent collections.

A simple representation of a collection would be a list of elements that belong to it. For this we need a way to reference an element. Package and custom element name works if element names are unique per package, which they should be.

So one optiion for a collection schema is:

`Collection`:
 * name
 * description
 * homepage
 * elements
   * package
   * element

### Queries

#### Querying elements

Firestore does not allow queries across collections, but it does suppport "collection group" queries. So we can do a query on the `customElements` collection group, regardless of what document is the direct parent of the subcollcetion, like:

```ts
db.collectionGroup('customElements').get()
```

The problem with this query is that it will return elements from every version of a package, not just the latest. The latest version of a package is denoted with the dist-tag `"latest"` and that's part of the `Package` metadata. In order to query elements from the latest published version, we need to denormalize the dist tag to `PackageVersion` and `CustomElement`. Then we can perform a query like:

```ts
// TODO: change this to support a distTags array
db.collectionGroup('customElements').where('distTag', '==', 'latest').get();
```

Denormalizataion requrires that every time `distTags` is updated for a package that we also update every `PackageVersion` and `CustomElement` affected by that change. For instance, we may have to remove the `"latest"` dist tag from the previous version and add it to the new latest version.

This denormalization requirement extends to any field in `Package` or `PackageVersion` that we would like to use in a query on `CustomElement`. This in effect turns the `customElements` collection into a search index.

Possible denormalized query fields on `CustomElement`:
 * dist tags
 * package name
 * author
 * keywords
 * publish date
 * libraries used
 * npm downloads
 * collections

We can also denormalize fields that we want to read along with `CustomElement`, though this is less neccessary as once we have query results we can read a `CustomElement`'s containing `PackageVersion` easily with one extra read. This is better than reading a `PackageVersion` for potential matches only to throw them out when they fail a criteria.

#### Get all elements

Useful for catalog browsing and showing a set of components from a default query
on a page or inside an embedded catalog widget. This query may be ordered by some default ranking (popularity, quality, freshness, etc) 

#### Get elements by query

A filtered version of the above query, queryable on any of the fields in `CustomElement`

#### Get collections

#### Get authors

### Requirements for Inclusion in the catalog

We would like to ensure that elements in the catalog are actual custom elements, and easy to include in projects that use a variety of build systems. We can do analysis of projects as we index them to see if they meet certain requirements to facilitiate this.

* `"customElements"` `package.json` field pointing to a valid custom element manifest
* `"type": "module"` in `package.json`
* Element module paths in custom element manifest exist and include the declared export.

Additional, optional requirements based on static analysis:
* No non-browser-supported imports in custom element definition modules (so that elements don't require specific bundlers to use, etc).
* No unguarded use of non-Browser APIs like `process.env`, etc.
* All non-dev dependencies meet the same requirements.

Quality signals:
* Does not bundle common libraries (like `lit`)

## Abuse and moderation

The catalog has little to no direct user-generated content - there are no plans at the moment for features like comments. But the catalog does display user-generated content from the npm packages and custom element definitions themselves. This is an avenue for abuse. We should not rely on npm to remove abusive content. We need a way to remove packages from the index and accept abuse reports. Assuming that abuse via npm is very infrequent, we can likely handle reports via email.

## Privacy and PII

We would like to store as little personal information as possible and mostly have a read-only site. If we ever add personalization features, like starring elements, creating lists, user-submitted element rankings, etc., we'll need to allow accounts and log-in, likely via a third-party login provider.