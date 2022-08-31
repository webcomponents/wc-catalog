/**
 * @license
 * Copyright 2021 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */

import {
  CustomElementDeclaration,
  CustomElementExport,
  Declaration,
  Module,
  Package,
  Reference,
} from 'custom-elements-manifest/schema';

/**
 * Serializes a reference to a string, as used in the GraphQL API of the
 * custom elements catalog.
 *
 * TODO (justinfagnani): define format for package and module relative refs.
 * Take a Reference object instead of individual params.
 */
export const referenceString = (
  packageName: string,
  mod: Module,
  name: string
) => {
  return `${packageName}/${mod.path}#${name}`;
};

/**
 * Parses a serialized references string produced by referenceString*()
 */
export const parseReferenceString = (reference: string): Reference => {
  const hashIndex = reference.indexOf('#');
  if (hashIndex === -1) {
    throw new Error(`Invalid reference string ${reference}`);
  }
  const name = reference.substring(hashIndex + 1);
  const path = reference.substring(0, hashIndex);
  const pathSegments = path.split('/');
  const isScoped = pathSegments[0]?.startsWith('@');
  const packageName = isScoped
    ? pathSegments[0] + '/' + pathSegments[1]
    : pathSegments[0]!;
  const modulePath = path.substring(packageName.length);
  return {
    package: packageName,
    module: modulePath,
    name,
  };
};

export type CustomElementInfo = {
  package: Package;
  module: Module;
  export: CustomElementExport;
  declaration: CustomElementDeclaration;
};

export const getCustomElements = (
  pkg: Package,
  packageName: string,
  packageVersion: string
): Array<CustomElementInfo> => {
  const customElements: Array<CustomElementInfo> = [];
  for (const mod of pkg.modules) {
    // console.log('module', mod.path);
    if (mod.exports) {
      for (const e of mod.exports) {
        // console.log('  export', e.kind, e.name);
        if (e.kind === 'custom-element-definition') {
          // TODO: for large manifests we want to index ahead of time to
          // avoid polynomial lookups
          const decl = resolveReference(
            pkg,
            mod,
            e.declaration,
            packageName,
            packageVersion
          );
          // console.log('    declaration', decl);
          if (decl?.kind === 'class') {
            customElements.push({
              package: pkg,
              module: mod,
              export: e,
              declaration: decl,
            });
          }
        }
      }
    }
  }
  return customElements;
};

export const getModule = (pkg: Package, path: string) => {
  if (path.startsWith('/')) {
    path = path.substring(1);
  }
  for (const mod of pkg.modules) {
    // TODO: do we need to normalize paths?
    if (mod.path === path) {
      return mod;
    }
  }
  return undefined;
};

/**
 * Resolves a manifest reference from a local package and module into a
 * Declaration object.
 *
 * The current implementatino can only resolve within the local package. To
 * resolve to external packages would require some kind of package registry.
 *
 * The `packageName` and `packageVersion` parameters are required for good
 * error messages if the reference can't be resolved.
 */
export const resolveReference = (
  pkg: Package,
  localModule: Module,
  ref: Reference,
  packageName: string,
  packageVersion: string
): Declaration | undefined => {
  // Check for local reference
  if (ref.package !== undefined && ref.package !== packageName) {
    // We don't know how to resolve cross-package references yet
    console.warn("Can't resolve cross-package reference", ref);
    return undefined;
  }
  // Local reference
  const mod =
    ref.module === undefined ? localModule : getModule(pkg, ref.module);
  if (mod === undefined) {
    // Module not found
    const modules = pkg.modules.map((m) => m.path);
    console.warn(
      "Can't find module",
      packageName,
      packageVersion,
      ref.module,
      modules
    );
    return undefined;
  }
  if (mod.declarations) {
    for (const d of mod.declarations) {
      if (d.name === ref.name) {
        return d;
      }
    }
  }
  console.warn(
    "Can't find declaration",
    packageName,
    packageVersion,
    ref.module,
    ref.name
  );
  return undefined;
};
