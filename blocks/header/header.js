import { getMetadata } from '../../scripts/aem.js';
import { loadFragment } from '../fragment/fragment.js';

const isDesktop = window.matchMedia('(min-width: 900px)');

const defaultConfig = [
  { label: 'Home', href: '/us/en/home', style: 'primary' },
  { label: 'Magazine', href: '/us/en/magazine', style: 'primary' },
  { label: 'Adventures', href: '/us/en/adventures', style: 'primary' },
  { label: 'FAQs', href: '/us/en/faqs', style: 'primary' },
  { label: 'About Us', href: '/us/en/about-us', style: 'primary' },
];

function getNavConfig(fragment) {
  if (!fragment) return [];
  const tables = Array.from(fragment.querySelectorAll('table'));
  const navTable = tables.find((tbl) => {
    const firstRow = tbl.rows[0];
    const firstCell = firstRow && firstRow.cells[0];
    return firstCell && firstCell.textContent.trim().toLowerCase() === 'nav';
  });
  if (!navTable) return [];
  const rows = Array.from(navTable.rows).slice(1);
  return rows
    .map((row) => {
      const [labelCell, urlCell, styleCell] = row.cells;
      const label = ((labelCell && labelCell.textContent) || '').trim();
      const href = ((urlCell && urlCell.textContent) || '').trim();
      const style = ((styleCell && styleCell.textContent) || '').trim().toLowerCase();
      if (!label || !href) return null;
      return { label, href, style };
    })
    .filter(Boolean);
}

function toggleMenu(nav) {
  const open = nav.getAttribute('aria-expanded') === 'true';
  const next = !open;
  nav.setAttribute('aria-expanded', next ? 'true' : 'false');
  if (!isDesktop.matches) {
    document.body.style.overflowY = next ? 'hidden' : '';
  }
}

/* ---------- SEARCH INDEX + DROPDOWN ---------- */

let searchIndexPromise;

async function loadSearchIndex() {
  if (!searchIndexPromise) {
    searchIndexPromise = fetch('/query-index.json')
      .then((resp) => (resp.ok ? resp.json() : { data: [] }))
      .then((json) => (Array.isArray(json.data) ? json.data : []))
      .catch((e) => {
        // eslint-disable-next-line no-console
        console.warn('Failed to load search index', e);
        return [];
      });
  }
  return searchIndexPromise;
}

/**
 * Wires up:
 * - search icon in the field
 * - black dropdown with results
 * - navigation on click
 */
function initSearch(nav, form, input) {
  // icon inside the input (uses /icons/search.svg)
  const icon = document.createElement('span');
  icon.className = 'nav-search-icon icon icon-search';
  form.append(icon);

  // dropdown panel
  const results = document.createElement('div');
  results.className = 'nav-search-results';
  nav.append(results);

  const close = document.createElement('button');
  close.type = 'button';
  close.className = 'nav-search-close';
  close.setAttribute('aria-label', 'Close search results');
  close.textContent = '✕';
  results.append(close);

  const list = document.createElement('div');
  list.className = 'nav-search-results-list';
  results.append(list);

  const openResults = () => {
    results.classList.add('is-open');
  };

  const clearResults = () => {
    list.innerHTML = '';
    results.classList.remove('is-open');
  };

  let debounceId;

  input.addEventListener('input', () => {
    const term = input.value.trim();
    if (!term) {
      clearResults();
      return;
    }

    window.clearTimeout(debounceId);
    debounceId = window.setTimeout(async () => {
      const index = await loadSearchIndex();
      const lower = term.toLowerCase();

      const matches = index
        .filter((item) => {
          const title = (item.title || '').toLowerCase();
          const desc = (item.description || '').toLowerCase();
          return title.includes(lower) || desc.includes(lower);
        })
        .slice(0, 8); // top 8 results

      if (!matches.length) {
        clearResults();
        return;
      }

      list.innerHTML = '';
      matches.forEach((item) => {
        const link = document.createElement('a');
        link.href = item.path;          // 🔗 navigation happens by default
        link.textContent = item.title || item.path;
        list.append(link);
      });

      openResults();
    }, 150);
  });

  // clicking the X only hides the dropdown
  close.addEventListener('click', () => {
    clearResults();
  });

  // click outside nav -> close dropdown
  document.addEventListener('click', (evt) => {
    if (!nav.contains(evt.target)) {
      clearResults();
    }
  });

  // we handle navigation via links, so prevent default submit
  form.addEventListener('submit', (evt) => {
    evt.preventDefault();
  });
}

