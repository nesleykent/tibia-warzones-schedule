# Engineering Standards Guide

Audit basis: source code, tests, workflows, and verified commands as of 2026-06-04.

## How These Standards Were Inferred

This repository does not define a formal contribution guide or lint/format policy file. The standards below were inferred from:

- file layout and naming in `assets/`, `scripts/`, `tests/`, and `data/`
- helper reuse in `scripts/common.py` and `assets/shared.js`
- existing test targets
- workflow validation steps
- current generated-data and documentation behavior

## 1. Naming Conventions

### Python

Observed standard:

- modules: snake_case filenames
- functions: snake_case
- constants: UPPER_CASE
- paths/constants declared near module top
- `main()` returns an `int` and is wrapped by `raise SystemExit(main())`

Evidence:

- `scripts/update_data.py`
- `scripts/fetch_item_history.py`
- `scripts/update_open_houses.py`
- `scripts/enrich_worlds_with_rankings.py`

Practical rule for agents:

- Follow the current Python style exactly. Do not introduce class-heavy or framework-style organization unless the existing module already uses it.

### JavaScript

Observed standard:

- one file per page controller
- camelCase functions
- uppercase constant bags such as `STORAGE_KEYS`, `PAGE_ELEMENT_IDS`, `FILTER_CONFIGS`
- shared helpers imported by destructuring `window.TibiaTime`

Evidence:

- `assets/app.js:5-40`
- `assets/ranking.js:1-40`
- `assets/open-houses.js:1-40`
- `assets/admin.js:1-29`

Practical rule for agents:

- Keep new browser logic page-scoped unless it is truly shared; when shared, add it to `assets/shared.js` rather than re-copying it.

## 2. File Organization Patterns

Observed pattern:

- route shells live at the repository root
- route behavior lives in `assets/*.js`
- durable inputs and generated outputs both live in `data/`
- automation lives in `scripts/`
- validation lives in `scripts/validate_content.py`
- tests live in `tests/` and target script helpers or validators directly

Evidence:

- repo file inventory
- `tests/test_script_helpers.py`
- `tests/test_validate_content.py`

Practical rule for agents:

- Do not move route files into a framework layout or relocate data files without updating every direct file-path consumer.

## 3. Testing Strategy

Observed strategy:

- Python `unittest`
- focus on helpers, normalization rules, validators, and edge-case script behavior
- no frontend unit tests
- no browser automation suite in the repo
- no workflow test harness

Evidence:

- `tests/test_script_helpers.py`
- `tests/test_validate_content.py`
- `.github/workflows/deploy-pages.yml:39-49`

Implications:

- Script-level refactors must add or preserve helper/validator tests.
- Frontend changes need manual route verification because the repo has no automated UI coverage.

Required agent behavior:

- Add tests for new helper logic when feasible.
- Do not claim UI safety solely from `node --check`.

## 4. Error Handling Strategy

### Python scripts

Observed pattern:

- helper functions raise `RuntimeError`/`ValueError`
- top-level `main()` prints human-readable errors and returns non-zero status
- validators accumulate multiple errors and warnings before exit

Evidence:

- `scripts/update_data.py:31-38`, `395-402`
- `scripts/update_open_houses.py:64-72`, `388-401`
- `scripts/validate_content.py:158-172`, `992-1002`

Standard to preserve:

- Fail clearly on unrecoverable repository-contract problems.
- Keep user-facing error messages readable in CLI and Actions logs.
- Prefer accumulating validation issues in the validator instead of failing on the first schema error.

### Frontend

Observed pattern:

- storage helpers and some UI code catch and fall back quietly
- sparse `console.error` usage

Evidence:

- `assets/shared.js:335-369`
- `assets/world.js:1743-1760`
- `assets/open-houses.js:74-98`

Standard to preserve:

- Do not add new silent failure paths without a strong reason.
- For critical UI failures, prefer explicit empty/error states over hidden fallback.

## 5. Logging Strategy

Observed pattern:

