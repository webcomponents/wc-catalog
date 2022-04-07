/**
 * @license
 * Copyright 2021 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */

/**
 * @overview
 * This module contains utilities for interacting with the npm registry and
 * downloading custom element manifests from it.
 */
import {readFile} from 'fs/promises';
import fetch from 'node-fetch';
import npmFetch from 'npm-registry-fetch';
// import {promisify} from 'util';
import path from 'path';
// import streamLib from 'stream';
// import tar from 'tar';

import {Package as CustomElementsManifest} from 'custom-elements-manifest/schema';

// const finished = promisify(streamLib.finished);

// TODO: can we get this interface from somewhere canonical?
export interface Package {
  name: string;
  description: string;
  'dist-tags': {[tag: string]: string};
  versions: {[tag: string]: Version};
  time: {
    modified: string;
    created: string;
    [version: string]: string;
  };
}

export interface Version {
  name: string;
  version: string;
  description: string;
  dist: Dist;
  type?: 'module' | 'commonjs';
  main: string;
  module?: string;

  author?: {name: string};
  homepage?: string;

  repository: {
    type: 'git' | 'svn';
    url: string;
  };

  customElements?: string;
}

export interface Dist {
  tarball: string;
}

export const fetchPackage = (packageName: string) =>
  npmFetch.json(`/${packageName}`) as Promise<unknown> as Promise<Package>;

// export const downloadPackage = async (
//   packageData: Package,
//   version: string,
//   dir: string
// ) => {
//   const packageName = packageData.name;
//   const versionData = packageData.versions[version]!;
//   const tarballUrl = versionData.dist.tarball;

//   // Fetch the tarball and pipe the response stream through `tar` to unpack
//   // it. It'd nice to do this in-memory.
//   const response = await fetch(tarballUrl);
//   const destination = path.join(dir, packageName, `@${version}`);
//   await mkdir(destination, {recursive: true});
//   const s = response.body.pipe(
//     tar.extract({
//       cwd: destination,
//     })
//   );
//   await finished(s);
//   return destination;
// };

export const getCustomElementsJson = async (dir: string) => {
  const customElementsJsonPath = path.join(dir, 'package/custom-elements.json');
  try {
    const customElementsJsonFile = await readFile(
      customElementsJsonPath,
      'utf-8'
    );
    const customElementsJson = JSON.parse(customElementsJsonFile);
    return customElementsJson;
  } catch (e) {
    return undefined;
  }
};

export const fetchCustomElementsManifest = async (
  packageName: string,
  version: string,
  customElements: string
): Promise<CustomElementsManifest | undefined> => {
  const unpkgUrl = `https://unpkg.com/${packageName}@${version}/${customElements}`;
  try {
    const response = await fetch(unpkgUrl);
    // await here so any parse error is caught
    const data = await response.json();
    return data;
  } catch (_e) {
    return undefined;
  }
};
