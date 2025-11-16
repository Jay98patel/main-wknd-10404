import { getBlockRows, moveChildren, clearBlock, el } from '../../scripts/block-utils.js';


export default function decorate(block) {
    const rows = getBlockRows(block);
    if (!rows.length) return;

    const wrapper = el('div', 'split-section__inner');

    rows.forEach((row, index) => {
        const cells = Array.from(row.children);
        if (cells.length < 2) return;

        const mediaCell = cells[0];
        const contentCell = cells[1];

        const item = el('section', 'split-section__item');
        // Alternate layout for visual rhythm
        if (index % 2 === 1) {
            item.classList.add('split-section__item--reversed');
        }

        const media = el('div', 'split-section__media');
        moveChildren(mediaCell, media);

        const content = el('div', 'split-section__content');
        moveChildren(contentCell, content);

        item.append(media, content);
        wrapper.append(item);
    });

    clearBlock(block);
    block.append(wrapper);
}
