import { getMetadata } from '../../scripts/aem.js';
import { loadFragment } from '../fragment/fragment.js';

// media query match that indicates mobile/tablet width
const isDesktop = window.matchMedia('(min-width: 900px)');

function closeOnEscape(e) {
  if (e.code === 'Escape') {
    const nav = document.getElementById('nav');
    if (!nav) return;

    const navSections = nav.querySelector('.nav-sections');
    if (!navSections) return;

    const navSectionExpanded = navSections.querySelector('[aria-expanded="true"]');
    if (navSectionExpanded && isDesktop.matches) {
      // eslint-disable-next-line no-use-before-define
      toggleAllNavSections(navSections);
      navSectionExpanded.focus();
    } else if (!isDesktop.matches) {
      // eslint-disable-next-line no-use-before-define
      toggleMenu(nav, navSections);
      const btn = nav.querySelector('button');
      if (btn) btn.focus();
    }
  }
}

function closeOnFocusLost(e) {
  const nav = e.currentTarget;
  if (!nav.contains(e.relatedTarget)) {
    const navSections = nav.querySelector('.nav-sections');
    if (!navSections) return;

    const navSectionExpanded = navSections.querySelector('[aria-expanded="true"]');
    if (navSectionExpanded && isDesktop.matches) {
      // eslint-disable-next-line no-use-before-define
      toggleAllNavSections(navSections, false);
    } else if (!isDesktop.matches) {
      // eslint-disable-next-line no-use-before-define
      toggleMenu(nav, navSections, false);
    }
  }
}

function openOnKeydown(e) {
  const focused = document.activeElement;
  const isNavDrop = focused && focused.classList.contains('nav-drop');
  if (isNavDrop && (e.code === 'Enter' || e.code === 'Space')) {
    const dropExpanded = focused.getAttribute('aria-expanded') === 'true';
    // eslint-disable-next-line no-use-before-define
    toggleAllNavSections(focused.closest('.nav-sections'));
    focused.setAttribute('aria-expanded', dropExpanded ? 'false' : 'true');
  }
}

function focusNavSection() {
  document.activeElement.addEventListener('keydown', openOnKeydown);
}

/**
 * Toggles all nav sections
 * @param {Element} sections The container element
 * @param {Boolean} expanded Whether the element should be expanded or collapsed
 */
function toggleAllNavSections(sections, expanded = false) {
  if (!sections) return;
  sections.querySelectorAll(':scope > ul > li').forEach((section) => {
    section.setAttribute('aria-expanded', expanded);
  });
}

/**
 * Toggles the entire nav
 * @param {Element} nav The container element
 * @param {Element} navSections The nav sections within the container element
 * @param {*} forceExpanded Optional param to force nav expand behavior when not null
 */
function toggleMenu(nav, navSections, forceExpanded = null) {
  if (!nav || !navSections) return;

  const expanded = forceExpanded !== null
    ? !forceExpanded
    : nav.getAttribute('aria-expanded') === 'true';

  const button = nav.querySelector('.nav-hamburger button');
  document.body.style.overflowY = (expanded || isDesktop.matches) ? '' : 'hidden';
  nav.setAttribute('aria-expanded', expanded ? 'false' : 'true');
  toggleAllNavSections(navSections, expanded || isDesktop.matches ? 'false' : 'true');

  if (button) {
    button.setAttribute('aria-label', expanded ? 'Open navigation' : 'Close navigation');
  }

  // enable nav dropdown keyboard accessibility
  const navDrops = navSections.querySelectorAll('.nav-drop');
  if (isDesktop.matches) {
    navDrops.forEach((drop) => {
      if (!drop.hasAttribute('tabindex')) {
        drop.setAttribute('tabindex', 0);
        drop.addEventListener('focus', focusNavSection);
      }
    });
  } else {
    navDrops.forEach((drop) => {
      drop.removeAttribute('tabindex');
      drop.removeEventListener('focus', focusNavSection);
    });
  }

  // enable menu collapse on escape keypress
  if (!expanded || isDesktop.matches) {
    // collapse menu on escape press
    window.addEventListener('keydown', closeOnEscape);
    // collapse menu on focus lost
    nav.addEventListener('focusout', closeOnFocusLost);
  } else {
    window.removeEventListener('keydown', closeOnEscape);
    nav.removeEventListener('focusout', closeOnFocusLost);
  }
}

