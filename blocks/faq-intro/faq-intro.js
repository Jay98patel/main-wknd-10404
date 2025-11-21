// blocks/faq-intro/faq-intro.js
import {
  getBlockRows,
  moveChildren,
  clearBlock,
  el,
} from '../../scripts/block-utils.js';

export default function decorate(block) {
  const rows = getBlockRows(block);
  if (!rows.length) return;

  // We only care about the first data row: [main content | sidebar]
  const [firstRow] = rows;
  const cells = Array.from(firstRow.children);
  if (cells.length < 2) return;

  const mainCell = cells[0];
  const asideCell = cells[1];

  const wrapper = el('div', 'faq-intro__inner');
  const main = el('div', 'faq-intro__main');
  const aside = el('aside', 'faq-intro__aside');

  moveChildren(mainCell, main);
  moveChildren(asideCell, aside);

  clearBlock(block);
  wrapper.append(main, aside);
  block.append(wrapper);
}
