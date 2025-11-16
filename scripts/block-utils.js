/**
 * Shared helpers for custom blocks.
 * Reuse these instead of duplicating logic in every block.
 */

/**
 * Returns the content rows of a block, skipping a header row
 * if it only contains the block name.
 *
 * @param {HTMLElement} block
 * @returns {HTMLElement[]}
 */
export function getBlockRows(block) {
  if (!block) return [];
  const rows = Array.from(block.children);
  if (!rows.length) return rows;

  const { blockName } = block.dataset || {};
  if (!blockName) return rows;

  const headerRow = rows[0];
  if (headerRow && headerRow.children.length === 1) {
    const cellText = (headerRow.children[0].textContent || '').trim().toLowerCase();
    if (cellText === blockName.toLowerCase()) {
      rows.shift();
    }
  }

  return rows;
}

/**
 * Returns the cell at the given index in a row.
 *
 * @param {HTMLElement} row
 * @param {number} index
 * @returns {HTMLElement|null}
 */
export function getCell(row, index) {
  if (!row || !row.children) return null;
  return row.children[index] || null;
}

/**
 * Returns trimmed text content for a given cell index in a row.
 *
 * @param {HTMLElement} row
 * @param {number} index
 * @returns {string}
 */
export function getCellText(row, index) {
  const cell = getCell(row, index);
  return cell ? (cell.textContent || '').trim() : '';
}

/**
 * Returns the first anchor (href + label) in a cell, if any.
 *
 * @param {HTMLElement|null} cell
 * @returns {{ href: string, label: string } | null}
 */
export function getLinkFromCell(cell) {
  if (!cell) return null;
  const link = cell.querySelector('a[href]');
  if (!link) return null;

  return {
    href: link.href,
    label: (link.textContent || '').trim(),
  };
}

/**
 * Moves all children from source into target.
 *
 * @param {HTMLElement|null} source
 * @param {HTMLElement} target
 */
export function moveChildren(source, target) {
  if (!source || !target) return;
  while (source.firstChild) {
    target.append(source.firstChild);
  }
}

/**
 * Clears all children from a block.
 *
 * @param {HTMLElement} block
 */
export function clearBlock(block) {
  if (!block) return;
  while (block.firstChild) {
    block.removeChild(block.firstChild);
  }
}

/**
 * Convenience helper to build elements.
 *
 * Usage:
 *   el('div', 'class-name');                      // no text
 *   el('p', 'class-name', 'Some text');          // textContent
 *   el('a', 'link', { href: '/x', text: 'Go' }); // attributes/options
 *
 * @param {string} tag
 * @param {string} [className]
 * @param {string|Record<string, any>} [options]
 *  - string  => textContent
 *  - object  => attributes/properties (href, src, text, etc.)
 * @returns {HTMLElement}
 */
export function el(tag, className, options) {
  const element = document.createElement(tag);
  if (className) element.className = className;

  if (typeof options === 'string') {
    element.textContent = options;
  } else if (options && typeof options === 'object') {
    Object.entries(options).forEach(([key, value]) => {
      if (value == null) return;

      if (key === 'text' || key === 'textContent') {
        element.textContent = value;
      } else if (key === 'html' || key === 'innerHTML') {
        element.innerHTML = value;
      } else if (key in element) {
        // direct property if it exists (href, src, loading, etc.)
        element[key] = value;
      } else {
        element.setAttribute(key, value);
      }
    });
  }

  return element;
}
