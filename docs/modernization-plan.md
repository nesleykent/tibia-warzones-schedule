# Modernization Plan

This branch keeps the current static GitHub Pages architecture and improves maintainability around data workflows, validation, and contributor safety.

## Completed Work In This Phase

- repository audit captured in `docs/repository-audit.md`
- maintainer documentation for common data tasks
- architecture documentation for the current static site and Python pipeline
- repository-wide content validation script
- deterministic validator tests
- CI integration for validation, tests, Python syntax checks, and frontend JavaScript syntax checks
- local artifact cleanup and ignore hardening

## Deferred Decisions

### Deferred TypeScript Or Vite Migration

Deferred intentionally.

Reason:

- current pain is data safety and workflow reliability
- current deployment model is already simple and stable
- introducing a frontend build pipeline now would not solve the highest-risk maintenance issues

Recommended future phase:

- split large frontend files first
- then evaluate selective TypeScript adoption
- then evaluate Vite only if module boundaries and build ergonomics become the main bottleneck

### Deferred Astro Decision

Deferred intentionally.

Reason:

- this repository is not blocked by templating or static content composition
- the core complexity lives in generated data contracts and maintenance workflows
- Astro would add migration cost without reducing Python data-pipeline complexity

## Risk Areas

- oversized frontend files remain:
  - `assets/world.js`
  - `assets/app.js`
  - `assets/styles.css`
- generated `data/worlds.json` still contains duplicated or legacy fields
- no override layer yet for world metadata corrections
- no dedicated historical correction layer yet
- market refresh still depends on external API behavior and dataset completeness

## Recommended Future Phases

### Phase 2

- normalize the `data/worlds.json` contract internally while preserving external field names
- introduce a correction/override layer for world metadata and history exceptions
- reduce dead fallback paths in the frontend and scripts

### Phase 3

- split large frontend files into page-local and shared modules
- add deeper integration tests for `update_data.py`, `economic_ranking.py`, and `update_open_houses.py`

### Phase 4

- reassess TypeScript for the frontend once modules are smaller and stable
- reassess Vite only if the repository benefits from bundling, module resolution, and stronger developer tooling

### Phase 5

- only revisit Astro after a clear need appears for content composition or broader site-structure changes

## Recommended Branch After This One

- `feature/frontend-modularization`

Reason:

- it can reduce the largest frontend maintenance risk without changing the hosting model or data contracts
