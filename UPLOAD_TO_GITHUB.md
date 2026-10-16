# Upload checklist: nursememo-office

- [ ] New repository **`tkchan002/nursememo-office`**, branch `main`.
- [ ] Extract ZIP and upload its **contents** into repository root; enable hidden files display so `.github` is included.
- [ ] `main` contains `.github/workflows/deploy-pages.yml`, `scripts/prepare-pages.mjs`, `scripts/verify-site.mjs`, `diagnostics.html`, `fixtures/`, `README.md`.
- [ ] In Settings > Pages, select GitHub Actions.
- [ ] Leave Pages custom domain blank for now.
- [ ] Leave Actions `PAGES_BASE_PATH` unset. (Do not copy the `/` setting used by `nursememo.app`.)
- [ ] Actions **Build and Deploy Nurse Memo Office** completes. It downloads a large upstream application; initial build may take time.
- [ ] Open https://tkchan002.github.io/nursememo-office/office-build.json — `siteBase` should be `/nursememo-office/`.
- [ ] Open https://tkchan002.github.io/nursememo-office/diagnostics.html — wait for **Editor connected**.
- [ ] Open sample DOCX, edit, save as DOCX and PDF, and test the 72-row stress fixture.
- [ ] Confirm standalone https://tkchan002.github.io/nursememo-office/editor.html?new=docx works.
- [ ] **Only after these tests:** change `editor/manager-ranuts.js` in Nurse Memo to point at the new origin.

**No Supabase changes required.** This package deploys only the office editor, not Nurse Memo's Patrol Night interface.
