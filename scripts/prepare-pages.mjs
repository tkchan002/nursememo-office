/** Publish ranuts/document as a complete static GitHub Pages project site.
 * Source/build stays upstream; this packaging step does not remove licence notices.
 * No server-side route fallback exists on Pages, so add physical route aliases.
 * GitHub Pages ignores Cloudflare's _headers; decode the x2t Brotli converter.
 */
import { existsSync, promises as fs } from 'node:fs';
import { basename, dirname, extname, join, relative, resolve } from 'node:path';
import { brotliDecompressSync } from 'node:zlib';
import { fileURLToPath } from 'node:url';

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
export const DEFAULT_REPO = 'nursememo-office';
export function chooseBase({ repo = '', override = '' } = {}) {
  const repoName = repo.split('/')[1] || DEFAULT_REPO;
  const raw = override.trim();
  const base = raw === '/' ? '/' : raw ? `/${raw.replace(/^\/+|\/+$/g, '')}/` : `/${repoName}/`;
  if (!/^\/(?:[A-Za-z0-9_.~-]+\/)*$/.test(base) || base.split('/').some(s => s === '.' || s === '..')) throw new Error(`Unsafe Pages base: ${base}`);
  return base;
}

// Only relative-to-site root paths are patched, not protocol URLs or resources
// already prefixed by the site base. Conservative allow-list for vendor assets.
const roots = [
  'sdkjs','web-apps','fonts','ran-fonts','ranui-iife','assets',
  'img','images','icons','models','wasm','content','packages','plugins',
  'favicon.ico','favicon.svg','sw.js','manifest.json',
  'home.css','landing.css','lang-switch.js','sw-register.js','open-local.js',
  'landing-prefetch.js','theme-presentation.js','onlyoffice-v7-iframe-patch.js',
  'ran-tokens.css','index.html','editor.html','history.html','embed-demo.html',
  'help','changelog','embed-demo.html',
];
const rootsPattern = roots.map(s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|');
const quotedRoot = new RegExp(`(["'\x60(=\\s])\\/(${rootsPattern})(?=\\/|["'\x60?#\\s)]|$)`, 'g');
const cleanRoutes = new Map([['editor','editor.html'],['history','history.html']]);
const quotedRoute = /(["'`(=\s])\/(editor|history)(?=["'`?#\s)]|$)/g;
const cssRoot = new RegExp(`(url\\(\\s*['"]?)\\/(${rootsPattern})(?=\\/|['"?)]|$)`, 'g');
const textExtensions = new Set(['.html','.js','.mjs','.css','.json','.xml','.svg','.txt','.webmanifest','.ts','.map']);

export function rewriteVendorText(content, base) {
  let result = content
    .replace(quotedRoot, (_match, prefix, name) => `${prefix}${base}${name}`)
    .replace(quotedRoute, (_match, prefix, route) => `${prefix}${base}${cleanRoutes.get(route)}`)
    .replace(cssRoot, (_match, prefix, name) => `${prefix}${base}${name}`);
  // Vite-hashed global token CSS is a real upstream root-absolute asset.
  result = result.replace(/(["'`(=\s])\/ran-tokens\.([a-f0-9]+)\.css/g,
    (_match, prefix, hash) => `${prefix}${base}ran-tokens.${hash}.css`);
  // The browser must receive raw wasm bytes on GitHub Pages (no Brotli header).
  return result.replaceAll('x2t.wasm.br', 'x2t.wasm');
}

export function aliasHtml(relativeTarget) {
  const json = JSON.stringify(relativeTarget);
  return `<!doctype html>\n<html lang="en"><head><meta charset="utf-8">\n<title>Opening document editor</title>\n<script>\n  // Keep query and fragment (embedOrigin, new, saved, etc).\n  location.replace(new URL(${json} + location.search + location.hash, location.href).href);\n</script></head><body><p>Opening document editor… <a href="${relativeTarget}">Continue</a></p></body></html>\n`;
}

async function walk(dir, visitor) {
  for (const entry of await fs.readdir(dir, { withFileTypes: true })) {
    const file = join(dir, entry.name);
    if (entry.isDirectory()) await walk(file, visitor);
    else if (entry.isFile()) await visitor(file, entry.name);
  }
}

export async function prepare({
  source = resolve(projectRoot, '_vendor/ranuts-document/dist'),
  destination = resolve(projectRoot, 'site'),
  base = chooseBase({repo: process.env.GITHUB_REPOSITORY || 'tkchan002/nursememo-office', override: process.env.PAGES_BASE_PATH || ''}),
  revision = process.env.RANUTS_REVISION || 'local-test',
} = {}) {
  source = resolve(source);
  destination = resolve(destination);
  if (source === destination || destination.startsWith(`${source}/`)) throw new Error('Destination overlaps source');
  for (const required of ['index.html','editor.html','history.html','sdkjs','web-apps']) {
    if (!existsSync(join(source, required))) throw new Error(`Missing upstream distribution asset: ${required}`);
  }
  if (!existsSync(join(source, 'LICENSE')) || !existsSync(join(source, 'NOTICE'))) {
    throw new Error('Upstream licensing files are missing from its distribution.');
  }
  await fs.rm(destination, {recursive: true,force: true});
  await fs.cp(source, destination, {recursive: true});
  let changed = 0;
  let scanned = 0;
  await walk(destination, async (file, name) => {
    if (!textExtensions.has(extname(name)) || name === 'LICENSE' || name === 'NOTICE') return;
    const old = await fs.readFile(file, 'utf8');
    const updated = rewriteVendorText(old, base);
    if (old !== updated) { await fs.writeFile(file, updated); changed++; }
    scanned++;
  });
  const x2t = join(destination, 'sdkjs/common/wasm/x2t');
  const packed = join(x2t,'x2t.wasm.br');
  const raw = join(x2t,'x2t.wasm');
  if (existsSync(packed)) {
    const data = brotliDecompressSync(await fs.readFile(packed));
    if (data.subarray(0, 4).toString('hex') !== '0061736d') throw new Error('Bad decompressed WASM header');
    await fs.writeFile(raw,data);
    await fs.rm(packed);
  }
  if (!existsSync(raw)) throw new Error('Missing raw x2t.wasm converter. Cannot deploy compressed converter without response headers.');
  const magic = (await fs.readFile(raw)).subarray(0,4).toString('hex');
  if (magic !== '0061736d') throw new Error('Invalid raw WebAssembly converter');

  // /editor, /editor/, /history, /history/ must work on GitHub Pages.
  // A directory route provides a 301/302 slash redirect, then a same-origin
  // browser redirect to the canonical physical .html document.
  for (const route of ['editor','history']) {
    await fs.mkdir(join(destination,route),{recursive:true});
    await fs.writeFile(join(destination,route,'index.html'),aliasHtml(`../${route}.html`));
  }
  const recovery404 = `<!doctype html><html lang="en"><head><meta charset="utf-8"><title>Document editor route</title><script>\n`+
    `const base=${JSON.stringify(base)};const path=location.pathname;const tail=path.startsWith(base)?path.slice(base.length):'';\n`+
    `if (tail==='editor'||tail==='editor/'||tail==='history'||tail==='history/') {\n`+
    ` location.replace(base+(tail.startsWith('editor')?'editor.html':'history.html')+location.search+location.hash);\n`+
    `} else { document.addEventListener('DOMContentLoaded',()=>{ document.getElementById('error').hidden=false;}); }\n`+
    `</script></head><body><p id="error" hidden>File not found. <a href="${base}">Return to document editor</a>.</p></body></html>\n`;
  await fs.writeFile(join(destination,'404.html'),recovery404);

  // Standalone diagnostics and sample DOCX fixtures from this repository.
  for (const local of ['diagnostics.html']) await fs.copyFile(join(projectRoot,local),join(destination,local));
  await fs.mkdir(join(destination,'fixtures'),{recursive:true});
  for (const fixture of ['night-memo-normal-10.docx','night-memo-stress-72-38.docx']) {
    await fs.copyFile(join(projectRoot,'fixtures',fixture),join(destination,'fixtures',fixture));
  }
  await fs.writeFile(join(destination,'.nojekyll'),'');
  // Cache-busting manifests: proof of which repo/commit/base are actually live.
  const meta = {siteBase:base, editorUrl:`${base}editor.html`,embedUrl:`${base}editor.html?embed=1`,
    repository:process.env.GITHUB_REPOSITORY || 'tkchan002/nursememo-office',
    sourceRepository:'https://github.com/ranuts/document',sourceRevision:revision,
    licence:'AGPL-3.0',sourceRequired:true,
    note:'Independent GitHub Pages office editor; not the Nurse Memo app.'};
  await fs.writeFile(join(destination,'office-build.json'),JSON.stringify(meta,null,2)+'\n');
  let siteBytes = 0; let siteFiles = 0;
  await walk(destination, async f => {siteBytes += (await fs.stat(f)).size;siteFiles++;});
  if(siteBytes > 900*1024*1024)throw new Error(`Office Pages site is ${Math.ceil(siteBytes/1024/1024)} MiB (>900 MiB safety bound).`);
  console.log(`Prepared ${relative(projectRoot,destination)}: ${(siteBytes/1024/1024).toFixed(1)} MiB, ${siteFiles} files; ${changed}/${scanned} text assets rebased to ${base}`);
  return {meta,siteBytes,siteFiles,changed};
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  await prepare();
}
