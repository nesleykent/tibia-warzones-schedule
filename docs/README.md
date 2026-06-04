# Documentation Hub

This directory collects the repository's long-form technical documentation.

## Start Here

- [../README.md](../README.md): product overview, installation, usage, troubleshooting, FAQ, security, and support
- [architecture.md](./architecture.md): runtime model, data flow, and deployment shape
- [data-maintenance.md](./data-maintenance.md): maintainer workflows for source edits, rebuilds, validation, and browser-based administration
- [repository-audit.md](./repository-audit.md): detailed repository inventory and audit snapshot
- [modernization-plan.md](./modernization-plan.md): future-facing maintenance and architecture direction
- [../Expected_Return_Explanation.md](../Expected_Return_Explanation.md): ranking methodology and expected-return formulas

## Recommended Reading By Persona

### Players

Start with:

- [../README.md](../README.md)

Focus on:

- purpose
- key features
- usage guidelines
- FAQ

### Maintainers

Start with:

- [data-maintenance.md](./data-maintenance.md)
- [architecture.md](./architecture.md)

Then use:

- [modernization-plan.md](./modernization-plan.md)
- [repository-audit.md](./repository-audit.md)

### Contributors And Reviewers

Useful references:

- [../README.md](../README.md)
- [data-maintenance.md](./data-maintenance.md)
- [../scripts/README.md](../scripts/README.md)
- [../data/README.md](../data/README.md)

## Documentation Scope

The documentation set is intentionally split by purpose:

- product and user guidance lives in the root `README.md`
- operational and architectural details live under `docs/`
- directory-level inventories live next to the code or data they describe

This structure improves GitHub navigation without changing the current static-site architecture.
