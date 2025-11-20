// blocks/card-grid/card-grid.js
import {
  getBlockRows,
  moveChildren,
  clearBlock,
  el,
} from '../../scripts/block-utils.js';

/**
 * Normalize header cell text into a simple key
 * e.g. "Social Links" -> "social", "Image" -> "image"
 */
function normalizeHeader(text) {
  const cleaned = (text || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^\w-]/g, '');

  if (!cleaned) return '';

  if (cleaned.startsWith('image')) return 'image';
  if (cleaned === 'name') return 'name';
  if (cleaned === 'role' || cleaned === 'title') return 'role';
  if (cleaned.startsWith('social')) return 'social';

  return cleaned;
}

export default function decorate(block) {
  const rows = getBlockRows(block);
  if (!rows.length) return;

  // First row after block name is treated as the header row
  const headerRow = rows[0];
  const dataRows = rows.slice(1);

  if (!headerRow || !headerRow.children.length) return;

  const headerCells = Array.from(headerRow.children);

  // Map headers -> column indexes (image, name, role, social)
  const columnMap = {};
  headerCells.forEach((cell, index) => {
    const key = normalizeHeader(cell.textContent);
    if (!key) return;

    // Only keep the first occurrence of each key
    if (columnMap[key] === undefined) {
      columnMap[key] = index;
    }
  });

  const imageCol = columnMap.image ?? null;
  const nameCol = columnMap.name ?? null;
  const roleCol = columnMap.role ?? null;
  const socialCol = columnMap.social ?? null;

  // Build new DOM
  const wrapper = el('div', 'card-grid');
  const inner = el('div', 'card-grid__inner');
  const grid = el('div', 'card-grid__grid');

  inner.append(grid);
  wrapper.append(inner);

  dataRows.forEach((row) => {
    const cells = Array.from(row.children);
    if (!cells.length) return;

    const card = el('article', 'card-grid__card');

    // --- Image ---
    if (imageCol !== null && cells[imageCol]) {
      const imgWrapper = el('div', 'card-grid__image');
      moveChildren(cells[imageCol], imgWrapper);

      // If author forgot to place an image, don't render empty box
      if (imgWrapper.childElementCount > 0) {
        card.append(imgWrapper);
      }
    }

    const body = el('div', 'card-grid__body');

    // --- Name ---
    if (nameCol !== null && cells[nameCol]) {
      const nameEl = el('h3', 'card-grid__name');
      moveChildren(cells[nameCol], nameEl);
      if (nameEl.textContent.trim()) {
        body.append(nameEl);
      }
    }

    // --- Role / title ---
    if (roleCol !== null && cells[roleCol]) {
      const roleEl = el('p', 'card-grid__role');
      moveChildren(cells[roleCol], roleEl);
      if (roleEl.textContent.trim()) {
        body.append(roleEl);
      }
    }

    // --- Social links ---
    if (socialCol !== null && cells[socialCol]) {
      const socialEl = el('div', 'card-grid__social');
      moveChildren(cells[socialCol], socialEl);

      // Only append if there is something (text, icons, links…)
      if (socialEl.childElementCount > 0 || socialEl.textContent.trim()) {
        body.append(socialEl);
      }
    }

    // Skip cards that ended up completely empty
    if (!body.childElementCount && !card.querySelector('.card-grid__image')) {
      return;
    }

    card.append(body);
    grid.append(card);
  });

  clearBlock(block);
  block.append(wrapper);
}
