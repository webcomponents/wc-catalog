import {CustomElementDeclaration, CustomElementExport, Module, Package, Reference} from 'custom-elements-manifest/schema';

export type CustomElementInfo = {
  package: Package,
  module: Module,
  export: CustomElementExport,
  declaration: CustomElementDeclaration,
};

export const getCustomElements = (pkg: Package): Array<CustomElementInfo> => {
  const customElements: Array<CustomElementInfo> = [];
  for (const mod of pkg.modules) {
    console.log('module', mod.path);
    if (mod.exports) {
      for (const e of mod.exports) {
        console.log('  export', e.kind, e.name);
        if (e.kind === 'custom-element-definition') {
          // TODO: for large manifests we want to index ahead of time to
          // avoid polynomial lookups
          const decl = resolveReference(pkg, mod, e.declaration);
          console.log('    declaration', decl);
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

export const resolveReference = (pkg: Package, localModule: Module, ref: Reference) => {
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
  console.warn("Can't find declaration", ref.name);
  return undefined;
};
