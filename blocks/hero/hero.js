import {
  getBlockRows,
  getCellText,
  clearBlock,
  el,
} from '../../scripts/block-utils.js';

/**
 * Helper: get href from a table cell.
 * Supports either an <a> tag or plain text URL.
 */
function extractHrefFromCell(cell) {
  if (!cell) return '';
  const link = cell.querySelector && cell.querySelector('a[href]');
  if (link) return link.href;
  return (cell.textContent || '').trim();
}

/**
 * Simple hero (used on /us/en/adventures, etc.)
 *
 * Table columns (first data row):
 *  0: Background image
 *  1: Eyebrow (e.g. "Adventures")
 *  2: Title
 *  3: Subtitle / body
 *  4: CTA label
 *  5: CTA URL (link or plain text)
 */
function buildSimpleHero(block, rows) {
  const [row] = rows;
  if (!row) return;

  const cells = Array.from(row.children);
  const imageCell = cells[0] || null;
  const eyebrow = getCellText(row, 1);
  const title = getCellText(row, 2);
  const body = getCellText(row, 3);
  const ctaLabel = getCellText(row, 4);
  const ctaHref = extractHrefFromCell(cells[5] || null);

  const wrapper = el('div', 'hero__inner');
  const content = el('div', 'hero__content');

  if (eyebrow) {
    content.append(el('p', 'hero__eyebrow', eyebrow));
  }

  if (title) {
    const h1 = el('h1', 'hero__title', title);
    content.append(h1);
  }

  if (body) {
    content.append(el('p', 'hero__body', body));
  }

  if (ctaLabel && ctaHref) {
    const actions = el('div', 'hero__actions');
    const btn = el('a', 'button primary');
    btn.href = ctaHref;
    btn.textContent = ctaLabel;
    actions.append(btn);
    content.append(actions);
  }

  wrapper.append(content);

  // Background picture as direct child of .hero (for CSS)
  let picture = null;
  if (imageCell) {
    picture = imageCell.querySelector('picture');
    if (!picture && imageCell.firstElementChild) {
      picture = imageCell.firstElementChild;
    }
  }

  clearBlock(block);

  if (picture) {
    block.append(picture);
  }
  block.append(wrapper);
}

/**
 * Slider hero (used on /us/en/home with style "slider" / "hero--slider").
 *
 * Table columns for EACH slide row:
 *  0: Background image
 *  1: Title (e.g. "WKND Adventures")
 *  2: Subtitle / body
 *  3: CTA label (e.g. "View Trips")
 *  4: CTA URL
 *  5: Optional tag (e.g. "Featured")
 */
function buildSliderHero(block, rows) {
  const slider = el('div', 'hero-slider');
  const slidesWrap = el('div', 'hero-slider__slides');
  const dotsWrap = el('div', 'hero-slider__dots');
  const prevBtn = el('button', 'hero-slider__arrow hero-slider__arrow--prev', '‹');
  const nextBtn = el('button', 'hero-slider__arrow hero-slider__arrow--next', '›');

  prevBtn.type = 'button';
  prevBtn.setAttribute('aria-label', 'Previous slide');
  nextBtn.type = 'button';
  nextBtn.setAttribute('aria-label', 'Next slide');

  const slidesEls = [];
  const dotsEls = [];

  rows.forEach((row, index) => {
    const cells = Array.from(row.children);

    const imageCell = cells[0] || null;
    const title = getCellText(row, 1);
    const subtitle = getCellText(row, 2);
    const ctaLabel = getCellText(row, 3);
    const ctaHref = extractHrefFromCell(cells[4] || null);
    const tag = getCellText(row, 5);

    const slide = el('article', 'hero-slider__slide');
    const media = el('div', 'hero-slider__media');
    const content = el('div', 'hero-slider__content');

    // Background image
    if (imageCell) {
      let picture = imageCell.querySelector('picture');
      if (!picture && imageCell.firstElementChild) {
        picture = imageCell.firstElementChild;
      }
      if (picture) {
        media.append(picture);
      }
    }

    if (tag) {
      content.append(el('p', 'hero-slider__tag', tag));
    }

    if (title) {
      content.append(el('h1', 'hero-slider__title', title));
    }

    if (subtitle) {
      content.append(el('p', 'hero-slider__subtitle', subtitle));
    }

    if (ctaLabel && ctaHref) {
      const actions = el('div', 'hero-slider__actions');
      const btn = el('a', 'button primary');
      btn.href = ctaHref;
      btn.textContent = ctaLabel;
      actions.append(btn);
      content.append(actions);
    }

    slide.append(media, content);
    slidesWrap.append(slide);
    slidesEls.push(slide);

    const dot = el('button', 'hero-slider__dot');
    dot.type = 'button';
    dot.setAttribute('aria-label', `Go to slide ${index + 1}`);
    dotsWrap.append(dot);
    dotsEls.push(dot);
  });

  const nav = el('div', 'hero-slider__nav');
  nav.append(prevBtn, dotsWrap, nextBtn);

  slider.append(slidesWrap, nav);

  clearBlock(block);
  block.append(slider);

  let current = 0;

  const update = (index) => {
    const count = slidesEls.length;
    if (!count) return;

    let i = index;
    if (i < 0) i = count - 1;
    if (i >= count) i = 0;
    current = i;

    slidesEls.forEach((slide, idx) => {
      slide.classList.toggle('is-active', idx === i);
    });

    dotsEls.forEach((dot, idx) => {
      const active = idx === i;
      dot.classList.toggle('is-active', active);
      if (active) {
        dot.setAttribute('aria-current', 'true');
      } else {
        dot.removeAttribute('aria-current');
      }
    });
  };

  prevBtn.addEventListener('click', () => update(current - 1));
  nextBtn.addEventListener('click', () => update(current + 1));
  dotsEls.forEach((dot, idx) => {
    dot.addEventListener('click', () => update(idx));
  });

  // Initial slide
  update(0);
}

/**
 * Entry point: decides between simple hero and slider variant.
 */
export default function decorate(block) {
  const rows = getBlockRows(block);
  if (!rows.length) return;

  const isSlider = block.classList.contains('hero--slider')
    || block.classList.contains('slider');

  if (isSlider) {
    buildSliderHero(block, rows);
  } else {
    buildSimpleHero(block, rows);
  }
}
