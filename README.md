# Nurse Memo Office — Independent GitHub Pages editor

This is a **standalone GitHub Pages deployment wrapper** for [ranuts/document](https://github.com/ranuts/document), for testing the DOCX editor used by Nurse Memo's **Patrol Night** page.

Expected public URL after deploying the new `tkchan002/nursememo-office` GitHub repository:

- Landing page: https://tkchan002.github.io/nursememo-office/
- Standalone Word editor: https://tkchan002.github.io/nursememo-office/editor.html?new=docx
- Independent DOCX/PDF test: https://tkchan002.github.io/nursememo-office/diagnostics.html
- Deployment metadata: https://tkchan002.github.io/nursememo-office/office-build.json
- iframe editor URL for *future* Patrol Night integration: https://tkchan002.github.io/nursememo-office/editor.html

**Do not point Nurse Memo at this editor until the standalone tests work.** This project does not change your current Nurse Memo repository, `manager.html`, Supabase database or DOCX history.

## Upload with GitHub's web interface

1. Create a new public GitHub repository named exactly **`nursememo-office`**, with its default branch named `main`.
2. Extract this ZIP. Upload the **contents** (not the containing folder) to that repository root. Preserve `.github/workflows/deploy-pages.yml` and `scripts/`.
3. Under repository **Settings → Pages → Build and deployment**, set **Source = GitHub Actions**.
4. Do not configure a custom domain for this test repository. Do not set `PAGES_BASE_PATH`: the default is `/nursememo-office/`.
5. Commit to `main`. Open **Actions → Build and Deploy Nurse Memo Office**. A cold build of the full office suite may take significant time.
6. After success, check `office-build.json` and `diagnostics.html` at the addresses above. Use the diagnostics page to open normal and stress-test DOCX, edit and export DOCX/PDF.

### IMPORTANT: this ZIP does not include hundreds of MB of upstream editor assets

The ZIP contains the complete **hosting/deployment repository**: workflow, packaging scripts, sample DOCX documents, diagnostics and tests. During GitHub Actions, it checks out a version-pinned ranuts/document source tree, installs its locked dependencies, builds the upstream office editor, rewrites URLs for a GitHub Pages project site, and deploys the resulting static files.

The default upstream commit is **`beb7e2fd6c2eada4c4ff21e94ac37d5c39a79fc0`**, matching the revision previously deployed in the Nurse Memo testing branch. To switch upstream versions later, set the Actions **variable** `RANUTS_REF` to a specific tested commit. Do not track moving `main` without testing because upstream builds and APIs may change.

## How this addresses the previous 404 errors

The main app ran from `https://nursememo.app/` but the office editor was deployed as a nested `/office/` project, producing inconsistent root URLs and internal `/editor` routes.

This repository instead deploys the editor *as its own Pages project*. Build-time adjustments:

1. Uses `/nursememo-office/` as its static asset base.
2. Publishes canonical physical files `editor.html` and `history.html`.
3. Adds physical directory aliases `editor/index.html` and `history/index.html` that preserve URL queries (including `embed`, `embedOrigin`, `new`, and `saved`).
4. Adds a targeted GitHub Pages `404.html` route recovery for editor/history.
5. Decodes `sdkjs/common/wasm/x2t/x2t.wasm.br` to real WebAssembly bytes and updates references to `x2t.wasm` because GitHub Pages cannot honour the upstream `_headers` Brotli encoding rule.
6. Publishes `.nojekyll` to retain underscore-prefixed assets.
7. Keeps the upstream `LICENSE` and `NOTICE` in the public artifact.

It does **not** disable the office engine, remove SDK files or simulate a successful document open. The packaging checks prove file layout, not that the real browser engine works; test the live output before integrating.

## Independent testing

At `/diagnostics.html`:

1. Wait for "Editor connected"; on a fresh browser, loading may take longer.
2. Select **Open normal Night Memo** (10 ward rows) and edit a cell.
3. Press **Save DOCX**, reopen the downloaded document, and confirm the edit persisted.
4. Press **Export PDF** and inspect text selectability, table layout and A4 landscape.
5. Select **Open 72-row stress memo**, modify a table row and export another PDF.
6. Test the standalone URL `editor.html?new=docx` (no iframe) separately.

If something fails, send the **exact URL**, the status message from the diagnostics page, and the failed step or browser console message. Firefox on macOS can open Developer Tools with **Option + Command + I**; Chrome is not required.

## Future integration in Nurse Memo (NOT included here)

Once the stand-alone editor passes, the Nurse Memo source file `editor/manager-ranuts.js` can replace its self-hosted `EDITOR_URL` with the fixed cross-origin URL:

```js
export const EDITOR_URL = 'https://tkchan002.github.io/nursememo-office/editor.html';
export const EDITOR_ORIGIN = new URL(EDITOR_URL).origin;
```

Its iframe URL must include `embed=1` and `embedOrigin=https%3A%2F%2Fnursememo.app` when used from `https://nursememo.app`. Its event listener must verify both `event.origin` and `event.source`, and `postMessage` must target `https://tkchan002.github.io`. The current adapter already performs the general checks but **the URL change should only be made after the new site actually works**. Preloading and the Patrol Night loading notice belong in Nurse Memo, not in this standalone repo.

If you later configure `office.nursememo.app` as a custom domain for this separate repository, set `PAGES_BASE_PATH` to `/`, redeploy, and then update the Nurse Memo `EDITOR_URL` / origin to the new domain. The same source repository supports either deployment mode.

## Licences and operating limits

ranuts/document is AGPL-3.0 and includes modified ONLYOFFICE components. The workflow builds the upstream source and preserves its notices. Distribution and use must comply with applicable licensing, source-offer and attribution requirements.

This is an experimental public editor host without Nurse Memo authentication; use **fictional test documents only**. For live patient data, security/privacy/legal review and approved hosting are required. GitHub Pages has site-size and traffic limits. Build preparation stops if the unpacked editor approaches 900 MiB.

## Local verification (optional)

No local npm or Node installation is required if you use GitHub Actions. Developers can run `npm test` locally (uses built-in Node test runner). This validates static packaging and simulated WebAssembly conversion. Full upstream compilation and real office UI interaction can only be verified after the GitHub Actions build, since the upstream binaries are not included in this ZIP.
