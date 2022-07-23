/**
 * @license
 * Copyright 2022 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */

import type {Package} from 'custom-elements-manifest/schema';
import {
  getModule,
  parseReferenceString,
} from 'wc-org-shared/lib/manifest/utils.js';
import {resolveReference} from 'wc-org-shared/lib/manifest/utils.js';

export const renderElement = ({
  packageName,
  elementName,
  declarationReference,
  customElementExport,
  manifest,
}: {
  packageName: string;
  elementName: string;
  declarationReference: string;
  customElementExport: string;
  manifest: Package;
}): string => {
  const declarationRef = parseReferenceString(declarationReference);
  console.log({declarationRef});
  const module = getModule(manifest, declarationRef.module!);
  console.log('declaration', declarationReference);
  console.log('module', module);
  console.log('customElementExport', customElementExport);

  if (module === undefined) {
    return `<h1>Error</h1>`;
  }

  const declaration = resolveReference(
    manifest,
    module,
    declarationRef,
    packageName,
    ''
  );
  console.log('elementDeclaration', declaration);

  if (declaration === undefined || declaration.kind !== 'class') {
    return `<h1>Error</h1>`;
  }

  return `
    <h1>${packageName}/${elementName}<h1>
    ${declaration.description}
    <h2>Usage</h2>
    <pre><code>
    <!-- TODO: this is wrong. We need the jsExport in the db -->
    import {${declaration.name}} from '${declarationRef.package}/${
    declarationRef.module
  }';
    </code></pre>
    <h2>Fields</h2>
    <ul>
    ${declaration.members
      ?.filter((m) => m.kind === 'field')
      .map(
        (m) => `
      <li>${m.name}: ${m.description}</li>
    `
      )
      .join('\n')}
    </ul>
    <h2>Methods</h2>
    <ul>
    ${declaration.members
      ?.filter((m) => m.kind === 'method')
      .map(
        (m) => `
      <li>${m.name}: ${m.description}</li>
    `
      )
      .join('\n')}
    </ul>
  `;
};
