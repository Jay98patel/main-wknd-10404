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

  // Move original cell content into our layout
  moveChildren(mainCell, main);
  moveChildren(asideCell, aside);

  // 🔹 Collect extra wrappers that should live under the image in the main column:
  //    - .default-content-wrapper (intro text)
  //    - .faq-accordion-wrapper (accordion block)
  const extraNodes = [];
  const section = block.closest('.section');

  if (section) {
    const sectionChildren = Array.from(section.querySelectorAll(':scope > div'));
    const faqWrapper = block.parentElement; // <div class="faq-intro-wrapper">

    const faqIndex = sectionChildren.indexOf(faqWrapper);
    if (faqIndex !== -1) {
      sectionChildren.slice(faqIndex + 1).forEach((node) => {
        if (
          node.classList.contains('default-content-wrapper')
          || node.classList.contains('faq-accordion-wrapper')
        ) {
          extraNodes.push(node);
        }
      });
    }
  }

  // Clear original block content and inject our layout
  clearBlock(block);
  wrapper.append(main, aside);
  block.append(wrapper);

  // Move the extra wrappers *inside* the main column, after the picture
  extraNodes.forEach((node) => {
    main.append(node); // this will remove them from the section and place them here
  });
}
