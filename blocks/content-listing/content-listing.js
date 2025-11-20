import { el, getBlockRows, clearBlock } from '../../scripts/block-utils.js';


function parseConfig(block) {
  const rows = getBlockRows(block);
  const cfg = {};

  if (!rows.length) return cfg;

  const headerRow = rows[0];
  const valueRow = rows[1];

  // 1) Header + value row (multi-column)
  if (
    headerRow
    && valueRow
    && headerRow.children.length === valueRow.children.length
    && headerRow.children.length > 0
  ) {
    const cols = headerRow.children.length;

    for (let i = 0; i < cols; i += 1) {
      const headerText = (headerRow.children[i].textContent || '')
        .trim()
        .toLowerCase()
        .replace(/\s+/g, '-')
        .replace(/[^\w-]/g, '');
      const valueText = (valueRow.children[i].textContent || '').trim();

      if (headerText) {
        cfg[headerText] = valueText;
      }
    }
  }

  // 2) Additional rows as simple key/value pairs (2 columns)
  if (rows.length > 2) {
    rows.slice(2).forEach((row) => {
      if (row.children.length < 2) return;

      const key = (row.children[0].textContent || '')
        .trim()
        .toLowerCase()
        .replace(/\s+/g, '-')
        .replace(/[^\w-]/g, '');
      const value = (row.children[1].textContent || '').trim();

      if (key) {
        cfg[key] = value;
      }
    });
  }

  return cfg;
}

/**
 * Map index item fields to card fields, with sensible fallbacks.
 */
function mapFields(item, cfg) {
  const get = (fieldKey, fallback) => {
    const fieldName = cfg[fieldKey];
    if (fieldName && item[fieldName] != null) return item[fieldName];
    if (fallback && item[fallback] != null) return item[fallback];
    return '';
  };

  return {
    title: get('title-field', 'title'),
    summary: get('summary-field', 'description'),
    image: get('image-field', 'image'),
    path: get('path-field', 'path'),
    tag: get('tag-field', ''),
  };
}

function normalizePathFilter(filter) {
  if (!filter) return null;
  const trimmed = filter.trim();
  if (!trimmed) return null;

  // Allow "/us/en/magazine/*" style filters
  if (trimmed.endsWith('*')) {
    return trimmed.slice(0, -1);
  }
  return trimmed;
}

/**
 * Apply path filter, fixed filter-field / filter-value, sorting and limit.
 */
function sortAndFilter(items, cfg) {
  let result = Array.isArray(items) ? items.slice() : [];

  // Path Filter: support either "Path Filter" or "Path Prefix" headers
  const rawPrefix = cfg['path-prefix'] || cfg['path-filter'];
  const pathPrefix = normalizePathFilter(rawPrefix);

  if (pathPrefix) {
    result = result.filter((item) => (item.path || '').startsWith(pathPrefix));
  }

  // Optional fixed filter: filter-field + filter-value
  const filterField = cfg['filter-field'];
  const filterValue = cfg['filter-value'];
  if (filterField && filterValue) {
    const wanted = filterValue.toLowerCase();
    result = result.filter((item) => {
      const raw = item[filterField];
      if (!raw) return false;
      if (Array.isArray(raw)) {
        return raw.some((v) => String(v).toLowerCase() === wanted);
      }
      return String(raw).toLowerCase() === wanted;
    });
  }

  // Sorting: "newest" or "title" (case-insensitive)
  const sort = (cfg.sort || cfg['sort-by'] || '').toLowerCase();
  if (sort === 'newest') {
    result.sort((a, b) => {
      const ad = a.lastModified || a['last-modified'] || a.date || '';
      const bd = b.lastModified || b['last-modified'] || b.date || '';
      if (bd > ad) return 1;
      if (bd < ad) return -1;
      return 0;
    });
  } else if (sort === 'title' || sort === 'name' || sort === 'alpha') {
    result.sort((a, b) => {
      const at = (a.title || '').toLowerCase();
      const bt = (b.title || '').toLowerCase();
      if (at < bt) return -1;
      if (at > bt) return 1;
      return 0;
    });
  }

  // Limit
  const limit = parseInt(cfg.limit, 10);
  if (!Number.isNaN(limit) && limit > 0) {
    result = result.slice(0, limit);
  }

  return result;
}

/**
 * Fetch JSON data (query-index or spreadsheet JSON).
 *
 * If you ever add `json-path` in a key/value row, it will override the default.
 */
