import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, existsSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { brotliCompressSync } from 'node:zlib';
import { chooseBase, rewriteVendorText, aliasHtml, prepare } from '../scripts/prepare-pages.mjs';

const base = '/nursememo-office/';
test('default project path is /nursememo-office/ and explicit domain root is /', () => {
  assert.equal(chooseBase({repo:'tkchan002/nursememo-office'}),base);
  assert.equal(chooseBase({repo:'tkchan002/nursememo-office',override:'/'}),'/');
  assert.equal(chooseBase({repo:'tkchan002/nursememo-office',override:'/nursememo-office/'}),base);
  assert.throws(()=>chooseBase({override:'a/../b'}),/Unsafe/);
});
test('upstream asset and clean route literals are rebased but external URL is unchanged', () => {
  const result = rewriteVendorText(`src="/sdkjs/main.js" href='/assets/main.css' u='/editor?new=docx' x='/history' css=url(/fonts/a.woff2) remote='https://foo.com/editor' w='x2t.wasm.br'`,base);
  assert.match(result,/src="\/nursememo-office\/sdkjs\/main\.js"/);
  assert.match(result,/href='\/nursememo-office\/assets\/main\.css'/);
  assert.match(result,/u='\/nursememo-office\/editor\.html\?new=docx'/);
  assert.match(result,/x='\/nursememo-office\/history\.html'/);
  assert.match(result,/url\(\/nursememo-office\/fonts\/a\.woff2\)/);
  assert.match(result,/https:\/\/foo\.com\/editor/);
  assert.match(result,/x2t\.wasm'/);
  assert.doesNotMatch(result,/\.wasm\.br/);
});
test('route aliases preserve both embed and saved query parameters',()=>{
  const alias = aliasHtml('../editor.html');
  assert.match(alias,/location\.search/);
  assert.match(alias,/location\.hash/);
  assert.match(alias,/\.\.\/editor\.html/);
});
test('synthetic full-site preparation produces real route aliases and uncompressed WASM',async()=>{
  const temp = mkdtempSync(join(tmpdir(),'nursememo-office-test-'));
  try {
    const src=join(temp,'upstream'); const dst=join(temp,'site');
    mkdirSync(join(src,'sdkjs/common/wasm/x2t'),{recursive:true});
    mkdirSync(join(src,'web-apps/apps/api/documents'),{recursive:true});
    mkdirSync(join(src,'web-apps/apps/documenteditor/main'),{recursive:true});
    writeFileSync(join(src,'web-apps/apps/documenteditor/main/index.html'), '<!doctype html><title>ONLYOFFICE editor</title>');
    writeFileSync(join(src,'web-apps/apps/api/documents/api.js'), 'function editorPath(path){ var index = \"/index.html\"; path += index; return path; }');
    mkdirSync(join(src,'assets'),{recursive:true});
    for(const name of ['index.html','editor.html','history.html']) writeFileSync(join(src,name),`<script type="module" src="/assets/editor.js"></script><a href="/editor?new=docx">Create</a>`);
    for(const name of ['LICENSE','NOTICE'])writeFileSync(join(src,name),'Upstream copyright notice');
    writeFileSync(join(src,'assets/editor.js'),`const src='/sdkjs/common/wasm/x2t/x2t.wasm.br'`);
    writeFileSync(join(src,'sdkjs/common/wasm/x2t/x2t.wasm.br'),brotliCompressSync(Buffer.from([0,97,115,109,1,0,0,0])));
    const output=await prepare({source:src,destination:dst,base,revision:'sha-test'});
    assert.equal(output.meta.siteBase,base);
    assert.ok(existsSync(join(dst,'editor/index.html')));
    assert.ok(existsSync(join(dst,'404.html')));
    assert.ok(existsSync(join(dst,'.nojekyll')));
    assert.equal(readFileSync(join(dst,'sdkjs/common/wasm/x2t/x2t.wasm')).toString('hex'),'0061736d01000000');
    assert.match(readFileSync(join(dst,'editor.html'),'utf8'),/\/nursememo-office\/assets\/editor.js/);
    assert.match(readFileSync(join(dst,'assets/editor.js'),'utf8'),/\/nursememo-office\/sdkjs\/common\/wasm\/x2t\/x2t.wasm'/);
    assert.ok(existsSync(join(dst,'fixtures/night-memo-normal-10.docx')));
    const apiText = readFileSync(join(dst,'web-apps/apps/api/documents/api.js'),'utf8');
    assert.match(apiText, /var index = \"\/index\.html\"/);
    assert.doesNotMatch(apiText, /\/nursememo-office\/index\.html/);
    const path = '/nursememo-office/web-apps/apps/documenteditor/main' + '/index.html';
    assert.ok(existsSync(join(dst,path.replace(base,''))), 'nested editor main/index.html must exist');
  } finally {rmSync(temp,{recursive:true,force:true});}
});

test('ONLYOFFICE SDK must keep internal /index.html path suffix unmodified', () => {
  const code = 'var index = \"/index.html\"; path += index;';
  const updated = rewriteVendorText(code, base);
  assert.equal(updated, code);
  assert.equal(
    '/nursememo-office/web-apps/apps/documenteditor/main' + '/index.html',
    '/nursememo-office/web-apps/apps/documenteditor/main/index.html'
  );
  assert.notEqual(
    '/nursememo-office/web-apps/apps/documenteditor/main' + '/nursememo-office/index.html',
    '/nursememo-office/web-apps/apps/documenteditor/main/index.html'
  );
});
