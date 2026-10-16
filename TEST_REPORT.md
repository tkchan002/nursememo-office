# Build and validation status

The included `node --test` suite verifies:

1. GitHub project Pages path selection, custom domain overrides, and unsafe base rejection.
2. Rewriting representative absolute asset URLs and clean `/editor` / `/history` routes while preserving external HTTP addresses.
3. Redirect aliases retain original query string and fragment.
4. Complete preparation of a synthetic upstream output, including real Brotli decompression of a tiny valid WASM buffer; generation of route aliases, 404 fallback, metadata, fixtures and .nojekyll.

The real upstream application is **not in the ZIP**. Its complete build, third-party assets, start-up performance, DOCX opening, PDF export, and nested SDK functionality have not been verified in this container. GitHub Actions compiles upstream; actual browser testing through `diagnostics.html` remains mandatory. Do not claim the self-hosted editor is ready merely because the packaging tests pass.


## 2026-10-16: Nested ONLYOFFICE index path regression

Reported failed inner iframe URL: `/nursememo-office/web-apps/apps/documenteditor/main/nursememo-office/index.html`.
Correct inner iframe URL: `/nursememo-office/web-apps/apps/documenteditor/main/index.html`.

The previous global rewrite changed the SDK's `var index = "/index.html"` suffix, producing the malformed route. The new script protects the suffix and includes build-time verification for the real internal editor HTML plus regression coverage.

**Local verification:** `npm test`: 5 tests passed, 0 failed; JS syntax checks passed. The upstream pinned engine was not built or tested live in this environment. A successful production deployment and visual DOCX/PDF test are still required.
