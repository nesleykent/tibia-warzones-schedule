# Repository Improvement Roadmap

Audit basis: current repository source, workflows, tests, and verified commands as of 2026-06-04.

## Immediate

### 1. Add pre-merge CI for pull requests

- Problem: GitHub Actions does not run on `pull_request`.
- Impact: Regressions can merge without repository-owned CI feedback.
- Risk: Medium to high; current quality control depends on maintainer discipline.
- Proposed solution: Add a PR validation workflow that runs the baseline checks already used in deploy and refresh workflows.
- Estimated effort: Low
- Evidence: `.github/workflows/` contains `push`, `workflow_dispatch`, `schedule`, and `issues` triggers only.

### 2. Correct stale operational documentation

- Problem: existing docs still describe behaviors that current code no longer has.
- Impact: Humans and agents can follow invalid maintenance guidance.
- Risk: High; docs currently conflict with admin scope, `update_data.py` failure behavior, and market-world discovery rules.
- Proposed solution: Rewrite or deprecate stale sections in `README.md`, `docs/architecture.md`, `docs/operational-runbook.md`, and `docs/repository-audit.md`.
- Estimated effort: Low
- Evidence: `README.md:91`; `docs/operational-runbook.md:64`, `194-195`, `257`, `263-267`; `docs/architecture.md:188`; current code in `assets/admin.js`, `scripts/update_data.py`, and `scripts/common.py`.

### 3. Make environment requirements explicit for `remove_outliers.py`

- Problem: the documented `python3` workflow does not run `scripts/remove_outliers.py` without `numpy`.
- Impact: Maintainers can misdiagnose the failure as a code issue instead of an environment issue.
- Risk: Low, but it weakens trust in the command surface.
- Proposed solution: separate stdlib-only commands from `numpy`-dependent commands in docs and optionally add a guard message before import-heavy execution.
- Estimated effort: Low
- Evidence: `requirements.txt`; `scripts/remove_outliers.py:9`; `python3 scripts/remove_outliers.py` failed; `.venv/bin/python scripts/remove_outliers.py` passed.

### 4. Remove the hardcoded TibiaMarket bearer token

- Problem: `scripts/fetch_item_history.py` embeds a bearer-token fallback in source.
- Impact: Credential exposure and brittle operational rotation.
- Risk: High
- Proposed solution: require `TIBIA_MARKET_TOKEN` or `--token`, fail fast when absent, and rotate the existing token.
- Estimated effort: Low
- Evidence: `scripts/fetch_item_history.py:37-41`, `86-89`, `501`.

### 5. Clarify the production status of `admin.html`

- Problem: the maintainer route is deployed publicly but not linked from the public nav.
- Impact: unclear security posture and governance for a browser token workflow.
- Risk: High
- Proposed solution: either remove `admin.html` from the Pages artifact or make its intended access model explicit and safer.
- Estimated effort: Low to medium
- Evidence: `.github/workflows/deploy-pages.yml:63-67`; public HTML navs; `admin.html`.

## Near Term

### 6. Add a publish-time data boundary

- Problem: the deploy workflow copies the full `data/` tree, including `119M` of market history.
- Impact: unnecessary production payload size and weak separation between source inputs and public runtime data.
- Risk: Medium
- Proposed solution: generate a minimal public dataset for Pages rather than copying raw refresh inputs wholesale.
- Estimated effort: Medium
- Evidence: `.github/workflows/deploy-pages.yml:63-67`; `du -sh data/market`.

### 7. Consolidate shared frontend logic

- Progress: filter-pill markup, escaping, visual-state classes, and semantic
  pressed state were consolidated in `assets/shared.js` on 2026-07-16.
- Progress: document-language synchronization is shared, and English-only
  pages no longer expose nonfunctional locale controls as of 2026-07-16.
- Progress: the shared language menu now owns keyboard navigation, focus
  restoration, and radio-selection semantics as of 2026-07-16.
- Progress: responsive topbar navigation now preserves full route labels and
  centers the active route through shared initialization as of 2026-07-16.
- Progress: home and world dialogs now share one tested focus-boundary helper,
  while each controller owns consistent trigger restoration and cleanup as of
  2026-07-16.
