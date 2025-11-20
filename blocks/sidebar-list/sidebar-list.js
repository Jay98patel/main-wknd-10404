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
  const map = {};
  Array.from(headerRow.cells).forEach((cell, index) => {
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

  // Fallback: simple 2-col facts
  return { mode: 'facts', cols: { label: 0, value: 1 } };
}

/**
 * Make sure sidebar-list.css is loaded (needed because we are
 * creating the block *after* loadBlock has already run).
 */
function ensureSidebarListCSS() {
  const base = (window.hlx && window.hlx.codeBasePath) || '';
  const href = `${base}/blocks/sidebar-list/sidebar-list.css`;

  if (!document.querySelector(`head > link[href="${href}"]`)) {
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = href;
    document.head.append(link);
  }
}

/**
 * Scan a root element for "sidebar-list" tables and replace them
 * with proper sidebar-list block markup.
 * This is what scripts.js calls after loadSections().
 */
export function initSidebarLists(root = document) {
  ensureSidebarListCSS();

  const tables = root.querySelectorAll('table');

  tables.forEach((table) => {
    const rows = table.rows;
    if (!rows || rows.length < 2) return;

    const firstRow = rows[0];
    const firstCell = firstRow.cells[0];
    if (!firstCell) return;

    // Only touch tables whose first row first cell = "sidebar-list"
    const marker = normalize(firstCell.textContent);
    if (marker !== 'sidebar-list') return;

    const headerRow = rows[1];
    const dataRows = Array.from(rows).slice(2);
    if (!dataRows.length) return;

    const { mode, cols } = detectMode(headerRow);

    // Build outer block markup
    const block = document.createElement('div');
    block.className = `block sidebar-list sidebar-list--${mode}`;

    if (mode === 'related') {
      // --- Magazine "Share this Story" variant ---
      const list = document.createElement('ul');
      list.className = 'sidebar-list__items';

      dataRows.forEach((row) => {
        const cells = row.cells;
        const title = (cells[cols.title]?.textContent || '').trim();
        const date = (cells[cols.date]?.textContent || '').trim();
        const path = (cells[cols.path]?.textContent || '').trim();
        if (!title) return;

        const li = document.createElement('li');
        li.className = 'sidebar-list__item';

        const titleBox = document.createElement('div');
        titleBox.className = 'sidebar-list__title';

        const link = document.createElement('a');
        link.className = 'sidebar-list__title-link';
        link.textContent = title;
        if (path) link.href = path;

        titleBox.appendChild(link);
        li.appendChild(titleBox);

        if (date) {
          const meta = document.createElement('div');
          meta.className = 'sidebar-list__meta';
          meta.textContent = date;
          li.appendChild(meta);
        }

        list.appendChild(li);
      });

      block.appendChild(list);
    } else {
      // --- Adventure "facts" variant ---
      const wrapper = document.createElement('div');
      wrapper.className = 'sidebar-list__facts';

      dataRows.forEach((row) => {
        const cells = row.cells;
        const label = (cells[cols.label]?.textContent || '').trim();
        const value = (cells[cols.value]?.textContent || '').trim();
        if (!label && !value) return;

        const fact = document.createElement('div');
        fact.className = 'sidebar-list__fact';

        const labelEl = document.createElement('div');
        labelEl.className = 'sidebar-list__label';
        labelEl.textContent = label;

        const valueEl = document.createElement('div');
        valueEl.className = 'sidebar-list__value';
        valueEl.textContent = value;

        fact.append(labelEl, valueEl);
        wrapper.appendChild(fact);
      });

      block.appendChild(wrapper);
    }

    // Replace the original table with the block markup
    table.replaceWith(block);
  });
}

/**
 * Default block decorator – this is used if you ever author
 * a "real" sidebar-list block (not the table syntax).
 */
export default function decorate(block) {
  ensureSidebarListCSS();

  const rows = getBlockRows(block);
  if (!rows.length) return;

  const headerRow = rows[0];
  const dataRows = rows.slice(1);
  if (!dataRows.length) return;

  const { mode, cols } = detectMode(headerRow);

  clearBlock(block);
  block.classList.add(`sidebar-list--${mode}`);

  if (mode === 'related') {
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

  // Facts variant
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
