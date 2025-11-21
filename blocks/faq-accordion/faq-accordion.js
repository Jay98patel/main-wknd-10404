// blocks/faq-accordion/faq-accordion.js
import {
  getBlockRows,
  getCellText,
  clearBlock,
  el,
  moveChildren,
} from '../../scripts/block-utils.js';

export default function decorate(block) {
  const rows = getBlockRows(block);
  if (!rows.length) return;

  let startIndex = 0;

  // Optional first row with "faq-accordion"
  if (
    rows[0].children.length === 1 &&
    getCellText(rows[0], 0).toLowerCase().includes('faq-accordion')
  ) {
    startIndex = 1;
  }

  // Header row: Question | Answer | Category | Tag
  const headerRow = rows[startIndex];
  const headerFirstCell = getCellText(headerRow, 0).toLowerCase();
  const hasHeader =
    headerRow &&
    headerRow.children.length >= 2 &&
    (headerFirstCell === 'question' || headerFirstCell === 'q');

  const dataRows = hasHeader ? rows.slice(startIndex + 1) : rows.slice(startIndex);

  clearBlock(block);
  block.classList.add('faq-accordion');

  const list = el('div', 'faq-accordion__list');

  dataRows.forEach((row, index) => {
    const cells = Array.from(row.children);
    if (!cells.length) return;

    const question = getCellText(row, 0);
    const answerCell = cells[1] || null;
    const category = cells[2] ? getCellText(row, 2) : '';
    const tag = cells[3] ? getCellText(row, 3) : '';

    if (!question) return;

    const item = el('div', 'faq-accordion__item');

    // Question button
    const btn = el('button', 'faq-accordion__question');
    btn.type = 'button';
    btn.setAttribute('aria-expanded', 'false');

    const qText = el('span', 'faq-accordion__question-text', question);
    const icon = el('span', 'faq-accordion__icon', '+');
    btn.append(qText, icon);

    // Answer panel
    const panel = el('div', 'faq-accordion__answer');
    panel.hidden = true;
    panel.setAttribute('aria-hidden', 'true');

    if (answerCell) {
      moveChildren(answerCell, panel);
    }

    // Optional meta pills (category/tag)
    if (category || tag) {
      const meta = el('div', 'faq-accordion__meta');
      if (category) {
        meta.append(el('span', 'faq-accordion__pill', category));
      }
      if (tag) {
        meta.append(el('span', 'faq-accordion__pill', tag));
      }
      panel.prepend(meta);
    }

    // First item open by default
    if (index === 0) {
      item.classList.add('faq-accordion__item--open');
      btn.setAttribute('aria-expanded', 'true');
      panel.hidden = false;
      panel.setAttribute('aria-hidden', 'false');
      icon.textContent = '–';
    }

    btn.addEventListener('click', () => {
      const isOpen = item.classList.toggle('faq-accordion__item--open');
      btn.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
      panel.hidden = !isOpen;
      panel.setAttribute('aria-hidden', isOpen ? 'false' : 'true');
      icon.textContent = isOpen ? '–' : '+';
    });

    item.append(btn, panel);
    list.append(item);
  });

  block.append(list);
}
