import { getMetadata } from '../../scripts/aem.js';
import { getBlockRows, getCellText } from '../../scripts/block-utils.js';
import { loadFragment } from '../fragment/fragment.js';

const isDesktop = window.matchMedia('(min-width: 900px)');

const defaultConfig = [
  { label: 'Home', href: '/us/en/home', style: 'primary' },
  { label: 'Magazine', href: '/us/en/magazine', style: 'primary' },
  { label: 'Adventures', href: '/us/en/adventures', style: 'primary' },
  { label: 'FAQs', href: '/us/en/faqs', style: 'primary' },
  { label: 'About Us', href: '/us/en/about-us', style: 'primary' },
];

function buildLogoFromBlockRow(row) {
  const cell = row.children[1];
  if (!cell) return null;
  const img = cell.querySelector('img');
  if (img && img.src) {
    return { type: 'image', src: img.src, alt: img.alt || '' };
  }
  const text = getCellText(row, 1);
  if (text) return { type: 'text', value: text };
  return null;
}

function buildLogoFromTableRow(row) {
  const cell = row.cells[1];
  if (!cell) return null;
  const img = cell.querySelector('img');
  if (img && img.src) {
    return { type: 'image', src: img.src, alt: img.alt || '' };
  }
  const text = (cell.textContent || '').trim();
  if (text) return { type: 'text', value: text };
  return null;
}

function parseNavFromBlock(fragment) {
  const navBlock = fragment && fragment.querySelector('.nav.block, .nav');
  if (!navBlock) return { config: [], logo: null };

  const rows = getBlockRows(navBlock);
  let logo = null;
  const menuRows = [];

  rows.forEach((row) => {
    const key = getCellText(row, 0).toLowerCase();
    if (!key) return;

    if (key === 'brand-logo') {
      const detected = buildLogoFromBlockRow(row);
      if (detected) logo = detected;
      return;
    }

    if (key === 'image-logo') {
      const detected = buildLogoFromBlockRow(row);
      if (detected) logo = detected;
      return;
    }

    if (key === 'text-logo') {
      const value = getCellText(row, 1);
      if (value) logo = { type: 'text', value };
      return;
    }

    const second = getCellText(row, 1).toLowerCase();
    if (key === 'nav' && second === 'label') {
      return;
    }

    const label = getCellText(row, 0);
    const href = getCellText(row, 1);
    const style = getCellText(row, 2) || 'primary';

    if (label && href) {
      menuRows.push({ label, href, style });
    }
  });

  return { config: menuRows, logo };
}

function parseNavFromTable(fragment) {
  if (!fragment) return { config: [], logo: null };
  const tables = Array.from(fragment.querySelectorAll('table'));
  const navTable = tables.find((tbl) => {
    const firstRow = tbl.rows[0];
    const firstCell = firstRow && firstRow.cells[0];
    return firstCell && firstCell.textContent.trim().toLowerCase() === 'nav';
  });
  if (!navTable) return { config: [], logo: null };

  const rows = Array.from(navTable.rows).slice(1);
  let logo = null;
  const menuRows = [];

  rows.forEach((row) => {
    const cells = Array.from(row.cells).map((c) => (c.textContent || '').trim());
    const first = (cells[0] || '').toLowerCase();
    const second = (cells[1] || '').toLowerCase();

    if (first === 'brand-logo') {
      const detected = buildLogoFromTableRow(row);
      if (detected) logo = detected;
      return;
    }

    if (first === 'image-logo') {
      const detected = buildLogoFromTableRow(row);
      if (detected) logo = detected;
      return;
    }

    if (first === 'text-logo') {
      const value = cells[1] || '';
      if (value) logo = { type: 'text', value };
      return;
    }

    if (first === 'nav' && second === 'label') {
      return;
    }

    if (cells.length >= 2) {
      const [label, href, style] = cells;
      if (label && href) {
        menuRows.push({ label, href, style: style || 'primary' });
      }
    }
  });

  return { config: menuRows, logo };
}

function getNavConfig(fragment) {
  if (!fragment) return { config: [], logo: null };
  const fromBlock = parseNavFromBlock(fragment);
  if (fromBlock.config.length || fromBlock.logo) return fromBlock;
  return parseNavFromTable(fragment);
}

function toggleMenu(nav) {
  const open = nav.getAttribute('aria-expanded') === 'true';
  const next = !open;
  nav.setAttribute('aria-expanded', next ? 'true' : 'false');
  if (!isDesktop.matches) document.body.style.overflowY = next ? 'hidden' : '';
}

