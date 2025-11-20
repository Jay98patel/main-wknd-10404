// blocks/trip-summary/trip-summary.js
import {
  getBlockRows,
  clearBlock,
  el,
} from '../../scripts/block-utils.js';

export default function decorate(block) {
  const rows = getBlockRows(block);
  if (!rows.length) return;

  // We expect simple 2-column rows: Label | Value
  clearBlock(block);
  block.classList.add('trip-summary');

  const inner = el('div', 'trip-summary__inner');

  // Static heading – matches WKND “Trip Facts”
  const heading = el('h3', 'trip-summary__heading', 'Trip Facts');
  inner.append(heading);

  const list = el('div', 'trip-summary__list');

  rows.forEach((row) => {
    const cells = Array.from(row.children);
    if (!cells.length) return;

    const label = (cells[0]?.textContent || '').trim();
    const value = (cells[1]?.textContent || '').trim();

    if (!label && !value) return;

    const item = el('div', 'trip-summary__item');

    if (label) {
      const dt = el('div', 'trip-summary__label', label);
      item.append(dt);
    }

    if (value) {
      const dd = el('div', 'trip-summary__value', value);
      item.append(dd);
    }

    list.append(item);
  });

  inner.append(list);
  block.append(inner);

  /*
    ---- Layout wiring ----
    For sections that have hero + trip-summary + tabs
    (classes: hero-container trip-summary-container tabs-container),
    wrap trip-summary-wrapper and tabs-wrapper in a single row so they
    sit side-by-side: left = trip summary, right = tabs.
  */
  const wrapper = block.closest('.trip-summary-wrapper');
  const section = block.closest('.section');

  if (wrapper && section?.classList.contains('tabs-container')) {
    const tabsWrapper = section.querySelector('.tabs-wrapper');

    // Only create the layout once
    if (tabsWrapper && !section.querySelector('.adventure-detail')) {
      const layout = document.createElement('div');
      layout.className = 'adventure-detail';

      // insert layout before the trip-summary wrapper,
      // then move both wrappers into it
      section.insertBefore(layout, wrapper);
      layout.appendChild(wrapper);
      layout.appendChild(tabsWrapper);
    }
  }
}
