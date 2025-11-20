// blocks/magazine-article/magazine-article.js
import {
    getBlockRows,
    moveChildren,
    clearBlock,
    el,
} from '../../scripts/block-utils.js';

/**
 * Expected authoring:
 *
 * Row 1: "magazine-article"
 * Row 2: two cells -> [main content] | [sidebar]
 */
export default function decorate(block) {
    const rows = getBlockRows(block);
    if (!rows.length) return;

    // Second row is our content row (first row is the block name)
    const contentRow = rows[1];
    if (!contentRow || !contentRow.children.length) return;

    const mainCell = contentRow.children[0] || null;
    const asideCell = contentRow.children[1] || null;

    // Outer wrappers
    const wrapper = el('section', 'magazine-article');
    const inner = el('div', 'magazine-article__inner');

    const main = el('article', 'magazine-article__main');
    const aside = el('aside', 'magazine-article__aside');

    // Move authored DOM into our layout
    if (mainCell) {
        moveChildren(mainCell, main);
    }

    if (asideCell) {
        moveChildren(asideCell, aside);
    }

    inner.append(main);

    // Only append sidebar if it actually has something
    if (aside.childElementCount || aside.textContent.trim()) {
        inner.append(aside);
    }

    wrapper.append(inner);

    // Replace table with our new structure
    clearBlock(block);
    block.append(wrapper);
}
