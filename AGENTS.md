# AGENTS.md

Agents are maintainers of this repository.

This project may be operationally critical to its maintainer.

Do not assume the maintainer can visually inspect, manually verify, or independently repair changes.

Every change must be:

- validated
- documented
- recoverable
- synchronized with GitHub

Fix root causes.

Search repository-wide for related patterns.

Do not optimize for minimum edits.

Optimize for long-term maintainability.

A task is not complete until:

- validation finished
- changes committed
- changes pushed to GitHub
- final handoff includes validation results and repository state

This manual defines how AI coding agents should operate in this repository.

## 1. Mission

Agents act as maintainers of the repository, not task executors.

This project may support critical personal, professional, financial, accessibility, and operational needs. Treat breakage as high impact. The maintainer may have limited ability to visually inspect, manually audit, or directly repair broken systems. Agent work must therefore emphasize clarity, reversibility, validation, synchronization, and complete handoff quality.

Every change should improve or preserve:

1. Correctness
2. Reliability
3. Maintainability
4. Simplicity
5. Performance
6. Accessibility
7. Operational continuity

A smaller patch is not inherently a better patch.

A task is successful when the repository becomes more understandable, maintainable, trustworthy, and easier to recover.

Default behavior: high-quality implementation over minimal patch.

Prefer root-cause fixes, clear architecture, reusable functions, explicit validation, and complete tests.

Before editing, explain the bug class and affected files.

After editing, report changed files, validation commands, and remaining risks.

## 2. Core Priorities

Apply these in order:

1. Correctness
2. Reliability
3. Maintainability
4. Simplicity
5. Performance
6. Accessibility
7. Operational continuity

Reject:

- workarounds that preserve known defects
- hidden technical debt
- duplicate logic when a shared helper should exist
- incomplete validation
- source-of-truth ambiguity
- test-only fixes that leave defects in place
- changes that make the system harder to verify
- changes that leave local and remote repository state out of sync

## 3. Authority Model

Priority order:

1. Runtime behavior
2. Source-of-truth code
3. Validation and tests
4. AGENTS.md and governance documentation
5. Historical documentation

Generated files are not automatically safe to edit.

Determine whether a file is:

- durable source input
- runtime implementation
- generated output
- documentation
- deployment artifact

before making changes.

## 4. Engineering Decision Framework

Before implementation:

1. Identify the root cause.
2. Identify the source-of-truth layer.
3. Identify all participating files.
4. Search for similar implementations across the repository.
5. Determine whether the issue is:
   - isolated defect
   - duplicated defect pattern
   - architectural defect
   - workflow defect
   - synchronization defect
   - accessibility defect
   - operational continuity defect
6. Evaluate alternatives.
7. Select the most maintainable solution.

Do not stop investigation after finding the first plausible explanation.

## 5. Accessibility And Critical Continuity Requirements

Assume that the maintainer may depend on this project and its automation to access income, services, social infrastructure, or essential workflows.

Therefore:

- Prefer explicit, verifiable, reversible changes.
- Do not rely on visual-only verification.
- Avoid vague handoffs such as "looks good" or "probably fixed."
- Document exact validation performed.
- Document exact validation blockers.
- Preserve a clear recovery path for every risky change.
- Keep repository state synchronized so another machine, agent, or maintainer can continue from GitHub.

When a failure blocks critical access, prioritize restoring a stable verified path before optional refactoring.

## 6. Git Synchronization And Commit Discipline

Keep local work, branch state, and GitHub state synchronized.

Before editing:

```bash
git status --short
git branch --show-current
git fetch --all --prune
git status --branch --short
```

If the branch has diverged, resolve divergence before new work when practical.

Preferred reconciliation for a clean linear history:

```bash
git pull --rebase origin main
```

Use merge only when a merge commit is intentionally desired.

After validated changes:

```bash
git status --short
git diff --check
git add -A
git commit -m "<clear conventional summary>"
git push origin HEAD
```

If validation cannot run because of missing network, secrets, or environment limits, document the blocker in the commit or final handoff and keep the change minimal and reviewable.

If GitHub push fails, report:

1. command executed
2. failure reason
3. repository state
4. next safe command

Always finish with:

```bash
git status --branch --short
```

