// blocks/member-only-cards/member-only-cards.js
import {
  getBlockRows,
  getCellText,
  getLinkFromCell,
  clearBlock,
  el,
} from '../../scripts/block-utils.js';

function getDataRows(block) {
  const rows = getBlockRows(block);
  if (!rows.length) return [];

  const firstRow = rows[0];
  const firstCell = getCellText(firstRow, 0).toLowerCase();
  const secondCell = getCellText(firstRow, 1).toLowerCase();

  const looksLikeHeader =
    (firstCell === 'image' || firstCell === 'picture') &&
    (secondCell === 'title' || secondCell === 'heading');

  // row 0 is "Image | Title | Subtitle | CTA text | CTA URL"
  return looksLikeHeader ? rows.slice(1) : rows;
}

function buildCard(row) {
  const cells = Array.from(row.children);

  const imageCell = cells[0] || null;
  const title = getCellText(row, 1);
  const subtitle = getCellText(row, 2);
  const ctaLabel = getCellText(row, 3);
  const ctaCell = cells[4] || null;

  let ctaHref = '';
  if (ctaCell) {
    const link = getLinkFromCell(ctaCell);
    if (link && link.href) {
      ctaHref = link.href;
    } else {
      ctaHref = (ctaCell.textContent || '').trim();
    }
  }

  const card = el('article', 'member-only-card');

  // yellow flag + lock
  const flag = el('div', 'member-only-card__flag');
  const lock = el('span', 'member-only-card__lock', {
    text: '🔒',
    'aria-hidden': 'true',
  });
  flag.append(lock);
  card.append(flag);

  // text content
  const body = el('div', 'member-only-card__body');

  if (title) {
    body.append(el('h3', 'member-only-card__title', title));
  }

  if (subtitle) {
    body.append(el('p', 'member-only-card__subtitle', subtitle));
  }

  if (ctaLabel && ctaHref) {
    const cta = el('a', 'button member-only-card__cta', {
      href: ctaHref,
      text: ctaLabel,
    });
    body.append(cta);
  }

  card.append(body);

  // image
  const media = el('div', 'member-only-card__media');
  if (imageCell) {
    const picture = imageCell.querySelector('picture, img');
    if (picture) {
      media.append(picture);
    }
  }
  card.append(media);

  return card;
}

export default function decorate(block) {
  const dataRows = getDataRows(block);
  if (!dataRows.length) return;

  const root = el('div', 'member-only-cards');
  const grid = el('div', 'member-only-cards__grid');

  dataRows.forEach((row) => {
    const card = buildCard(row);
    grid.append(card);
  });

  root.append(grid);

  clearBlock(block);
  block.append(root);
}
