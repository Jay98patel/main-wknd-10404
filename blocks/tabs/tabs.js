// blocks/tabs/tabs.js
import {
  getBlockRows,
  moveChildren,
  clearBlock,
  el,
} from '../../scripts/block-utils.js';

export default function decorate(block) {
  const rows = getBlockRows(block);
  if (!rows.length) return;
    
  const uid = `tabs-${Math.random().toString(36).slice(2, 8)}`;

  const inner = el('div', 'tabs__inner');
  const tabList = el('div', 'tabs__list');
  tabList.setAttribute('role', 'tablist');

  const panels = el('div', 'tabs__panels');

  rows.forEach((row, index) => {
    const cells = Array.from(row.children);
    if (!cells.length) return;

    const labelCell = cells[0];
    const contentCell = cells[1] || null;

    const label = (labelCell.textContent || '').trim();
    if (!label) return;

    const isFirst = index === 0;
    const tabId = `${uid}-tab-${index}`;
    const panelId = `${uid}-panel-${index}`;

    // --- Tab button ---
    const tab = el(
      'button',
      `tabs__tab${isFirst ? ' tabs__tab--active' : ''}`,
    );
    tab.type = 'button';
    tab.textContent = label;
    tab.id = tabId;
    tab.setAttribute('role', 'tab');
    tab.setAttribute('aria-controls', panelId);
    tab.setAttribute('aria-selected', isFirst ? 'true' : 'false');
    tab.dataset.tabTarget = panelId;

    tabList.append(tab);

    // --- Panel ---
    const panel = el(
      'div',
      `tabs__panel${isFirst ? ' tabs__panel--active' : ''}`,
    );
    panel.id = panelId;
    panel.setAttribute('role', 'tabpanel');
    panel.setAttribute('aria-labelledby', tabId);
    if (!isFirst) {
      panel.hidden = true;
    }

    if (contentCell) {
      moveChildren(contentCell, panel);
    }

    panels.append(panel);
  });

  clearBlock(block);
  inner.append(tabList, panels);
  block.append(inner);

  // Interactivity
  const allTabs = Array.from(block.querySelectorAll('.tabs__tab'));
  const allPanels = Array.from(block.querySelectorAll('.tabs__panel'));

  const activate = (targetId) => {
    allTabs.forEach((tab) => {
      const isActive = tab.dataset.tabTarget === targetId;
      tab.classList.toggle('tabs__tab--active', isActive);
      tab.setAttribute('aria-selected', isActive ? 'true' : 'false');
    });

    allPanels.forEach((panel) => {
      const isActive = panel.id === targetId;
      panel.classList.toggle('tabs__panel--active', isActive);
      panel.hidden = !isActive;
    });
  };

  allTabs.forEach((tab, index) => {
    tab.addEventListener('click', () => {
      activate(tab.dataset.tabTarget);
    });

    // Basic keyboard support: left/right arrows
    tab.addEventListener('keydown', (e) => {
      if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
      e.preventDefault();
      const dir = e.key === 'ArrowRight' ? 1 : -1;
      const nextIndex = (index + dir + allTabs.length) % allTabs.length;
      allTabs[nextIndex].focus();
    });
  });
}
