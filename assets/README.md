# Assets Directory Guide

This directory contains the static frontend assets used by the GitHub Pages site.

## File Groups

### JavaScript Entry Points

- `shared.js`: shared constants, storage helpers, language controls, footer rendering, timezone data, and common UI helpers
- `app.js`: home page controller and planner logic
- `world.js`: world detail page controller
- `ranking.js`: expected-return ranking page controller
- `open-houses.js`: open-house overview and detail controller
- `admin.js`: maintainer browser editor and GitHub API workflow
- `bigfoot.js`: quest reference page bootstrap

### Styling

- `styles.css`: site-wide stylesheet for all pages

### Media

- `logo/`: application logo
- `background/`: rotating page background artwork
- `sounds/`: optional audio assets for planner notifications

## Notes

- The frontend is intentionally framework-free and build-step-free.
- All JavaScript files are loaded directly by the static HTML entry points.
- Validation for these files is syntax-based in CI via `node --check assets/*.js`.
