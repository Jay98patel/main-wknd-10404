import { el, getBlockRows, clearBlock } from '../../scripts/block-utils.js';

/**
 * Parse config from a content-listing block.
 * Expects:
 *  Row 1: block name (handled by getBlockRows)
 *  Row 2: header cells  (e.g. "Source", "Path Filter", "Limit", ...)
 *  Row 3: value cells   (e.g. "magazine", "/us/en/magazine/*", "4", ...)
 *
 * We slug the header text => "Path Filter" -> "path-filter"
 */
function parseConfig(block) {
  const rows = getBlockRows(block);
  const cfg = {};

  rows.forEach((row) => {
    const [keyCell, valueCell] = row.children;
    if (!keyCell || !valueCell) return;
    const key = (keyCell.textContent || '').trim().toLowerCase();
    const value = (valueCell.textContent || '').trim();
    if (!key) return;
    cfg[key] = value;
  });

  return cfg;
}

function normalizePathFilter(filter) {
  if (!filter) return null;
  const trimmed = filter.trim();
  if (!trimmed) return null;

  if (trimmed.endsWith('*')) {
    return trimmed.slice(0, -1); // "/us/en/magazine/*" -> "/us/en/magazine/"
  }

  return trimmed;
}

/**
 * Map index item fields to card fields, with fallbacks.
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

/**
 * Apply path filter, tag filters, sorting and limit.
 */
function applyFilters(items, cfg) {
  let result = Array.isArray(items) ? items.slice() : [];

  // Path Filter (e.g. "/us/en/magazine/*")
  const pathPrefix = normalizePathFilter(cfg['path-filter']);
  if (pathPrefix) {
    result = result.filter((item) => (item.path || '').startsWith(pathPrefix));
  }

  // Filter Field + Filter Value (used later for adventure category filters)
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

  // "Filters" = tag-style filters (e.g. "members-only")
  const filters = cfg.filters;
  if (!filterField && filters) {
    const tokens = filters
      .split(',')
      .map((t) => t.trim().toLowerCase())
      .filter(Boolean);

    if (tokens.length) {
      result = result.filter((item) => {
        const tagsRaw = item.tags || item.category || '';
        let values = [];

        if (Array.isArray(tagsRaw)) {
          values = tagsRaw.map((v) => String(v).toLowerCase());
        } else if (typeof tagsRaw === 'string') {
          values = tagsRaw.toLowerCase().split(/[,\s]+/);
        }

        if (!values.length) return false;
        return tokens.some((token) => values.includes(token));
      });
    }
  }

  // Sort
  const sort = (cfg.sort || '').toLowerCase();
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
 * Fetch index data.
 * - If "json-path" is provided, use that.
 * - Else, if "source" is set, try `/query-index-{source}.json`, then fallback to `/query-index.json`.
 * - Else, use `/query-index.json`.
 */
async function fetchIndex(cfg) {
  const explicitJson = cfg['json-path'];
  const source = (cfg.source || '').toLowerCase();

  const candidates = [];
  if (explicitJson) candidates.push(explicitJson);

  if (source && source !== 'pages' && source !== 'default') {
    // e.g. "magazine" -> "/query-index-magazine.json"
    candidates.push(`/query-index-${source}.json`);
  }

  // always fallback to the default index
  candidates.push('/query-index.json');

  const tried = new Set();

  // Try candidates in order, first one that returns .data[] wins
  // eslint-disable-next-line no-restricted-syntax
  for (const path of candidates) {
    if (!path || tried.has(path)) continue;
    tried.add(path);

    try {
      // eslint-disable-next-line no-await-in-loop
      const resp = await fetch(path);
      if (!resp.ok) continue;

      // eslint-disable-next-line no-await-in-loop
      const json = await resp.json();
      if (Array.isArray(json.data)) {
        return json.data;
      }
    } catch (e) {
      // ignore and try next candidate
      // eslint-disable-next-line no-console
      console.warn('content-listing: index fetch failed for', path, e);
    }
  }

  return [];
}

/**
 * Render cards layout.
 */
function renderCards(host, items, cfg) {
  host.innerHTML = '';

  const grid = el('div', 'content-listing__grid');

  items.forEach((raw) => {
    const { title, summary, image, path, tag } = mapFields(raw, cfg);

    const card = el('article', 'content-listing__card');
    const linkHref = path || '#';

    // image
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

    // body
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

function sortAndFilter(data, cfg) {
  let items = Array.isArray(data) ? data.slice() : [];

  // Narrow to adventures, magazine, etc.
  const pathPrefix = cfg['path-prefix'];
  if (pathPrefix) {
    items = items.filter((item) => (item.path || '').startsWith(pathPrefix));
  }

  // Optional fixed filter: filter-field + filter-value
  const filterField = cfg['filter-field'];
  const filterValue = cfg['filter-value'];
  if (filterField && filterValue) {
    items = items.filter((item) => `${item[filterField]}` === filterValue);
  }

  // Sorting
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

  // Limit
  const limit = parseInt(cfg.limit, 10);
  if (!Number.isNaN(limit) && limit > 0) {
    items = items.slice(0, limit);
  }

  return items;
}

/**
 * Fetch JSON data (query-index or spreadsheet JSON).
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
 * Build interactive filters (tabs) for adventures.
 *
 * @param {Array<object>} allItems
 * @param {string} filterField
 * @param {(value: string|null) => void} onChange
 */
function buildFilters(allItems, filterField, onChange) {
  const valueSet = new Set();

  allItems.forEach((item) => {
    const v = item[filterField];
    if (v) valueSet.add(v);
  });

  const values = Array.from(valueSet);
  if (!values.length) return null;

  // Sort alphabetically for stable order
  values.sort((a, b) => String(a).localeCompare(String(b)));

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
      // update visual state
      list.querySelectorAll('.content-listing__filter')
        .forEach((elBtn) => elBtn.classList.remove('content-listing__filter--active'));
      btn.classList.add('content-listing__filter--active');

      const selected = value === '__all__' ? null : value;
      onChange(selected);
    });

    return btn;
  };

  // "All" button
  const allBtn = makeButton('__all__', 'All');
  list.append(allBtn);

  // Category buttons
  values.forEach((value) => {
    const label = value; // could be mapped if you add custom labels later
    const btn = makeButton(value, label);
    list.append(btn);
  });

  container.append(list);
  return container;
}


/**
 * Main decorate entry.
 */
export default async function decorate(block) {
  const cfg = parseConfig(block);

  try {
    const rawData = await fetchJson(cfg);
    const allItems = sortAndFilter(rawData, cfg);

    // Outer container
    const container = el('div', 'content-listing');
    const filtersHost = el('div', 'content-listing__filters-host');
    const cardsHost = el('div', 'content-listing__cards-host');

    container.append(filtersHost, cardsHost);
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

    // Only Adventures listing has enable-filters = true
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