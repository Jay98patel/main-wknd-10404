import { el, getBlockRows, clearBlock } from '../../scripts/block-utils.js';

function parseConfig(block) {
  const rows = getBlockRows(block); // key/value rows
  const cfg = {};

  rows.forEach((row) => {
    const [keyCell, valueCell] = row.children;
    if (!keyCell || !valueCell) return;
    const key = keyCell.textContent.trim().toLowerCase(); // normalize
    const value = valueCell.textContent.trim();
    if (!key) return;
    cfg[key] = value;
  });

  return cfg;
}

function mapFields(item, cfg) {
  const get = (fieldKey, fallback) =>
    item[cfg[fieldKey]] ?? item[fallback] ?? '';

  return {
    title: get('title-field', 'title'),
    summary: get('summary-field', 'description'),
    image: get('image-field', 'image'),
    path: get('path-field', 'path'),
    tag: get('tag-field', ''),
  };
}

function renderCards(items, cfg) {
  const root = el('div', 'content-listing__grid');

  items.forEach((raw) => {
    const { title, summary, image, path, tag } = mapFields(raw, cfg);

    const card = el('article', 'content-listing__card');
    const linkHref = path || '#';

    if (image) {
      const imgLink = el('a', 'content-listing__image-link', { href: linkHref });
      const img = el('img', 'content-listing__image', {
        src: image,
        alt: title || '',
        loading: 'lazy',
      });
      imgLink.append(img);
      card.append(imgLink);
    }

    const body = el('div', 'content-listing__body');

    if (tag) {
      const badge = el('span', 'content-listing__tag');
      badge.textContent = tag;
      body.append(badge);
    }

    if (title) {
      const h3 = el('h3', 'content-listing__title');
      const link = el('a', 'content-listing__title-link', { href: linkHref });
      link.textContent = title;
      h3.append(link);
      body.append(h3);
    }

    if (summary) {
      const p = el('p', 'content-listing__summary');
      p.textContent = summary;
      body.append(p);
    }

    card.append(body);
    root.append(card);
  });

  return root;
}

function sortAndFilter(data, cfg) {
  let items = Array.isArray(data) ? data.slice() : [];

  const pathPrefix = cfg['path-prefix'];
  if (pathPrefix) {
    items = items.filter((item) => (item.path || '').startsWith(pathPrefix));
  }

  const filterField = cfg['filter-field'];
  const filterValue = cfg['filter-value'];
  if (filterField && filterValue) {
    items = items.filter((item) => `${item[filterField]}` === filterValue);
  }

  const sortBy = cfg['sort-by'];
  if (sortBy) {
    const direction = (cfg['sort-direction'] || 'asc').toLowerCase();
    items.sort((a, b) => {
      const av = a[sortBy];
      const bv = b[sortBy];
      if (av === bv) return 0;
      if (av == null) return 1;
      if (bv == null) return -1;
      if (direction === 'desc') return av < bv ? 1 : -1;
      return av > bv ? 1 : -1;
    });
  }

  const limit = parseInt(cfg.limit, 10);
  if (!Number.isNaN(limit) && limit > 0) {
    items = items.slice(0, limit);
  }

  return items;
}

async function fetchJson(cfg) {
  const url = cfg['json-path'] || '/query-index.json';
  const resp = await fetch(url);
  if (!resp.ok) throw new Error(`Failed to fetch listing: ${resp.status}`);
  const payload = await resp.json();

  // Spreadsheets & query-index both expose data under .data
  if (Array.isArray(payload.data)) {
    return payload.data;
  }
  return [];
}

export default async function decorate(block) {
  const cfg = parseConfig(block);

  try {
    const rawData = await fetchJson(cfg);
    const items = sortAndFilter(rawData, cfg);

    const container = el('div', 'content-listing');
    const cards = renderCards(items, cfg);
    container.append(cards);

    clearBlock(block);
    block.append(container);
  } catch (e) {
    // Fail gracefully, leave authoring view visible in preview
    // eslint-disable-next-line no-console
    console.error('content-listing error', e);
  }
}
