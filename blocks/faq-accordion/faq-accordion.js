
import {
  getBlockRows,
  getCellText,
  clearBlock,
  el,
  moveChildren,
} from '../../scripts/block-utils.js';

function getFaqItemsData(block) {
  const rows = getBlockRows(block);
  if (!rows.length) return [];

  const headerRow = rows[0];
  const headerFirstCell = headerRow ? getCellText(headerRow, 0).toLowerCase() : '';
  const hasHeader =
    headerRow
    && headerRow.children.length >= 2
    && (headerFirstCell === 'question' || headerFirstCell === 'q');

  const dataRows = hasHeader ? rows.slice(1) : rows;

  return dataRows
    .map((row) => {
      const cells = Array.from(row.children);
      if (!cells.length) return null;

      const question = getCellText(row, 0);
      if (!question) return null;

      return {
        question,
        answerCell: cells[1] || null,
        category: cells[2] ? getCellText(row, 2) : '',
        tag: cells[3] ? getCellText(row, 3) : '',
      };
    })
    .filter(Boolean);
}

function openItem(item, btn, panel, icon, animate) {
  item.classList.add('faq-accordion__item--open');
  btn.setAttribute('aria-expanded', 'true');
  panel.setAttribute('aria-hidden', 'false');

  if (animate) {
    panel.style.maxHeight = `${panel.scrollHeight}px`;
  } else {
    panel.style.maxHeight = 'none';
  }

  icon.textContent = '–';
}

function closeItem(item, btn, panel, icon) {
  item.classList.remove('faq-accordion__item--open');
  btn.setAttribute('aria-expanded', 'false');
  panel.setAttribute('aria-hidden', 'true');

  const currentHeight = panel.scrollHeight;
  panel.style.maxHeight = `${currentHeight}px`;
  requestAnimationFrame(() => {
    panel.style.maxHeight = '0px';
  });

  icon.textContent = '+';
}

function createFaqItem(data, index) {
  const item = el('div', 'faq-accordion__item');

  const btn = el('button', 'faq-accordion__question');
  btn.type = 'button';
  btn.setAttribute('aria-expanded', 'false');

  const qText = el('span', 'faq-accordion__question-text', data.question);
  const icon = el('span', 'faq-accordion__icon', '+');
  btn.append(qText, icon);

  const panel = el('div', 'faq-accordion__answer');
  panel.setAttribute('aria-hidden', 'true');
  panel.style.maxHeight = '0px';

  if (data.answerCell) {
    moveChildren(data.answerCell, panel);
  }

  if (data.category || data.tag) {
    const meta = el('div', 'faq-accordion__meta');
    if (data.category) meta.append(el('span', 'faq-accordion__pill', data.category));
    if (data.tag) meta.append(el('span', 'faq-accordion__pill', data.tag));
    panel.prepend(meta);
  }

  btn.addEventListener('click', () => {
    const isOpen = item.classList.contains('faq-accordion__item--open');
    if (isOpen) {
      closeItem(item, btn, panel, icon);
    } else {
      openItem(item, btn, panel, icon, true);
    }
  });

  item.append(btn, panel);

  return { item, button: btn, panel, icon, index };
}

function buildFaqList(itemsData) {
  const list = el('div', 'faq-accordion__list');
  const controls = [];

  itemsData.forEach((data, index) => {
    const control = createFaqItem(data, index);
    controls.push(control);
    list.append(control.item);
  });

  return { list, controls };
}

export default function decorate(block) {
  const itemsData = getFaqItemsData(block);
  if (!itemsData.length) return;

  clearBlock(block);
  block.classList.add('faq-accordion');

  const { list, controls } = buildFaqList(itemsData);
  block.append(list);

  const first = controls[0];
  if (first) {
    openItem(first.item, first.button, first.panel, first.icon, false);
  }
}
