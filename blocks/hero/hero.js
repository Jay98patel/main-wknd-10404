import {
  getBlockRows,
  getCell,
  getCellText,
  clearBlock,
  el,
} from '../../scripts/block-utils.js';

/**
 * Extract href from a cell that may contain a link or plain URL text.
 */
function getHrefFromCell(cell) {
  if (!cell) return '';
  const link = cell.querySelector('a[href]');
  if (link) return link.href;
  return (cell.textContent || '').trim();
}

/**
 * Build one hero slide DOM node from a table row.
 *
 * Col 0: Image (picture or img)
 * Col 1: Title (eg. "WKND Adventures")
 * Col 2: Subtitle / description
 * Col 3: CTA label
 * Col 4: CTA URL (link or text)
 * Col 5: Tag (eg. "Featured")
 */
function buildSlide(row) {
  const imageCell = getCell(row, 0);
  const title = getCellText(row, 1);
  const subtitle = getCellText(row, 2);
  const ctaLabel = getCellText(row, 3);
  const ctaHref = getHrefFromCell(getCell(row, 4));
  const tag = getCellText(row, 5);

  const slide = el('div', 'hero__slide');

  // Background image
  const bg = el('div', 'hero__background');
  if (imageCell) {
    const picture = imageCell.querySelector('picture, img');
    if (picture) {
      bg.append(picture);
    }
  }
  slide.append(bg);

  // Gradient overlay
  slide.append(el('div', 'hero__gradient'));

  // Content panel
  const wrapper = el('div', 'hero__content-wrapper');
  const panel = el('div', 'hero__panel');

  if (tag) {
    panel.append(el('p', 'hero__tag', tag));
  }

  if (title) {
    panel.append(el('h2', 'hero__title', title));
  }

  if (subtitle) {
    panel.append(el('p', 'hero__subtitle', subtitle));
  }

  if (ctaLabel && ctaHref) {
    const button = el('a', 'hero__cta', { href: ctaHref, text: ctaLabel });
    panel.append(button);
  }

  wrapper.append(panel);
  slide.append(wrapper);

  return slide;
}

/**
 * Detect and skip the "Image | Title | Subtitle | ..." header row
 * if present as the first row after the block name.
 */
function getDataRows(block) {
  const rows = getBlockRows(block);
  if (!rows.length) return [];

  let dataRows = rows;

  const maybeHeader = rows[0];
  if (maybeHeader && maybeHeader.children.length >= 2) {
    const first = (maybeHeader.children[0].textContent || '').trim().toLowerCase();
    const second = (maybeHeader.children[1].textContent || '').trim().toLowerCase();
    if (first === 'image' && (second === 'title' || second === 'eyebrow')) {
      dataRows = rows.slice(1);
    }
  }

  return dataRows;
}

export default function decorate(block) {
  const dataRows = getDataRows(block);
  if (!dataRows.length) return;

  const slides = dataRows.map(buildSlide);
  const hasMultiple = slides.length > 1;

  const slidesWrapper = el('div', 'hero__slides');
  slides.forEach((slide, index) => {
    if (index === 0) slide.classList.add('hero__slide--active');
    slidesWrapper.append(slide);
  });

  // Navigation arrows
  const nav = el('div', 'hero__nav');
  const prevBtn = el('button', 'hero__arrow', { text: '‹', type: 'button' });
  const nextBtn = el('button', 'hero__arrow', { text: '›', type: 'button' });
  nav.append(prevBtn, nextBtn);

  // Dots
  const dots = el('div', 'hero__dots');
  const dotButtons = slides.map((_, index) => {
    const dot = el('button', 'hero__dot', { type: 'button' });
    if (index === 0) dot.classList.add('hero__dot--active');
    dots.append(dot);
    return dot;
  });

  clearBlock(block);
  block.append(slidesWrapper, nav, dots);

  if (!hasMultiple) {
    // Single hero: hide arrows & dots
    nav.style.display = 'none';
    dots.style.display = 'none';
    return;
  }

  // Slider behaviour
  let active = 0;

  const showSlide = (index) => {
    const newIndex = (index + slides.length) % slides.length;
    if (newIndex === active) return;

    slides[active].classList.remove('hero__slide--active');
    dotButtons[active].classList.remove('hero__dot--active');

    active = newIndex;

    slides[active].classList.add('hero__slide--active');
    dotButtons[active].classList.add('hero__dot--active');
  };

  prevBtn.addEventListener('click', () => showSlide(active - 1));
  nextBtn.addEventListener('click', () => showSlide(active + 1));

  dotButtons.forEach((dot, index) => {
    dot.addEventListener('click', () => showSlide(index));
  });
}
