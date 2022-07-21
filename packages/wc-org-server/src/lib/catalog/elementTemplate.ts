import type {Package} from 'custom-elements-manifest/schema';
// import {resolveReference, getModule} from 'wc-org-shared/lib/manifest/utils.js';

export const renderElement = ({
  packageName,
  elementName,
  // declaration,
  // customElementExport,
  // jsExport,
  manifest,
}: {
  packageName: string;
  elementName: string;
  // declaration: string,
  // customElementExport: string;
  // jsExport: string;
  manifest: Package;
}): string => {
  // const module = getModule(manifest, declaration);
  // const elementDeclaration = resolveReference(manifest, module);

  console.log(manifest !== null);

  return `
    <h1>${packageName}/${elementName}<h1>
  `;
};
