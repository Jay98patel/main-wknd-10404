// blocks/profile-card/profile-card.js
import {
    clearBlock,
    el,
} from '../../scripts/block-utils.js';

/* ----------------- social icons ----------------- */

function enhanceSocialIcons(container) {
    const iconMap = {
        f: { className: 'profile-card__social-icon--facebook', label: 'Facebook' },
        facebook: { className: 'profile-card__social-icon--facebook', label: 'Facebook' },
        t: { className: 'profile-card__social-icon--twitter', label: 'Twitter' },
        twitter: { className: 'profile-card__social-icon--twitter', label: 'Twitter' },
        i: { className: 'profile-card__social-icon--instagram', label: 'Instagram' },
        instagram: { className: 'profile-card__social-icon--instagram', label: 'Instagram' },
    };

    const tokens = [];
    const candidates = Array.from(
        container.querySelectorAll('a, p, span, strong'),
    );

    candidates.forEach((node) => {
        const text = (node.textContent || '').trim();
        if (!text) return;

        const parts = text.split(/[\s,|]+/);
        parts.forEach((part) => {
            const key = part.toLowerCase();
            const cfg = iconMap[key];
            if (!cfg) return;

            const href = node.tagName === 'A' ? node.getAttribute('href') : null;
            tokens.push({ key, href });
        });
    });

    container.innerHTML = '';

    tokens.forEach(({ key, href }) => {
        const isFacebook = key === 'f' || key === 'facebook';
        const isTwitter = key === 't' || key === 'twitter';
        const isInstagram = key === 'i' || key === 'instagram';

        const className = isFacebook
            ? 'profile-card__social-icon profile-card__social-icon--facebook'
            : isTwitter
                ? 'profile-card__social-icon profile-card__social-icon--twitter'
                : 'profile-card__social-icon profile-card__social-icon--instagram';

        const label = isFacebook ? 'Facebook' : isTwitter ? 'Twitter' : 'Instagram';

        const iconEl = el(href ? 'a' : 'span', className);
        if (href) iconEl.href = href;
        iconEl.setAttribute('aria-label', label);
        iconEl.textContent = '';
        container.append(iconEl);
    });
}

/* ----------------- read Name / Role / Social from block ----------------- */

function extractAuthorData(block) {
    const paragraphs = Array.from(block.querySelectorAll('p'));
    if (!paragraphs.length) {
        return { name: '', role: '', socialContainer: null };
    }

    const name = (paragraphs[0]?.textContent || '').trim();
    const role = (paragraphs[1]?.textContent || '').trim();

    let socialContainer = null;
    const socialP = paragraphs[2] || null;

    if (socialP) {
        socialContainer = document.createElement('div');
        socialContainer.append(socialP.cloneNode(true));
        enhanceSocialIcons(socialContainer);
    }

    return { name, role, socialContainer };
}

/* ----------------- main decorate ----------------- */

export default function decorate(block) {
    // 1) Use the existing Franklin wrapper (only ONE .profile-card-wrapper)
    const wrapper = block.parentElement;
    if (!wrapper) return;
    wrapper.classList.add('profile-card-wrapper');

    // 2) Ensure we have an avatar container BEFORE the block
    let avatarWrap = wrapper.querySelector('.profile-card__avatar-wrap');

    if (!avatarWrap) {
        avatarWrap = el('div', 'profile-card__avatar-wrap');
        wrapper.insertBefore(avatarWrap, block);
    }

    // 3) If avatar container has no image yet, source one
    if (!avatarWrap.querySelector('picture, img')) {
        let mediaSource = null;

        // 3a) Look for an image inside the wrapper but outside the block
        const internalCandidates = Array.from(
            wrapper.querySelectorAll('picture, img'),
        ).filter((node) => !block.contains(node));

        if (internalCandidates.length) {
            mediaSource = internalCandidates[0];
        } else {
            // 3b) Fallback: previous sibling of wrapper (e.g. author photo just above)
            const prev = wrapper.previousElementSibling;
            if (prev) {
                const pImg = prev.querySelector('picture, img');
                if (pImg) mediaSource = pImg;
            }
        }

        if (mediaSource) {
            // Clone so we don't destroy the original image
            const clone = mediaSource.cloneNode(true);
            clone.classList.add('profile-card__avatar');
            avatarWrap.append(clone);
        }
    }

    // 4) Extract name, role, social tokens from existing <p> content
    const { name, role, socialContainer } = extractAuthorData(block);

    // 5) Build the inner layout inside the block
    const mainRow = el('div', 'profile-card__row');
    const textWrap = el('div', 'profile-card__text');

    if (name) {
        const h3 = el('h3', 'profile-card__name', name);
        textWrap.append(h3);
    }

    if (role) {
        const p = el('p', 'profile-card__role', role);
        textWrap.append(p);
    }

    mainRow.append(textWrap);

    if (socialContainer && socialContainer.childElementCount) {
        const socialBar = el('div', 'profile-card__social-bar');
        const iconsWrapper = el('div', 'profile-card__social-icons');

        while (socialContainer.firstChild) {
            iconsWrapper.append(socialContainer.firstChild);
        }

        socialBar.append(iconsWrapper);
        mainRow.append(socialBar);
    }

    clearBlock(block);
    block.classList.add('profile-card');
    block.append(mainRow);
}