- Problem: localization, filter persistence, and route-controller structure are duplicated across page scripts.
- Impact: behavior drift, harder fixes, and repetitive bugs.
- Risk: Medium
- Proposed solution: move shared UI/state primitives into `assets/shared.js` or a small shared browser module pattern.
- Estimated effort: Medium
- Evidence: `assets/app.js`, `assets/ranking.js`, `assets/open-houses.js`, `assets/world.js`.

### 8. Add automated browser smoke and accessibility checks

- Progress: source-level frontend regression tests now enforce shared language,
  filter, and minimum-target contracts through `node --test tests/*.mjs`.
- Problem: frontend behavior is validated manually; there is no repo-owned browser test suite.
- Impact: UI regressions and accessibility issues are easy to miss.
- Risk: Medium
- Proposed solution: add lightweight smoke tests for the main routes and a small accessibility check pass.
- Estimated effort: Medium
- Evidence: `tests/test_frontend_controls.mjs` covers source contracts; rendered
  browser behavior still depends on the documented manual validation loop.

### 9. Split safe commands from environment-bound commands in developer docs

- Problem: the repo mixes always-safe commands with commands that need network, secrets, or prepared dependencies.
- Impact: onboarding friction and inconsistent expectations for automation agents.
- Risk: Medium
- Proposed solution: document commands in three groups: local-safe, networked, and secret-dependent.
- Estimated effort: Medium
- Evidence: verified command outcomes during this audit.

### 10. Remove dead or partially integrated maintenance surfaces

- Progress: the no-op `assets/open-houses.js:getFilteredReports()` helper was removed
  on 2026-07-16. The remaining surfaces require separate ownership decisions.
- Problem: the repo still contains dead or partially integrated pieces such as `data/active_warzones.txt` and `window.OpenHouse`.
- Impact: extra cognitive load and false signals about supported behavior.
- Risk: Low to medium
- Proposed solution: delete or fully wire those surfaces and update docs/workflows accordingly.
- Estimated effort: Medium
- Evidence: `data/active_warzones.txt`; `.github/workflows/update-worlds.yml:9-14`; `assets/open-houses.js`.

## Strategic

### 11. Separate automation concerns from the public site artifact

- Problem: refresh scripts, raw source data, public assets, and maintainer tooling are all versioned and deployed from the same repo shape.
- Impact: operational coupling, large deploy artifacts, and broader blast radius for maintenance changes.
- Risk: Medium to high
- Proposed solution: split raw data generation from public-site publishing, or at minimum produce a dedicated export artifact from a build step.
- Estimated effort: High
- Evidence: repo structure; `.github/workflows/deploy-pages.yml`; `data/market` size.

### 12. Replace browser-token repository writes with a safer maintainer model

- Problem: the admin flow depends on repo-write GitHub tokens entered into the browser.
- Impact: high security and governance risk.
- Risk: High
- Proposed solution: move maintainer writes to a GitHub App, server-side service, or local-only maintainer workflow outside the public Pages artifact.
- Estimated effort: High
- Evidence: `assets/admin.js:14-27`, `166-185`, `1475-1523`; `admin.html`.

### 13. Introduce reproducible toolchain configuration

- Problem: there is no committed toolchain manager, lockfile, formatter config, or typed JS pipeline.
- Impact: environment drift and inconsistent local behavior.
- Risk: Medium
- Proposed solution: choose a minimal reproducibility layer, such as a Python environment bootstrap script plus explicit formatter/lint decisions, without over-engineering the stack.
- Estimated effort: High
- Evidence: repo scan found no `pyproject.toml`, `package.json`, `Makefile`, or formatting config.

### 14. Rework the frontend information architecture and accessibility baseline

- Problem: the site currently depends on manual accessibility discipline and has known navigation/modal issues from the UI audit.
- Impact: ongoing UX regressions and high review cost for frontend work.
- Risk: Medium
- Proposed solution: define reusable navigation, modal, and filter patterns and test them automatically.
- Estimated effort: High
- Evidence: `docs/ui-ux-audit.md`; `assets/shared.js`; `assets/world.js`; `assets/app.js`.