The final state should be clean or explicitly explained.

## 7. Pre-Change Checklist

Before editing:

1. Identify source-of-truth files.
2. Identify affected workflows.
3. Read relevant tests.
4. Read validation logic.
5. Review related implementations.
6. Check repository synchronization state.
7. Run baseline validation if practical.

Baseline commands:

```bash
python3 -m py_compile scripts/*.py tests/*.py
python3 -m unittest discover -s tests -v
python3 scripts/validate_content.py
node --check assets/*.js
```

## 8. Repository-Specific Red Lines

- Do not assume GitHub Actions validation exists.
- Do not leave investigation-only data updates in the worktree.
- Do not introduce dependencies without repository-level justification.
- Do not mass-reformat generated JSON without changing the producer.
- Do not leave committed work unpushed when GitHub access is available.
- Do not leave local worktrees ambiguous for the next maintainer or agent.

## 9. Prohibited Agent Behaviors

Never:

- fix symptoms without identifying the root cause
- modify tests solely to make them pass
- create duplicate business logic
- introduce parallel source-of-truth paths
- suppress errors without justification
- claim validation succeeded when it did not run
- leave TODOs as implementation substitutes
- copy fixes into multiple files when a shared abstraction exists
- ignore repository-wide impact
- leave the repository unsynchronized without explanation
- assume a human can visually inspect or manually repair the result later

## 10. Task Playbooks

### Bug Fixes

1. Reproduce the defect.
2. Identify the root cause.
3. Identify all affected locations.
4. Fix the owning layer.
5. Add regression coverage.
6. Run validation.
7. Commit and push validated work when GitHub access is available.

Repository emphasis:

- inspect `scripts/common.py` and `scripts/validate_content.py` before changing consumers
- inspect `assets/shared.js` before duplicating frontend fixes

### Refactoring

1. Preserve intended behavior.
2. Remove duplication.
3. Improve structure.
4. Preserve contracts.
5. Re-run validation.
6. Commit and push only coherent refactors.

### Feature Development

1. Determine the correct ownership layer.
2. Reuse existing models and abstractions.
3. Update contracts and validation.
4. Update documentation.
5. Verify accessibility impact.
6. Commit and push after validation.

### Testing

Use the lightest effective validation surface:

- helper and contract changes: Python `unittest`
- generated data contract changes: `scripts/validate_content.py`
- JS syntax verification: `node --check assets/*.js`
- UI verification: local preview and route testing
- accessibility-sensitive UI changes: keyboard navigation and screen-reader-friendly structure review

Local preview:

```bash
python3 -m http.server 4173
```

Minimum route verification:

- `/index.html`
- `/world.html?name=Antica`
- `/ranking.html`
- `/open-houses.html`
- `/bigfoot.html`
- `/admin.html` when maintainer workflows change

### Documentation

Update documentation whenever:

- commands change
- workflows change
- source-of-truth files change
- generated file responsibilities change
- maintainer procedures change
- accessibility expectations change
- Git or deployment procedures change

### Dependency Upgrades

Default posture: conservative.

Required:

1. justification
2. installation guidance
3. deploy impact review
4. documentation updates
5. validation after installation

### Code Reviews

Review for:

- source-of-truth correctness
- validation coverage
- documentation completeness
- duplicate logic
- hidden debt
- security regressions
- accessibility regressions
- synchronization gaps

## 11. Validation Matrix

| Change type                       | Minimum checks                                                  |
| --------------------------------- | --------------------------------------------------------------- |
| Python script logic               | py_compile, unittest, validate_content.py when contracts change |
| Workflow change                   | baseline checks and workflow review                             |
| Frontend changes                  | node --check, local preview, route verification                 |
| Accessibility-sensitive UI change | frontend checks plus keyboard and semantic structure review     |
| Data contract change              | baseline checks and validate_content.py                         |
| Ranking logic                     | unittest, validate_content.py, enrich_worlds_with_rankings.py   |
| World history pipeline            | update_data.py when available, then validate_content.py         |
| Open-house pipeline               | update_open_houses.py when secrets and network are available    |
| Documentation-only change         | spell/readability review and link/path verification             |
| Git workflow change               | dry-run command review and final branch status check            |
