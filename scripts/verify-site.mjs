import { existsSync, promises as fs } from 'node:fs';
import { join, resolve } from 'node:path';
import { chooseBase } from './prepare-pages.mjs';

const root = resolve(process.env.OFFICE_SITE_DIR || 'site');
const mustExist = [
  'index.html','editor.html','history.html','editor/index.html','history/index.html',
  '404.html','.nojekyll','sdkjs','web-apps','LICENSE','NOTICE',
  'sdkjs/common/wasm/x2t/x2t.wasm','office-build.json',
  'diagnostics.html','fixtures/night-memo-normal-10.docx','fixtures/night-memo-stress-72-38.docx',
  'web-apps/apps/api/documents/api.js','web-apps/apps/documenteditor/main/index.html',
];
for (const item of mustExist) if (!existsSync(join(root,item))) throw new Error(`Pages distribution missing ${item}`);
const meta = JSON.parse(await fs.readFile(join(root,'office-build.json'),'utf8'));
const expected = chooseBase({repo:process.env.GITHUB_REPOSITORY || 'tkchan002/nursememo-office',override:process.env.PAGES_BASE_PATH || ''});
if (meta.siteBase !== expected) throw new Error(`Incorrect base: ${meta.siteBase} vs ${expected}`);
if (meta.packagingFix !== 'onlyoffice-nested-index-path-v2') throw new Error('Old editor packaging version');
const sdkApi = await fs.readFile(join(root,'web-apps/apps/api/documents/api.js'),'utf8');
// The ONLYOFFICE DocEditor API appends '/index.html' to the full
// documenteditor/main path. Treating it as site-root is a hard failure.
if (sdkApi.includes(`${meta.siteBase}index.html`) && /path\s*\+=\s*index/.test(sdkApi)) {
  throw new Error('ONLYOFFICE internal /index.html path suffix was incorrectly rebased');
}
const entry = await fs.readFile(join(root,'editor.html'),'utf8');
if (!entry.includes('script') || !entry.includes('assets')) throw new Error('Upstream editor entry lacks expected script/assets');
const wasm = await fs.open(join(root,'sdkjs/common/wasm/x2t/x2t.wasm'),'r');
const header = Buffer.alloc(4);
await wasm.read(header,0,4,0);
await wasm.close();
if (header.toString('hex') !== '0061736d') throw new Error('Invalid raw WASM converter');
for (const item of ['editor/index.html','history/index.html']) {
  const body=await fs.readFile(join(root,item),'utf8');
  if(!body.includes('location.search') || !body.includes('location.replace')) throw new Error(`Bad route alias: ${item}`);
}
console.log(`Pages verification passed. Site base: ${meta.siteBase}; editor: ${meta.editorUrl}; upstream ${meta.sourceRevision}`);