/* ---------- MAIN DECORATE ---------- */

export default async function decorate(block) {
  const navMeta = getMetadata('nav');
  const navPath = navMeta ? new URL(navMeta, window.location).pathname : '/nav';
  const fragment = await loadFragment(navPath);
  const parsedConfig = getNavConfig(fragment);
  const config = parsedConfig.length ? parsedConfig : defaultConfig;

  block.textContent = '';

  const navWrapper = document.createElement('div');
  navWrapper.className = 'nav-wrapper';

  const nav = document.createElement('nav');
  nav.id = 'nav';
  nav.setAttribute('aria-expanded', isDesktop.matches ? 'true' : 'false');

  navWrapper.append(nav);
  block.append(navWrapper);

  const home = config.find((item) => item.label.toLowerCase() === 'home') || config[0];
  const menuItems = config.filter((item) => item !== home);

  const hamburger = document.createElement('div');
  hamburger.className = 'nav-hamburger';
  hamburger.innerHTML = '<button type="button" aria-controls="nav" aria-label="Toggle navigation"><div class="nav-hamburger-icon"></div></button>';
  nav.append(hamburger);

  const brand = document.createElement('div');
  brand.className = 'nav-brand';
  const brandLink = document.createElement('a');
  brandLink.href = home.href;
  brandLink.className = 'nav-logo';
  brandLink.textContent = 'WKND';
  brand.append(brandLink);
  nav.append(brand);

  const sections = document.createElement('div');
  sections.className = 'nav-sections';
  const ul = document.createElement('ul');
  menuItems.forEach(({ label, href, style }) => {
    const li = document.createElement('li');
    if (style === 'secondary') li.classList.add('nav-item--secondary');
    const a = document.createElement('a');
    a.href = href;
    a.textContent = label;
    li.append(a);
    ul.append(li);
  });
  sections.append(ul);
  nav.append(sections);

  const tools = document.createElement('div');
  tools.className = 'nav-tools';
  const form = document.createElement('form');
  form.className = 'nav-search';
  form.setAttribute('role', 'search');
  const input = document.createElement('input');
  input.type = 'search';
  input.name = 'q';
  input.placeholder = 'Search';
  input.setAttribute('aria-label', 'Search');
  form.append(input);
  tools.append(form);
  nav.append(tools);

  // 🔍 wire search dropdown + suggestions:
  initSearch(nav, form, input);

  const button = hamburger.querySelector('button');
  if (button) {
    button.addEventListener('click', () => toggleMenu(nav));
  }

  isDesktop.addEventListener('change', (e) => {
    nav.setAttribute('aria-expanded', e.matches ? 'true' : 'false');
    if (e.matches) document.body.style.overflowY = '';
  });

  // 🔥 finally, mark the active nav item
  markActiveNav(nav);
}

function markActiveNav(nav) {
  const normalize = (path) => {
    if (!path) return '/';
    return path.replace(/\/+$/, '') || '/';
  };

  const current = normalize(window.location.pathname);

  // Consider menu links (right side) and brand link (WKND)
  const links = nav.querySelectorAll('.nav-sections a, .nav-brand a');
  if (!links.length) return;

  let bestLink = null;
  let bestLength = 0;

  links.forEach((link) => {
    try {
      const url = new URL(link.href);
      const linkPath = normalize(url.pathname);

      // Exact match OR current path is under this section (for detail pages)
      if (current === linkPath || current.startsWith(`${linkPath}/`)) {
        if (linkPath.length > bestLength) {
          bestLength = linkPath.length;
          bestLink = link;
        }
      }
    } catch (e) {
      // ignore malformed URLs
    }
  });

  if (bestLink) {
    bestLink.classList.add('is-active');
    const li = bestLink.closest('li');
    if (li) li.classList.add('is-active');
  }
}