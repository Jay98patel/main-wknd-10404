import { el, getBlockRows, clearBlock } from '../../scripts/block-utils.js';

function applyVariantDefaults(cfg) {
  const variant = (cfg.variant || '').toLowerCase();
  if (!variant) return cfg;

  const isMagazine = variant.includes('magazine');
  const isAdventure = variant.includes('adventure');

  if (!cfg['path-prefix']) {
    if (isMagazine) cfg['path-prefix'] = '/us/en/magazine/';
    if (isAdventure) cfg['path-prefix'] = '/us/en/adventures/';
  }

  if (isAdventure) {
    if (!cfg['filter-field']) cfg['filter-field'] = 'category';
    if (!cfg['enable-filters']) cfg['enable-filters'] = 'true';
  }

  return cfg;
}

function slugKey(text) {
  return (text || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^\w-]/g, '');
}

function pickVariant(block, rows, cfg) {
  let resultRows = rows;

  if (rows.length) {
    const firstRow = rows[0];
    if (firstRow && firstRow.children.length >= 1) {
      const raw = (firstRow.children[0].textContent || '').trim().toLowerCase();
      const match = raw.match(/^content-listing\s*\(([^)]+)\)/);
      if (match) {
        cfg.variant = match[1].trim().toLowerCase();
        resultRows = rows.slice(1);
      }
    }
  }

  if (!cfg.variant) {
    const { blockName } = block.dataset || {};
    const bn = (blockName || 'content-listing').toLowerCase();
    const variantClass = Array.from(block.classList).find(
      (cls) => cls.toLowerCase() !== bn && cls !== 'block',
    );
    if (variantClass) {
      cfg.variant = variantClass.toLowerCase();
    }
  }

  return resultRows;
}

function parseConfig(block) {
  const cfg = {};
  let rows = getBlockRows(block);
  if (!rows.length) return cfg;

  rows = pickVariant(block, rows, cfg);
  if (!rows.length) return applyVariantDefaults(cfg);

  const headerRow = rows[0];
  const valueRow = rows[1];

  const isSimpleKeyValueHeader =
    headerRow
    && headerRow.children.length === 2
    && slugKey(headerRow.children[0].textContent) === 'key'
    && slugKey(headerRow.children[1].textContent) === 'value';

  let startIndex = 0;

  if (
    !isSimpleKeyValueHeader
    && headerRow
    && valueRow
    && headerRow.children.length === valueRow.children.length
    && headerRow.children.length > 0
  ) {
    const cols = headerRow.children.length;
    for (let i = 0; i < cols; i += 1) {
      const headerText = slugKey(headerRow.children[i].textContent || '');
      const valueText = (valueRow.children[i].textContent || '').trim();
      if (headerText) cfg[headerText] = valueText;
    }
    startIndex = 2;
  } else if (isSimpleKeyValueHeader) {
    startIndex = 1;
  }

  if (rows.length > startIndex) {
    rows.slice(startIndex).forEach((row) => {
      if (row.children.length < 2) return;
      const key = slugKey(row.children[0].textContent || '');
      const value = (row.children[1].textContent || '').trim();
      if (key) cfg[key] = value;
    });
  }

  return applyVariantDefaults(cfg);
}

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
  if (trimmed.endsWith('*')) return trimmed.slice(0, -1);
  return trimmed;
}

function sortAndFilter(items, cfg) {
  let result = Array.isArray(items) ? items.slice() : [];

  const rawPrefix = cfg['path-prefix'] || cfg['path-filter'];
  const pathPrefix = normalizePathFilter(rawPrefix);

  if (pathPrefix) {
    result = result.filter((item) => (item.path || '').startsWith(pathPrefix));
  }

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

  const sortKeyRaw = (cfg.sort || cfg['sort-by'] || '').toLowerCase();
  const sortDirRaw = (cfg['sort-direction'] || '').toLowerCase();
  const dir = sortDirRaw === 'asc' ? 1 : -1;

  if (sortKeyRaw === 'newest' || sortKeyRaw === 'publishdate' || sortKeyRaw === 'date') {
    result.sort((a, b) => {
      const ad = a.publishDate || a.lastModified || a['last-modified'] || a.date || '';
      const bd = b.publishDate || b.lastModified || b['last-modified'] || b.date || '';
      if (ad === bd) return 0;
      return ad > bd ? dir : -dir;
    });
  } else if (sortKeyRaw === 'title' || sortKeyRaw === 'name' || sortKeyRaw === 'alpha') {
    result.sort((a, b) => {
      const at = (a.title || '').toLowerCase();
      const bt = (b.title || '').toLowerCase();
      if (at === bt) return 0;
      return at < bt ? -1 : 1;
    });
  }

  const limit = parseInt(cfg.limit, 10);
  if (!Number.isNaN(limit) && limit > 0) {
    result = result.slice(0, limit);
  }

  return result;
}

async function fetchJson(cfg) {
  const url = cfg['json-path'] || '/query-index.json';
  const resp = await fetch(url);
  if (!resp.ok) throw new Error(`Failed to fetch listing: ${resp.status}`);
  const payload = await resp.json();
  if (Array.isArray(payload.data)) return payload.data;
  return [];
}

function renderCards(host, items, cfg) {
  host.innerHTML = '';

  const grid = el('div', 'content-listing__grid');

  items.forEach((raw) => {
    const {
      title, summary, image, path, tag,
    } = mapFields(raw, cfg);
    if (!title && !summary && !image) return;

    const card = el('article', 'content-listing__card');
    const linkHref = path || '#';

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

  list.append(makeButton('__all__', 'All'));

  values.forEach((value) => {
    list.append(makeButton(value, value));
  });

  container.append(list);
  return container;
}

export default async function decorate(block) {
  const cfg = parseConfig(block);

  const pathPrefix = (cfg['path-prefix'] || '').toLowerCase();
  const isMagazinePath = pathPrefix.startsWith('/us/en/magazine');
  const isAdventurePath = pathPrefix.startsWith('/us/en/adventures');

  const hasNonVariantConfig = Object.keys(cfg).some((key) => key !== 'variant');
  console.log('hasNonVariantConfig', hasNonVariantConfig);
  if (
    !cfg.variant
    && (
      !hasNonVariantConfig         
      || isMagazinePath
      || isAdventurePath        
    )
  ) {
    clearBlock(block);
    const empty = el('p', 'content-listing__empty', 'No data found.');
    block.append(empty);
    return;
  }

  try {
    const rawData = await fetchJson(cfg);
    const allItems = sortAndFilter(rawData, cfg);

    const container = el('div', 'content-listing');
    const filtersHost = el('div', 'content-listing__filters-host');
    const cardsHost = el('div', 'content-listing__cards-host');

    container.append(filtersHost, cardsHost);

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

    if (filterField && enableFilters) {
      const filtersEl = buildFilters(allItems, filterField, applyFilterAndRender);
      if (filtersEl) {
        filtersHost.append(filtersEl);
      }
    }

    applyFilterAndRender(null);
  } catch (e) {
    console.error('content-listing error', e);
  }
}

