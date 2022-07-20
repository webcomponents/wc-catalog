import {startDevServer} from '@web/dev-server';
import {fileURLToPath} from 'url';
import * as pathlib from 'path';

const dirname = pathlib.dirname(fileURLToPath(import.meta.url));
const repoRoot = pathlib.resolve(dirname, '..', '..');
const contentPackage = pathlib.resolve(repoRoot, 'packages', 'wc-org-content');
const siteRoot = pathlib.join(contentPackage, '_site');

startDevServer({
  config: {
    rootDir: siteRoot,
    plugins: [
    ],
    middleware: [
    ],
    watch: true,
    nodeResolve: true,
    preserveSymlinks: true,
  },
});
