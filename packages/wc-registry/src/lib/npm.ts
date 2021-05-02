/**
 * @license
 * Copyright 2021 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */

import {readFile, mkdir} from 'fs/promises';
import fetch from 'node-fetch';
import npmFetch from 'npm-registry-fetch';
import {promisify} from 'util';
import path from 'path';
import streamLib from 'stream';
import tar from 'tar';

// const readFile = promisify(fs.readFile);
// const mkdir = promisify(fs.mkdir);
const finished = promisify(streamLib.finished);

export interface Package {
  name: string;
  'dist-tags': {[tag: string]: string};
  versions: {[tag: string]: Version};
}

export interface Version {
  description: string;
  dist: Dist;
  type: 'module' | 'commonjs';
  homepage: string;
  repository: {
    type: 'git' | 'svn';
    url: string;
  },
}

export interface Dist {
  tarball: string;
}

export const getPackage = (packageName: string) => 
    npmFetch.json(`/${packageName}`) as Promise<unknown> as Promise<Package>;

export const downloadPackage = async (packageData: Package, version: string, dir: string) => {
  const packageName = packageData.name;
  const versionData = packageData.versions[version]!;
  const tarballUrl = versionData.dist.tarball;

  // Fetch the tarball and pipe the response stream through `tar` to unpack
  // it. It'd nice to do this in-memory.
  const response = fetch(tarballUrl);
  const destination = path.join(dir, packageName, `@${version}`);
  await mkdir(destination, {recursive: true});
  const s = (await response).body.pipe(tar.extract({
    cwd: destination,
  }));
  await finished(s);
  return destination;
};

export const getCustomElementsJson = async (dir: string) => {
  const customElementsJsonPath = path.join(dir, 'package/custom-elements.json');
  try {
    const customElementsJsonFile = await readFile(customElementsJsonPath, 'utf-8')
    const customElementsJson = JSON.parse(customElementsJsonFile);
    return customElementsJson;
  } catch (e) {
    return undefined;
  }
};
