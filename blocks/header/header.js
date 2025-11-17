import { getMetadata } from '../../scripts/aem.js';
import { loadFragment } from '../fragment/fragment.js';

const isDesktop = window.matchMedia('(min-width: 900px)');

const defaultConfig = [
  { label: 'Home', href: '/us/en/home', style: 'primary' },
  { label: 'Magazine', href: '/us/en/magazine', style: 'primary' },
  { label: 'Adventures', href: '/us/en/adventures', style: 'primary' },
  { label: 'About', href: '/us/en/about', style: 'primary' },
  { label: 'FAQs', href: '/us/en/faqs', style: 'secondary' },
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
  hamburger.innerHTML = '<button type="button" aria-controls="nav" aria-label="Toggle navigation"><span class="nav-hamburger-icon"></span></button>';
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

  const button = hamburger.querySelector('button');
  if (button) {
    button.addEventListener('click', () => toggleMenu(nav));
  }

  isDesktop.addEventListener('change', (e) => {
    nav.setAttribute('aria-expanded', e.matches ? 'true' : 'false');
    if (e.matches) document.body.style.overflowY = '';
  });
}
