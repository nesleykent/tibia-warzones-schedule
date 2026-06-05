# AGENTS

This file is the working contract for AI coding agents in this repository.

## Authority

- Source code, tests, generated data contracts, workflows, and this file are authoritative.
- When older markdown docs conflict with code, trust code first.
- The supporting governance docs added with this file are:
  - `docs/repository-architecture-report.md`
  - `docs/engineering-standards-guide.md`
  - `docs/repository-improvement-roadmap.md`
  - `docs/agent-operating-manual.md`

## Project Overview

- Static GitHub Pages site for Tibia warzone planning, ranking, open-house browsing, and maintainer operations.
- Frontend: root HTML entry points plus `assets/*.js` and `assets/styles.css`.
- Data: committed JSON and CSV under `data/`.
- Automation: Python scripts under `scripts/` and GitHub Actions under `.github/workflows/`.
- There is no backend, database, JavaScript package manager, bundler, Docker setup, Makefile, or `pull_request` CI workflow.

## Repository Structure

- `index.html`, `world.html`, `ranking.html`, `open-houses.html`, `bigfoot.html`, `admin.html`: route entry points.
- `assets/shared.js`: shared browser runtime exposed as `window.TibiaTime`.
- `assets/app.js`, `assets/world.js`, `assets/ranking.js`, `assets/open-houses.js`, `assets/admin.js`, `assets/bigfoot.js`: page controllers.
- `data/worlds.json`: primary public dataset.
- `data/history/`: per-world historical kill/service data.
- `data/market/world/`: per-world tracked market history.
- `data/manual-schedules.json`: durable manual schedule input.
- `data/market/items/tracked_items.json`: durable tracked-item input.
- `data/open-houses.json`: generated output, not the durable source of truth.
- `scripts/`: refresh, ranking, validation, and maintenance utilities.
- `tests/`: Python `unittest` coverage for helpers and validators.

## Source Of Truth Rules

- Manual schedules: `data/manual-schedules.json`
- Tracked market items: `data/market/items/tracked_items.json`
- Market item catalog: `data/market/items/items.csv`
- Open-house durable input: GitHub issues matching the open-house templates
- Open-house generated output: `data/open-houses.json`
- World/history generated outputs: `data/worlds.json` and `data/history/*.json`

Do not treat generated files as durable input when code proves otherwise.

## Mandatory Validation

Run these after any material change:

```bash
python3 -m py_compile scripts/*.py tests/*.py
python3 -m unittest discover -s tests -v
python3 scripts/validate_content.py
node --check assets/*.js
```

## Conditional Validation

- Frontend changes: serve locally with `python3 -m http.server 4173` and check the affected routes in a browser.
- Ranking logic or market-data changes:

```bash
python3 scripts/enrich_worlds_with_rankings.py
```

- World/history pipeline changes:

```bash
python3 scripts/update_data.py
```

- Open-house pipeline changes:

```bash
GITHUB_TOKEN=... GITHUB_REPOSITORY=owner/repo python3 scripts/update_open_houses.py
```

- `scripts/remove_outliers.py` needs `numpy`. Use a prepared environment:

```bash
.venv/bin/python -m pip install -r requirements.txt
.venv/bin/python scripts/remove_outliers.py
```

## Repository-Specific Constraints

- Do not assume GitHub will validate a PR. No workflow runs on `pull_request`.
- Do not expand the browser-token workflow in `admin.html`. It is already a security-sensitive surface.
- Do not hand-edit `data/open-houses.json` for durable changes.
- Do not leave investigation-induced churn in generated data files unless the task is to refresh that data.
- Do not add new dependencies casually. This repo is stdlib-first on Python and has no JS package toolchain.
- Do not introduce a bundler, framework, or build system without a repository-level architecture decision.

## Coding Conventions

- Python:
  - Keep `main()` returning an exit code and use `raise SystemExit(main())`.
  - Prefer `Path`, standard library modules, and explicit normalization helpers in `scripts/common.py`.
  - Follow the existing typed style: `from __future__ import annotations` and function annotations.
- Frontend:
  - Keep one controller per page.
  - Reuse `window.TibiaTime` helpers instead of copying shared logic.
  - Preserve accessibility semantics and manual route checks after UI changes.
- Data:
  - Normalize and sort generated payloads instead of preserving accidental order.
  - Keep file responsibilities clear: source inputs vs generated outputs.

## Security Requirements

- Never commit tokens, credentials, or new embedded secrets.
- Treat the existing hardcoded TibiaMarket bearer token in `scripts/fetch_item_history.py` as a defect, not a pattern to copy.
- Avoid storing sensitive values in browser storage unless the task is explicitly to remove or reduce that risk.

## Performance Considerations

- The Pages artifact currently copies `assets/` and `data/` directly. Any size increase ships to production.
- Avoid duplicating large datasets or adding heavyweight client-side assets.
- Prefer incremental or on-demand loading over widening `data/worlds.json`.

## Pull Request Expectations

- Keep diffs scoped to one coherent change.
- Explain which source-of-truth files changed and which generated files were intentionally rewritten.
- Call out any command that could not be run because of missing network, missing secrets, or environment restrictions.
- If docs change, align them with the current code and workflows.

## Definition Of Done

- The relevant validation commands pass locally, or any blocked command is explicitly explained.
- Generated data churn is intentional and minimized.
- Updated behavior matches the real source-of-truth model.
- New documentation and code do not repeat stale claims already disproven by the repository.
- The change leaves the repo easier to maintain, not merely patched.
