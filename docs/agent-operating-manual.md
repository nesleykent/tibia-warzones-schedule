# Agent Operating Manual

This manual defines how AI coding agents should operate in this repository.

## 1. Core Priorities

Apply these in order:

1. Correctness
2. Reliability
3. Maintainability
4. Simplicity
5. Performance

Reject:

- workarounds that preserve known defects
- hidden technical debt
- duplicate logic when a shared helper should exist
- incomplete validation
- changes that leave source-of-truth ambiguity unresolved

## 2. Authority Model

- Code and workflows override older docs.
- `AGENTS.md` and the governance docs added with it define the current agent contract.
- Generated files are not automatically safe to edit; first identify whether the file is a source input or an output artifact.

## 3. Pre-Change Checklist

Before editing anything:

1. Identify the source-of-truth files for the affected behavior.
2. Identify whether the target file is public runtime code, durable source input, or generated output.
3. Read the owning workflow or script entry point.
4. Read the relevant tests and validator logic.
5. Run the baseline validation commands if the repo state permits it.

Baseline commands:

```bash
python3 -m py_compile scripts/*.py tests/*.py
python3 -m unittest discover -s tests -v
python3 scripts/validate_content.py
node --check assets/*.js
```

## 4. Repository-Specific Red Lines

- Do not treat `data/open-houses.json` as the durable source of truth.
- Do not expand the browser-based GitHub token workflow.
- Do not assume PRs receive GitHub Actions validation automatically.
- Do not leave investigation-only updates to `data/worlds.json`, `data/history/`, or `data/market/` in the worktree unless the task is a data refresh.
- Do not add new dependencies or toolchains without a repo-level justification.
- Do not mass-reformat generated JSON written by an existing producer unless the producer changes intentionally.

## 5. Task Playbooks

### Bug fixes

1. Reproduce the bug from the owning route, script, test, or workflow.
2. Find the actual source-of-truth layer that owns the behavior.
3. Fix the root cause, not only the symptom.
4. Add or update the narrowest reasonable test or validation coverage.
5. Run the baseline checks and any area-specific checks.

Repository emphasis:

- For data bugs, inspect `scripts/common.py` and `scripts/validate_content.py` before changing consumers.
- For frontend bugs, inspect `assets/shared.js` before copying fixes across page controllers.

### Refactoring

1. Preserve current outputs unless the task explicitly changes behavior.
2. Prefer extracting shared helpers over duplicating logic again.
3. Keep file responsibilities intact: route shell, shared runtime, page controller, script layer, validator layer.
4. Re-run validators to ensure the refactor did not alter data contracts.

### Feature development

1. Decide where the feature belongs: frontend-only, durable source data, generated output, workflow, or documentation.
2. Verify whether an existing source-of-truth model already covers it.
3. Update validation or tests if the feature changes a contract.
4. Update docs when the feature changes commands, source-of-truth files, or maintainer workflow.

### Testing

Use the lightest effective validation surface:

- helper/contract changes: Python `unittest`
- generated data contract changes: `scripts/validate_content.py`
- JS syntax only: `node --check assets/*.js`
- UI changes: manual route verification with a local static server

Recommended local preview:

```bash
python3 -m http.server 4173
```

Minimum manual routes after frontend changes:

- `/index.html`
- `/world.html?name=Antica`
- `/ranking.html`
- `/open-houses.html`
- `/bigfoot.html`
- `/admin.html` if the change touches maintainer behavior

### Documentation updates

Update docs whenever you change:

- workflow triggers or commands
- source-of-truth files
- generated-file responsibilities
- admin behavior
- dependency expectations
- validation commands

Do not preserve a stale doc section because it is “close enough.”

### Dependency upgrades

Default posture: avoid them.

If a dependency change is necessary:

1. explain why stdlib or current tooling is insufficient
2. document the install path
3. confirm it does not silently widen the deploy/runtime footprint
4. update `AGENTS.md` and the relevant docs if the dependency changes workflow

### Security fixes

Prioritize:

- removing embedded secrets
- reducing browser token exposure
- tightening maintainer/public surface separation
- failing closed instead of silently degrading

Security changes should include a doc note if maintainers must rotate secrets or change workflow.

### Code reviews

When reviewing, focus on:

- source-of-truth correctness
- whether generated outputs are being edited directly without cause
- whether validation coverage matches the change
- whether docs were updated for workflow/contract changes
- whether the change adds duplicate logic, hidden debt, or insecure shortcuts

## 6. Validation Matrix

| Change type | Minimum checks |
| --- | --- |
| Python script logic | `py_compile`, `unittest`, `validate_content.py` if contracts changed |
| Workflow change | baseline checks plus manual workflow diff review |
| Frontend JS/HTML/CSS | `node --check`, local preview, manual route verification |
| Data contract change | baseline checks, relevant generator command if practical, `validate_content.py` |
| Ranking logic | `unittest`, `validate_content.py`, `python3 scripts/enrich_worlds_with_rankings.py` |
| World/history pipeline | `python3 scripts/update_data.py` when network is available, then `validate_content.py` |
| Open-house pipeline | `GITHUB_TOKEN=... GITHUB_REPOSITORY=... python3 scripts/update_open_houses.py` when secrets/network are available |

## 7. Environment And Secret Handling

- `scripts/update_open_houses.py` requires `GITHUB_TOKEN` and `GITHUB_REPOSITORY`.
- `scripts/update_data.py` and `scripts/fetch_item_history.py` need network access to external APIs.
- `scripts/remove_outliers.py` needs `numpy`; use `.venv` or install `requirements.txt`.
- If a command cannot be run because of missing network or secrets, say so explicitly in the final handoff.

## 8. Generated Data Hygiene

Treat these files and directories as generated unless the task explicitly targets them:

- `data/worlds.json`
- `data/history/*.json`
- `data/market/world/**/*.json`
- `data/market/sync_state.json`
- `data/open-houses.json`

If you run refresh commands for investigation:

1. inspect the diff
2. keep only intentional output changes
3. restore incidental churn before finishing

## 9. Frontend-Specific Guidance

- Reuse `window.TibiaTime` helpers rather than cloning storage/timezone/language logic.
- Preserve or improve accessibility. The repo already has known modal, navigation, and localization debt.
- Do not introduce framework-only patterns into plain JS route controllers.
- Keep runtime data loading direct and simple; there is no bundler or client-state library.

See: `docs/ui-ux-audit.md`

## 10. Completion Checklist

Before finishing a task, confirm:

- the right source-of-truth files were changed
- generated data churn is intentional
- mandatory validation ran or was explicitly blocked
- relevant docs were updated
- security posture did not get worse
- the change reduced ambiguity rather than creating a second path
