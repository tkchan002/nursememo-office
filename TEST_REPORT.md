# Build and validation status

The included `node --test` suite verifies:

1. GitHub project Pages path selection, custom domain overrides, and unsafe base rejection.
2. Rewriting representative absolute asset URLs and clean `/editor` / `/history` routes while preserving external HTTP addresses.
3. Redirect aliases retain original query string and fragment.
4. Complete preparation of a synthetic upstream output, including real Brotli decompression of a tiny valid WASM buffer; generation of route aliases, 404 fallback, metadata, fixtures and .nojekyll.

The real upstream application is **not in the ZIP**. Its complete build, third-party assets, start-up performance, DOCX opening, PDF export, and nested SDK functionality have not been verified in this container. GitHub Actions compiles upstream; actual browser testing through `diagnostics.html` remains mandatory. Do not claim the self-hosted editor is ready merely because the packaging tests pass.
