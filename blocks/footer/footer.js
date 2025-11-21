import { getMetadata } from '../../scripts/aem.js';
import { loadFragment } from '../fragment/fragment.js';

/**
 * loads and decorates the footer
 * @param {Element} block The footer block element
 */
export default async function decorate(block) {
  const footerMeta = getMetadata('footer');
  const footerPath = footerMeta
    ? new URL(footerMeta, window.location).pathname
    : '/footer';

  const fragment = await loadFragment(footerPath);
  if (!fragment) {
    // nothing to render, avoid runtime errors
    // eslint-disable-next-line no-console
    console.warn('Footer fragment not found for path:', footerPath);
    return;
  }

  block.textContent = '';
  const footer = document.createElement('div');
  footer.classList.add('footer-inner');

  while (fragment.firstElementChild) {
    footer.append(fragment.firstElementChild);
  }

  // --- Enhance "FOLLOW US" into icon buttons ---
  const paragraphs = footer.querySelectorAll('p');
  let followHeading = null;

  paragraphs.forEach((p) => {
    if (p.textContent.trim().toLowerCase() === 'follow us') {
      followHeading = p;
    }
  });

  if (followHeading && followHeading.nextElementSibling) {
    const socialPara = followHeading.nextElementSibling;

    // create wrapper once
    const wrapper = document.createElement('div');
    wrapper.className = 'footer-social';

    let links = Array.from(socialPara.querySelectorAll('a'));

    if (links.length) {
      // --- case 1: real <a> links in the doc (Facebook, Twitter, Instagram) ---
      links.forEach((link) => {
        const label = (link.textContent || '').toLowerCase();
        link.classList.add('footer-social__link');

        if (label.includes('facebook') || label === 'f') {
          link.classList.add('footer-social__link--facebook');
          link.setAttribute('aria-label', 'Facebook');
        } else if (label.includes('twitter') || label === 't') {
          link.classList.add('footer-social__link--twitter');
          link.setAttribute('aria-label', 'Twitter');
        } else if (label.includes('instagram') || label === 'i') {
          link.classList.add('footer-social__link--instagram');
          link.setAttribute('aria-label', 'Instagram');
        }

        // hide text visually, we show only icon via CSS
        link.textContent = '';
        wrapper.append(link);
      });
    } else {
      // --- case 2: plain "[F] [T] [I]" text from the doc ---
      const text = socialPara.textContent || '';

      const addIconLink = (type, label) => {
        const a = document.createElement('a');
        a.href = '#';
        a.className = `footer-social__link footer-social__link--${type}`;
        a.setAttribute('aria-label', label);
        wrapper.append(a);
      };

      if (/\[f]/i.test(text)) {
        addIconLink('facebook', 'Facebook');
      }
      if (/\[t]/i.test(text)) {
        addIconLink('twitter', 'Twitter');
      }
      if (/\[i]/i.test(text)) {
        addIconLink('instagram', 'Instagram');
      }
    }

    // replace the original paragraph ([F] [T] [I]) with our wrapper
    socialPara.replaceWith(wrapper);
  }

  block.append(footer);
}