async function fetchJson(cfg) {
  const url = cfg['json-path'] || '/query-index.json';
  const resp = await fetch(url);
  if (!resp.ok) throw new Error(`Failed to fetch listing: ${resp.status}`);
  const payload = await resp.json();
  if (Array.isArray(payload.data)) return payload.data;
  return [];
}

/**
 * Render the cards grid into host.
 */
function renderCards(host, items, cfg) {
  host.innerHTML = '';

  const grid = el('div', 'content-listing__grid');

  items.forEach((raw) => {
    console.log(raw)
    const {
      title, summary, image, path, tag,
    } = mapFields(raw, cfg);
    if (!title && !summary && !image) return;
    const card = el('article', 'content-listing__card');
    const linkHref = path || '#';

    // Image
    if (image) {
      const imgLink = el('a', 'content-listing__image-link');
      imgLink.href = linkHref;

      const img = el('img', 'content-listing__image');
      img.src = image;
      img.alt = title || '';
      img.loading = 'lazy';

      imgLink.append(img);
      card.append(imgLink);
    }

    // Body
    const body = el('div', 'content-listing__body');

    if (tag) {
      const badge = el('span', 'content-listing__tag');
      badge.textContent = tag;
      body.append(badge);
    }

    if (title) {
      const h3 = el('h3', 'content-listing__title');
      const link = el('a', 'content-listing__title-link');
      link.href = linkHref;
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
    grid.append(card);
  });

  host.append(grid);
}

/**
 * Build filter tabs (used for Adventures categories).
 */
function buildFilters(allItems, filterField, onChange) {
  const valueSet = new Set();

  allItems.forEach((item) => {
    const v = item[filterField];
    if (!v) return;

    if (Array.isArray(v)) {
      v.forEach((val) => valueSet.add(String(val)));
    } else {
      valueSet.add(String(v));
    }
  });

  const values = Array.from(valueSet);
  if (!values.length) return null;

  values.sort((a, b) => a.localeCompare(b));

  const container = el('div', 'content-listing__filters');
  const list = el('div', 'content-listing__filter-list');

  let active = '__all__';

  const makeButton = (value, label) => {
    const btn = el('button', 'content-listing__filter');
    btn.type = 'button';
    btn.textContent = label;

    if (value === active) {
      btn.classList.add('content-listing__filter--active');
    }

    btn.addEventListener('click', () => {
      if (active === value) return;

      active = value;
      list.querySelectorAll('.content-listing__filter')
        .forEach((b) => b.classList.remove('content-listing__filter--active'));
      btn.classList.add('content-listing__filter--active');

      const selected = value === '__all__' ? null : value;
      onChange(selected);
    });

    return btn;
  };

  // "All"
  list.append(makeButton('__all__', 'All'));

  // Category buttons
  values.forEach((value) => {
    list.append(makeButton(value, value));
  });

  container.append(list);
  return container;
}

/**
 * Main decorate.
 */
export default async function decorate(block) {
  const cfg = parseConfig(block);

  try {
    const rawData = await fetchJson(cfg);
    const allItems = sortAndFilter(rawData, cfg);

    const container = el('div', 'content-listing');
    const filtersHost = el('div', 'content-listing__filters-host');
    const cardsHost = el('div', 'content-listing__cards-host');

    container.append(filtersHost, cardsHost);

    // Optional CTA (bottom-right link)
    const ctaLabel = cfg['cta-label'];
    const ctaUrl = cfg['cta-url'];
    if (ctaLabel && ctaUrl) {
      const footer = el('div', 'content-listing__footer');
      const cta = el('a', 'content-listing__cta button primary');
      cta.href = ctaUrl;
      cta.textContent = ctaLabel;
      footer.append(cta);
      container.append(footer);
    }

    clearBlock(block);
    block.append(container);

    const filterField = cfg['filter-field'];
    const enableFilters = (cfg['enable-filters'] || '').toLowerCase() === 'true';

    const applyFilterAndRender = (value) => {
      let itemsToRender = allItems;
      if (filterField && value) {
        itemsToRender = allItems.filter(
          (item) => `${item[filterField]}` === value,
        );
      }
      renderCards(cardsHost, itemsToRender, cfg);
    };

    // Only adventures listing uses enable-filters = true
    if (filterField && enableFilters) {
      const filtersEl = buildFilters(allItems, filterField, applyFilterAndRender);
      if (filtersEl) {
        filtersHost.append(filtersEl);
      }
    }

    // Initial render (All)
    applyFilterAndRender(null);
  } catch (e) {
    // eslint-disable-next-line no-console
    console.error('content-listing error', e);
  }
}