let searchIndexPromise;

async function loadSearchIndex() {
  if (!searchIndexPromise) {
    searchIndexPromise = fetch('/query-index.json')
      .then((resp) => (resp.ok ? resp.json() : { data: [] }))
      .then((json) => (Array.isArray(json.data) ? json.data : []))
      .catch(() => []);
  }
  return searchIndexPromise;
}

function initSearch(nav, form, input) {
  const icon = document.createElement('span');
  icon.className = 'nav-search-icon icon icon-search';
  form.append(icon);

  const results = document.createElement('div');
  results.className = 'nav-search-results';
  nav.append(results);

  const close = document.createElement('button');
  close.type = 'button';
  close.className = 'nav-search-close';
  close.textContent = '✕';
  results.append(close);

  const list = document.createElement('div');
  list.className = 'nav-search-results-list';
  results.append(list);

  const openResults = () => results.classList.add('is-open');
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
        .slice(0, 8);
      if (!matches.length) {
        clearResults();
        return;
      }
      list.innerHTML = '';
      matches.forEach((item) => {
        const link = document.createElement('a');
        link.href = item.path;
        link.textContent = item.title || item.path;
        list.append(link);
      });
      openResults();
    }, 150);
  });

  close.addEventListener('click', () => clearResults());
  document.addEventListener('click', (evt) => {
    if (!nav.contains(evt.target)) clearResults();
  });
  form.addEventListener('submit', (evt) => evt.preventDefault());
}

export default async function decorate(block) {
  const navMeta = getMetadata('nav');
  const navPath = navMeta ? new URL(navMeta, window.location).pathname : '/nav';
  const fragment = await loadFragment(navPath);

  const { config: parsedConfig, logo } = getNavConfig(fragment);
  const config = parsedConfig.length ? parsedConfig : defaultConfig;

  block.textContent = '';

  const navWrapper = document.createElement('div');
  navWrapper.className = 'nav-wrapper';

  const nav = document.createElement('nav');
  nav.id = 'nav';
  nav.setAttribute('aria-expanded', isDesktop.matches ? 'true' : 'false');

  navWrapper.append(nav);
  block.append(navWrapper);

  const home = config.find((i) => i.label.toLowerCase() === 'home') || config[0];
  const menuItems = config.filter((i) => i !== home);

  const hamburger = document.createElement('div');
  hamburger.className = 'nav-hamburger';
  hamburger.innerHTML = '<button type="button" aria-controls="nav"><div class="nav-hamburger-icon"></div></button>';
  nav.append(hamburger);

  const brand = document.createElement('div');
  brand.className = 'nav-brand';
  const brandLink = document.createElement('a');
  brandLink.href = home.href;
  brandLink.className = 'nav-logo';

  if (logo && logo.type === 'image') {
    const img = document.createElement('img');
    img.src = logo.src;
    img.alt = logo.alt || '';
    img.loading = 'lazy';
    brandLink.append(img);
  } else if (logo && logo.type === 'text') {
    brandLink.textContent = logo.value;
  } else {
    brandLink.textContent = 'WKND';
  }

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
  form.append(input);
  tools.append(form);
  nav.append(tools);

  initSearch(nav, form, input);

  const button = hamburger.querySelector('button');
  if (button) button.addEventListener('click', () => toggleMenu(nav));

  isDesktop.addEventListener('change', (e) => {
    nav.setAttribute('aria-expanded', e.matches ? 'true' : 'false');
    if (e.matches) document.body.style.overflowY = '';
  });

  markActiveNav(nav);
}

function markActiveNav(nav) {
  const normalize = (path) => path.replace(/\/+$/, '') || '/';
  const current = normalize(window.location.pathname);
  const links = nav.querySelectorAll('.nav-sections a, .nav-brand a');
  let bestLink = null;
  let bestLength = 0;

  links.forEach((link) => {
    try {
      const url = new URL(link.href);
      const linkPath = normalize(url.pathname);
      if (current === linkPath || current.startsWith(`${linkPath}/`)) {
        if (linkPath.length > bestLength) {
          bestLength = linkPath.length;
          bestLink = link;
        }
      }
    } catch {}
  });

  if (bestLink) {
    bestLink.classList.add('is-active');
    const li = bestLink.closest('li');
    if (li) li.classList.add('is-active');
  }
}
