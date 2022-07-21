/**
 * @license
 * Copyright 2021 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */

 import {
  CustomElementDeclaration,
  CustomElementExport,
  Module,
  Package,
  Reference,
} from 'custom-elements-manifest/schema';

export * from 'custom-elements-manifest/schema';

export type CustomElementInfo = {
  package: Package;
  module: Module;
  export: CustomElementExport;
  declaration: CustomElementDeclaration;
};

export const getCustomElements = (pkg: Package): Array<CustomElementInfo> => {
  const customElements: Array<CustomElementInfo> = [];
  for (const mod of pkg.modules) {
    // console.log('module', mod.path);
    if (mod.exports) {
      for (const e of mod.exports) {
        // console.log('  export', e.kind, e.name);
        if (e.kind === 'custom-element-definition') {
          // TODO: for large manifests we want to index ahead of time to
          // avoid polynomial lookups
          const decl = resolveReference(pkg, mod, e.declaration);
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

export const getModule = (pkg: Package, packageName: string, path: string) => {
  if (path.startsWith('/') || path.startsWith('.')) {
    // package local path
    throw new Error('Not implemented');
  } else {
    const pathSegments = path!.split('/');
    const isScoped = pathSegments[0]?.startsWith('@');
    const modulePackageName = isScoped
      ? pathSegments[0] + '/' + pathSegments[1]
      : pathSegments[0]!;
    const modulePath = path.substring(modulePackageName.length);

    if (modulePackageName !== packageName) {
      throw new Error(`Incorrect package: expected ${packageName}, got ${modulePath}`);
    }

    for (const mod of pkg.modules) {
      // TODO: do we need to normalize paths?
      if (mod.path === modulePath) {
        return mod;
      }
    }
  }
  return undefined;
};

export const resolveReference = (
  pkg: Package,
  localModule: Module,
  ref: Reference
) => {
  // local reference
  if (ref.package !== undefined) {
    console.warn("Can't resolve cross-package reference", ref);
    // We don't know how to resolve cross-package references yet
    return undefined;
  }
  let mod: Module | undefined = undefined;
  if (ref.module === undefined) {
    // Local reference
    mod = localModule;
  } else {
    for (const m of pkg.modules) {
      if (m.path === ref.module) {
        mod = m;
        break;
      }
    }
    if (mod === undefined) {
      // Module not found
      const modules = pkg.modules.map((m) => m.path);
      console.warn("Can't find module", ref.module, modules);
      return undefined;
    }
  }
  if (mod.declarations) {
    for (const d of mod.declarations) {
      if (d.name === ref.name) {
        return d;
      }
    }
  }
  console.warn("Can't find declaration", ref.name, localModule.path);
  return undefined;
};