- Python scripts use `print()` to stdout/stderr
- GitHub Actions logs are the primary operational log sink
- frontend logging is minimal and mostly ad hoc
- no structured logging framework

Evidence:

- `scripts/update_data.py:347-416`
- `scripts/fetch_item_history.py:343-698`
- `scripts/remove_outliers.py:279-341`
- `assets/world.js:1744`

Practical rule for agents:

- Keep logs short, specific, and grep-friendly.
- Do not introduce heavyweight logging dependencies.

## 6. Dependency Management Strategy

Observed standard:

- Python is stdlib-first
- `requirements.txt` contains one external dependency: `numpy`
- no JS dependency manager is present
- no lockfile or environment manager config is committed

Evidence:

- `requirements.txt`
- `scripts/remove_outliers.py:9`
- repo scan found no `package.json`, `pyproject.toml`, `poetry.lock`, or `Dockerfile`

Implications:

- New dependencies carry unusually high repo-wide cost.
- Agents should avoid introducing npm tooling or Python packages unless the problem cannot be solved with existing patterns.

## 7. Type Safety Standards

Observed standard:

- Python uses type annotations broadly
- JavaScript is plain untyped ES code
- no mypy, pyright, TypeScript, or ESLint config exists

Evidence:

- `scripts/*.py` use annotations and `from __future__ import annotations`
- repo scan found no type-checker config files

Practical rule for agents:

- Preserve and extend Python type annotations.
- Do not describe JS as type-safe; it is not statically checked in this repo.
- Do not introduce TypeScript casually without a repo-level tooling decision.

## 8. Documentation Expectations

Observed state:

- The repository has several architecture and operations docs.
- Some of them are stale relative to current code.

Evidence:

- `README.md:91`
- `docs/operational-runbook.md:64`, `194-195`, `257`, `263-267`
- `docs/architecture.md:188`
- `assets/admin.js:1285-1317`
- `scripts/update_data.py:395-402`
- `scripts/common.py:258-288`

Required rule for agents:

- Any change to workflows, source-of-truth files, validation commands, or admin capabilities must include documentation updates.
- Do not preserve stale docs for convenience.

## 9. Implicit Maintainer Rules

These rules are not centrally declared, but the code and workflows show they are being followed:

1. Generated public data is committed to Git and deployed from `main`.
2. Validation is expected before and after generated-data changes.
3. Sort and normalize payloads before write.
4. Prefer stable file paths and direct JSON contracts over abstraction layers.
5. Open-house durability comes from GitHub issues, not hand-edited JSON.
6. The admin page should only modify durable source files, then rely on workflows to regenerate outputs.
7. Actions automation is allowed to commit directly back to `main`.

Evidence:

- `.github/workflows/update-*.yml`
- `scripts/common.py`
- `scripts/update_open_houses.py`
- `assets/admin.js:1285-1317`, `1548-1553`

## 10. Conflicting Conventions Agents Must Resolve Safely

### Conflict A: documentation vs code

Current docs still contain stale claims.

Resolution rule:

- Prefer current code and the newer governance docs over older markdown narratives.

### Conflict B: documented `python3` workflow vs optional dependency reality

- Baseline validation works with system `python3`.
- `scripts/remove_outliers.py` does not unless `numpy` is installed.

Resolution rule:

- Separate “safe stdlib commands” from “prepared-environment commands” in any new docs or automation.

### Conflict C: generated JSON formatting is not uniform

- `update_data.py` and `update_open_houses.py` pretty-print JSON.
- `fetch_item_history.py` writes compact JSON.

Resolution rule:

- Do not mass-reformat generated data unless the producing script changes intentionally.

## 11. Standards Agents Should Enforce Going Forward

- Correctness before convenience.
- Root-cause fixes over local patches.
- No new duplicate logic when a shared helper exists or should exist.
- No superficial doc updates that leave workflow drift unresolved.
- No silent widening of the public deploy artifact.
- No new browser-secret flows.
