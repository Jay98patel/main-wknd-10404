# AGENTS.md – AI Coding Guidelines for WKND EDS Project

## Project Overview

This repository (`main-wknd-10404`) hosts the **WKND Edge Delivery Services training site** for Jay Patel.
The site is built using:
- Adobe AEM Edge Delivery Services (EDS)
- Document-based authoring via Google Docs / Sheets
- AEM Boilerplate for code structure and blocks

Target environments:
- Preview: `https://main--main-wknd-10404--jay98patel.aem.page/`
- Live: `https://main--main-wknd-10404--jay98patel.aem.live/`

## How AI Tools Should Work on This Project

1. **Always respect the AEM boilerplate conventions**
   - Keep `head.html` small and minimal.
   - Use `scripts/scripts.js` and `styles/styles.css` as entry points.
   - Block-specific logic lives in `/blocks/<block-name>/<block-name>.js` and `.css`.

2. **Prefer reusable / generic block patterns**
   - When creating UI for WKND (cards, carousels, grids, image + text layouts),
     create semantically named blocks:
     - `content-cards`
     - `media-carousel`
     - `feature-grid`
     - `image-text-split`
   - Avoid non-semantic names like `col-1`, `col-2`, `col-3`.

3. **Document Authoring First**
   - Authoring starts in Google Docs / Sheets.
   - Blocks are driven by content structure (tables, section metadata),
     not hard-coded HTML in the repo.
   - Any new block must come with:
     - Clear Google Doc example structure.
     - Section / block metadata definitions.

4. **Performance & Lighthouse**
   - All changes must preserve a Lighthouse score of **95+** on mobile and desktop.
   - Critical CSS goes into `styles.css` (LCP-related only).
   - Non-critical CSS belongs in `lazy-styles.css`.
   - Heavy scripts go into `delayed.js` or are loaded lazily.

5. **Accessibility & SEO**
   - Use semantic headings, landmarks, and alt text.
   - Respect “Markup – Sections, Blocks, and Autobloking” guidelines from AEM docs.
   - Keep HTML structure clean and minimal; no unnecessary wrappers.

6. **Branching & PRs**
   - Create feature branches: `feature/<short-name>` (e.g. `feature/home-hero-block`).
   - Use Pull Requests for all changes going into `main`.
   - Ensure the AEM Code Sync GitHub App checks (including Lighthouse) are green before merge.

7. **What AI Should Not Do**
   - Do not add heavy inline scripts or styles in `head.html`.
   - Do not change ESLint / Stylelint rules unless explicitly requested.
   - Do not introduce random third-party libraries that can hurt performance.

## Helpful Documentation

When in doubt, consult and respect:
- Developer Tutorial: `https://www.aem.live/developer/tutorial`
- Anatomy of a Project: `https://www.aem.live/developer/anatomy-of-a-project`
- Block Collection: `https://www.aem.live/developer/block-collection`
- Web Performance: `https://www.aem.live/developer/keeping-it-100`
- Markup – Sections & Blocks: `https://www.aem.live/developer/markup-sections-blocks`
