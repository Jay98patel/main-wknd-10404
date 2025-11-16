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
  if (rows.length < 2) return null;

  const headerCells = Array.from(rows[0].children);
  const valueCells = Array.from(rows[1].children || []);

  const cfg = {};

  headerCells.forEach((th, idx) => {
    const keyRaw = (th.textContent || '').trim();
    if (!keyRaw) return;

    const key = keyRaw.toLowerCase().replace(/\s+/g, '-'); // "Path Filter" -> "path-filter"
    const valueCell = valueCells[idx];
    const value = valueCell ? (valueCell.textContent || '').trim() : '';

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
  const titleField = cfg['title-field'] || 'title';
  const summaryField = cfg['summary-field'] || 'description';
  const imageField = cfg['image-field'] || 'image';
  const pathField = cfg['path-field'] || 'path';
  const tagField = cfg['tag-field'] || 'category';

  const title = item[titleField] || item.title || '';
  const summary = item[summaryField] || item.description || '';
  const image = item[imageField] || item.image || '';
  const path = item[pathField] || item.path || '';

  let tag = item[tagField] || item.tags || '';
  if (!tag && Array.isArray(item.tags)) {
    tag = item.tags.join(', ');
  }

  return { title, summary, image, path, tag };
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
function renderCards(items, cfg) {
  const grid = el('div', 'content-listing__grid');

  items.forEach((item) => {
    const { title, summary, image, path, tag } = mapFields(item, cfg);
    const card = el('article', 'content-listing__card');
    const href = path || '#';

    if (image) {
      const imgLink = el('a', 'content-listing__image-link', { href });
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
      body.append(el('span', 'content-listing__tag', tag));
    }

    if (title) {
      const h3 = el('h3', 'content-listing__title');
      const link = el('a', 'content-listing__title-link', { href, text: title });
      h3.append(link);
      body.append(h3);
    }

    if (summary) {
      body.append(el('p', 'content-listing__summary', summary));
    }

    card.append(body);
    grid.append(card);
  });

  return grid;
}

/**
 * Main block entry point.
 */
export default async function decorate(block) {
  const cfg = parseConfig(block);
  if (!cfg) return;

  try {
    const rawData = await fetchIndex(cfg);
    const items = applyFilters(rawData, cfg);

    const wrapper = el('div', 'content-listing');

    // layout type hook (currently only "cards")
    const type = (cfg.type || '').toLowerCase();
    if (type) {
      wrapper.classList.add(`content-listing--${type}`);
    }

    const grid = renderCards(items, cfg);
    wrapper.append(grid);

    // Optional CTA button underneath the cards
    const ctaLabel = cfg['cta-label'];
    const ctaUrl = cfg['cta-url'];
    if (ctaLabel && ctaUrl) {
      const footer = el('div', 'content-listing__footer');
      const cta = el('a', 'button primary content-listing__cta', {
        href: ctaUrl,
        text: ctaLabel,
      });
      footer.append(cta);
      wrapper.append(footer);
    }

    clearBlock(block);
    block.append(wrapper);
  } catch (e) {
    // eslint-disable-next-line no-console
    console.error('content-listing error', e);
  }
}
