import type { NextConfig } from 'next';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const projectRoot=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const config:NextConfig={poweredByHeader:false,turbopack:{root:projectRoot},outputFileTracingRoot:projectRoot};
export default config;
