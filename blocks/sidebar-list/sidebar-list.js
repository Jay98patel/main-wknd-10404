// blocks/sidebar-list/sidebar-list.js
import {
  getBlockRows,
  clearBlock,
  el,
} from '../../scripts/block-utils.js';

function normalize(text) {
  return (text || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^\w-]/g, '');
}

/**
 * Decide which variant we are in and which columns to use.
 * - "related" => Title / Date / Path (magazine right rail)
 * - "facts"   => Label / Value (adventure details)
 */
function detectMode(headerRow) {
  const cells = Array.from(headerRow.children);
  const map = {};

  cells.forEach((cell, index) => {
    const key = normalize(cell.textContent);
    if (key) map[key] = index;
  });

  // 3-col "related articles" mode
  if (map.title != null || map.name != null) {
    return {
      mode: 'related',
      cols: {
        title: map.title ?? map.name ?? 0,
        date: map.date ?? map.published ?? map['published-date'] ?? 1,
        path: map.path ?? map.link ?? 2,
      },
    };
  }

  // 2-col "facts" mode
  if ((map.label != null || map.name != null)
    && (map.value != null || map.detail != null)) {
    return {
      mode: 'facts',
      cols: {
        label: map.label ?? map.name ?? 0,
        value: map.value ?? map.detail ?? 1,
      },
    };
  }

  // Fallback: treat as facts, first two columns
  return {
    mode: 'facts',
    cols: { label: 0, value: 1 },
  };
}

export default function decorate(block) {
  const rows = getBlockRows(block);
  if (!rows.length) return;

  const headerRow = rows[0];
  const dataRows = rows.slice(1);
  if (!dataRows.length) return;

  const { mode, cols } = detectMode(headerRow);

  clearBlock(block); // remove original table
  block.classList.add(`sidebar-list--${mode}`);

  if (mode === 'related') {
    // ------- Related articles (magazine) -------
    const list = el('ul', 'sidebar-list__items');

    dataRows.forEach((row) => {
      const cells = row.children;
      const title = (cells[cols.title]?.textContent || '').trim();
      const date = (cells[cols.date]?.textContent || '').trim();
      const path = (cells[cols.path]?.textContent || '').trim();

      if (!title) return;

      const item = el('li', 'sidebar-list__item');

      const titleBox = el('div', 'sidebar-list__title');
      const link = el('a', 'sidebar-list__title-link', {
        href: path || '#',
        text: title,
      });
      titleBox.append(link);
      item.append(titleBox);

      if (date) {
        const meta = el('div', 'sidebar-list__meta', date);
        item.append(meta);
      }

      list.append(item);
    });

    block.append(list);
    return;
  }

  // ------- Facts (adventure details) -------
  const wrapper = el('div', 'sidebar-list__facts');

  dataRows.forEach((row) => {
    const cells = row.children;
    const label = (cells[cols.label]?.textContent || '').trim();
    const value = (cells[cols.value]?.textContent || '').trim();
    if (!label && !value) return;

    const fact = el('div', 'sidebar-list__fact');
    const labelEl = el('div', 'sidebar-list__label', label);
    const valueEl = el('div', 'sidebar-list__value', value);

    fact.append(labelEl, valueEl);
    wrapper.append(fact);
  });

  block.append(wrapper);
}