/**
 * Build nav data from the nav.docx table
 *  - Table 0, row 0 = "nav"
 *  - Rows after that = Label | URL | Type ("primary"/"secondary")
 */
function buildNavModel(fragment) {
  const table = fragment.querySelector('table');
  if (!table) return { primary: [], secondary: [] };

  const rows = Array.from(table.rows).filter((r) => r.cells.length);
  if (rows.length <= 1) return { primary: [], secondary: [] };

  const itemRows = rows.slice(1); // skip row with "nav"

  const primary = [];
  const secondary = [];

  itemRows.forEach((row) => {
    const [labelCell, urlCell, typeCell] = Array.from(row.cells);
    const label = labelCell?.textContent.trim();
    let url = urlCell?.textContent.trim();
    const type = (typeCell?.textContent.trim() || 'primary').toLowerCase();

    if (!label || !url) return;

    // Normalize absolute URLs → path only, so it works on .page & .live
    try {
      if (/^https?:\/\//i.test(url)) {
        const u = new URL(url);
        url = u.pathname + u.search + u.hash;
      }
    } catch (err) {
      // keep raw url if parsing fails
    }

    const item = { label, url };
    if (type === 'secondary') secondary.push(item);
    else primary.push(item);
  });

  return { primary, secondary };
}

/**
 * loads and decorates the header, mainly the nav
 * @param {Element} block The header block element
 */
export default async function decorate(block) {
  // load nav as fragment
  const navMeta = getMetadata('nav');
  const navPath = navMeta ? new URL(navMeta, window.location).pathname : '/nav';
  const fragment = await loadFragment(navPath);

  const { primary, secondary } = buildNavModel(fragment);

  // --- Build clean nav DOM ---------------------------------------------------
  block.textContent = '';

  const nav = document.createElement('nav');
  nav.id = 'nav';

  // brand (simple WKND wordmark)
  const navBrand = document.createElement('div');
  navBrand.className = 'nav-brand';
  const brandLink = document.createElement('a');
  brandLink.href = '/us/en/home'; // you can change to '/' if you want
  brandLink.textContent = 'WKND';
  brandLink.className = 'nav-logo';
  navBrand.append(brandLink);

  // primary links (centre)
  const navSections = document.createElement('div');
  navSections.className = 'nav-sections';
  const primaryList = document.createElement('ul');
  primary.forEach(({ label, url }) => {
    const li = document.createElement('li');
    const a = document.createElement('a');
    a.href = url;
    a.textContent = label;
    li.append(a);
    primaryList.append(li);
  });
  navSections.append(primaryList);

  // secondary links (right side, e.g. FAQs or extra)
  const navTools = document.createElement('div');
  navTools.className = 'nav-tools';
  if (secondary.length) {
    const secondaryList = document.createElement('ul');
    secondary.forEach(({ label, url }) => {
      const li = document.createElement('li');
      const a = document.createElement('a');
      a.href = url;
      a.textContent = label;
      li.append(a);
      secondaryList.append(li);
    });
    navTools.append(secondaryList);
  }

  nav.append(navBrand, navSections, navTools);

  // hamburger for mobile
  const hamburger = document.createElement('div');
  hamburger.classList.add('nav-hamburger');
  hamburger.innerHTML = `<button type="button" aria-controls="nav" aria-label="Open navigation">
      <span class="nav-hamburger-icon"></span>
    </button>`;
  hamburger.addEventListener('click', () => toggleMenu(nav, navSections));
  nav.prepend(hamburger);
  nav.setAttribute('aria-expanded', 'false');

  // prevent mobile nav behavior on window resize
  toggleMenu(nav, navSections, isDesktop.matches);
  isDesktop.addEventListener('change', () => toggleMenu(nav, navSections, isDesktop.matches));

  const navWrapper = document.createElement('div');
  navWrapper.className = 'nav-wrapper';
  navWrapper.append(nav);
  block.append(navWrapper);
}
