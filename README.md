# WKND Edge Delivery Services Training Site

This repository (`main-wknd-10404`) contains the **WKND Edge Delivery Services (EDS) training site** for Jay Patel.  
The site is built with:

- Adobe AEM Edge Delivery Services (EDS)
- Google Docs / Sheets–based authoring
- The official AEM Boilerplate project structure

---

## Environments

- **Preview:** `https://main--main-wknd-10404--jay98patel.aem.page/`
- **Live:** `https://main--main-wknd-10404--jay98patel.aem.live/`

Preview is used for development and QA; Live is the production-facing site.

---

## Tech Stack

- **Runtime:** Adobe EDS / AEM as a Cloud Service
- **Authoring:** Google Docs & Sheets (document-based)
- **Frontend:**
  - Vanilla JS, HTML, CSS
  - AEM Boilerplate (`blocks`, `scripts`, `styles`)
- **Performance:** Lighthouse 95+ target for mobile and desktop

---

## Project Structure

The repo follows the AEM Boilerplate layout:

```text
/
├─ blocks/
│  └─ <block-name>/
│     ├─ <block-name>.js
│     └─ <block-name>.css
├─ scripts/
│  ├─ aem.js
│  ├─ scripts.js        # main JS entry
│  └─ delayed.js        # lazy / delayed JS
├─ styles/
│  ├─ styles.css        # critical / above-the-fold styles
│  └─ lazy-styles.css   # non-critical styles
├─ head.html            # minimal head markup
└─ ...
