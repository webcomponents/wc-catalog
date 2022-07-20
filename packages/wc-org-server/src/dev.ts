import {startDevServer} from '@web/dev-server';
import {fileURLToPath} from 'url';
import * as pathlib from 'path';
import Router from '@koa/router';
import { DefaultContext, DefaultState, Middleware } from 'koa';

import { catalogRouter } from './lib/catalog/catalog.js';

const dirname = pathlib.dirname(fileURLToPath(import.meta.url));
const repoRoot = pathlib.resolve(dirname, '..', '..');
const contentPackage = pathlib.resolve(repoRoot, 'packages', 'wc-org-content');
const siteRoot = pathlib.join(contentPackage, '_site');

const router = new Router();

router.use('/catalog', catalogRouter.routes());

startDevServer({
  config: {
    rootDir: siteRoot,
    plugins: [
    ],
    middleware: [
      router.routes() as Middleware<DefaultState, DefaultContext, any>
    ],
    watch: true,
    nodeResolve: true,
    preserveSymlinks: true,
  },
});
