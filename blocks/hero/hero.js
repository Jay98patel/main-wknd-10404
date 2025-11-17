// blocks/hero/hero.js
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
        firstCell === 'image' &&
        (secondCell === 'title' || secondCell === 'eyebrow' || secondCell === 'subtitle');

    return looksLikeHeader ? rows.slice(1) : rows;
}

function buildSlide(row, isActive) {
    const cells = Array.from(row.children);

    const imageCell = cells[0] || null;
    const titleText = getCellText(row, 1); // "WKND Adventures"
    const subtitleText = getCellText(row, 2); // long copy
    const ctaLabel = getCellText(row, 3);
    const ctaCell = cells[4] || null;
    const tagText = getCellText(row, 5); // "Featured", "Surfing", etc.

    let ctaHref = '';
    if (ctaCell) {
        const link = getLinkFromCell(ctaCell);
        if (link && link.href) {
            ctaHref = link.href;
        } else {
            ctaHref = (ctaCell.textContent || '').trim();
        }
    }

    const slide = el('section', 'hero__slide');
    if (isActive) {
        slide.classList.add('hero__slide--active');
    }
    slide.setAttribute('role', 'group');

    // Background media (picture fills slide)
    if (imageCell) {
        const picture = imageCell.querySelector('picture, img');
        if (picture) {
            slide.append(picture);
        }
    }

    const inner = el('div', 'hero__inner');
    const content = el('div', 'hero__content');

    // if (tagText) {
    //     content.append(el('p', 'hero__eyebrow', tagText));
    // }

    if (titleText) {
        content.append(el('h1', 'hero__title', titleText));
    }

    if (subtitleText) {
        content.append(el('p', 'hero__subtitle', subtitleText));
    }

    if (ctaLabel && ctaHref) {
        const actions = el('div', 'hero__actions');
        const btn = el('a', 'button primary hero__cta', {
            href: ctaHref,
            text: ctaLabel,
        });
        actions.append(btn);
        content.append(actions);
    }

    inner.append(content);
    slide.append(inner);

    return slide;
}

function wireSlider(heroEl) {
    const slides = Array.from(heroEl.querySelectorAll('.hero__slide'));
    const total = slides.length;
    if (total <= 1) return; 
    let current = 0;

    // ----- dots -----
    const dotsWrapper = el('div', 'hero__dots');
    const dots = slides.map((_, index) => {
        const dot = el('button', 'hero__dot');
        dot.type = 'button';
        dot.setAttribute('aria-label', `Go to slide ${index + 1}`);
        if (index === 0) {
            dot.classList.add('hero__dot--active');
        }
        dotsWrapper.append(dot);
        return dot;
    });

    // ----- arrows -----
    const prevBtn = el('button', 'hero__arrow hero__arrow--prev', {
        type: 'button',
        text: '‹',
    });

    const nextBtn = el('button', 'hero__arrow hero__arrow--next', {
        type: 'button',
        text: '›',
    });

    const arrowsWrapper = el('div', 'hero__arrows');
    arrowsWrapper.append(prevBtn, nextBtn);

    // ----- nav wrapper -----
    const nav = el('div', 'hero__nav');
    nav.append(arrowsWrapper, dotsWrapper);

    const blockEl = heroEl.parentElement || heroEl;
    blockEl.append(nav);

    // ----- slider state -----
    const setActive = (index) => {
        current = (index + total) % total;

        slides.forEach((slide, i) => {
            const isActive = i === current;
            slide.classList.toggle('hero__slide--active', isActive);
            slide.setAttribute('aria-hidden', isActive ? 'false' : 'true');
        });

        dots.forEach((dot, i) => {
            dot.classList.toggle('hero__dot--active', i === current);
        });
    };

    prevBtn.addEventListener('click', () => setActive(current - 1));
    nextBtn.addEventListener('click', () => setActive(current + 1));
    dots.forEach((dot, index) => {
        dot.addEventListener('click', () => setActive(index));
    });
}



export default function decorate(block) {
    const dataRows = getDataRows(block);
    if (!dataRows.length) return;

    const hero = el('div', 'hero hero--slider');
    const slidesWrapper = el('div', 'hero__slides');

    dataRows.forEach((row, index) => {
        const slide = buildSlide(row, index === 0);
        slidesWrapper.append(slide);
    });

    hero.append(slidesWrapper);

    clearBlock(block);
    block.append(hero);

    wireSlider(hero);
}
