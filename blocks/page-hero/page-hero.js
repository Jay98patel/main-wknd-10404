import { getBlockRows, getCellText, moveChildren, clearBlock, el } from '../../scripts/block-utils.js';

/**
 * page-hero block
 *
 * Authoring (table after the header row):
 *  Col 0: Image (inline image / picture)
 *  Col 1: Eyebrow (small label, eg. "WKND Adventures")
 *  Col 2: Title
 *  Col 3: Body / description
 *  Col 4: Primary CTA label (eg. "View trips")
 *  Col 5: Primary CTA link (URL or link)
 */
export default function decorate(block) {
  const rows = getBlockRows(block);
  if (!rows.length) return;

  const [dataRow] = rows;
  const cells = Array.from(dataRow.children);

  const imageCell = cells[0] || null;
  const eyebrowText = getCellText(dataRow, 1);
  const titleText = getCellText(dataRow, 2);
  const bodyText = getCellText(dataRow, 3);
  const ctaLabel = getCellText(dataRow, 4);
  const ctaLinkCell = cells[5] || null;

  let ctaHref = '';
  if (ctaLinkCell) {
    const link = ctaLinkCell.querySelector('a[href]');
    if (link) {
      ctaHref = link.href;
    } else {
      ctaHref = (ctaLinkCell.textContent || '').trim();
    }
  }

  const inner = el('div', 'page-hero__inner');

  // Media
  const media = el('div', 'page-hero__media');
  if (imageCell) {
    const picture = imageCell.querySelector('picture');
    if (picture) {
      media.append(picture);
    } else if (imageCell.firstElementChild) {
      media.append(imageCell.firstElementChild);
    }
  }
  inner.append(media);

  // Content
  const content = el('div', 'page-hero__content');

  if (eyebrowText) {
    content.append(el('p', 'page-hero__eyebrow', eyebrowText));
  }

  if (titleText) {
    content.append(el('h1', 'page-hero__title', titleText));
  }

  if (bodyText) {
    content.append(el('p', 'page-hero__body', bodyText));
  }

  if (ctaLabel && ctaHref) {
    const actions = el('div', 'page-hero__actions');
    const button = el('a', 'page-hero__cta button primary', ctaLabel);
    button.href = ctaHref;
    actions.append(button);
    content.append(actions);
  }

  inner.append(content);

  clearBlock(block);
  block.append(inner);
}
