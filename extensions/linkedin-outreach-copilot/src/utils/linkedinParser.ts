import { LinkedInProfile } from '../types';

export function isLinkedInProfileUrl(): boolean {
  return window.location.pathname.includes('/in/');
}

export function parseLinkedInProfile(): LinkedInProfile | null {
  const isProfile = isLinkedInProfileUrl();
  const cleanUrl = window.location.href.split('?')[0].replace(/\/overlay\/.*$/, '').replace(/\/$/, '');

  // 1. Try extracting name from DOM
  const nameSelectors = [
    'h1.text-heading-xlarge',
    'h1.inline.t-24',
    'main section h1',
    '.pv-text-details__left-panel h1',
    'section.artdeco-card h1',
    'div.ph5 h1',
    '.pv-top-card--list li:first-child',
    'main h1',
    'h1',
  ];

  let name = '';
  for (const selector of nameSelectors) {
    const el = document.querySelector(selector);
    const text = el?.textContent?.trim();
    if (text && text.length > 1 && text.length < 70 && !text.toLowerCase().includes('search') && !text.toLowerCase().includes('feed')) {
      name = text;
      break;
    }
  }

  // Fallback 1: Extract Name & Headline from document.title
  let titleHeadline = '';
  if (document.title && document.title.includes('LinkedIn')) {
    const cleanTitle = document.title
      .replace(/^\(\d+\)\s*/, '')
      .replace(/\s*\|\s*LinkedIn.*$/i, '')
      .trim();

    if (cleanTitle.includes(' - ')) {
      const parts = cleanTitle.split(' - ');
      if (!name) name = parts[0].trim();
      titleHeadline = parts.slice(1).join(' - ').trim();
    } else if (!name && cleanTitle) {
      name = cleanTitle;
    }
  }

  if (!name && !isProfile) {
    return null;
  }

  // 2. Extract Headline
  const headlineSelectors = [
    '.text-body-medium.break-words',
    '.pv-text-details__left-panel div.text-body-medium',
    'div[data-generated-suggestion-target]',
    '.pv-top-card-section__headline',
    'section.artdeco-card .text-body-medium',
    'div.ph5 .text-body-medium',
  ];

  let headline = '';
  for (const selector of headlineSelectors) {
    const el = document.querySelector(selector);
    const text = el?.textContent?.trim();
    if (text && text.length > 3) {
      headline = text;
      break;
    }
  }
  if (!headline) {
    headline = titleHeadline || 'Professional on LinkedIn';
  }

  // 3. Extract Location
  const locationSelectors = [
    '.text-body-small.inline.t-black--light.break-words',
    '.pv-text-details__left-panel span.text-body-small',
    '.pv-top-card-section__location',
  ];
  let location = '';
  for (const selector of locationSelectors) {
    const el = document.querySelector(selector);
    const text = el?.textContent?.trim();
    if (text) {
      location = text;
      break;
    }
  }

  // 4. Extract About Section
  const aboutSelectors = [
    '#about ~ .display-flex .inline-show-more-text',
    'section[data-section="about"] .inline-show-more-text',
    '#about ~ div .full-width span[aria-hidden="true"]',
    '.pv-about-section .pv-about__summary-text',
  ];
  let about = '';
  for (const selector of aboutSelectors) {
    const el = document.querySelector(selector);
    const text = el?.textContent?.trim();
    if (text) {
      about = text;
      break;
    }
  }

  // 5. Extract Current Company
  const companySelectors = [
    '.pv-text-details__right-panel button span[aria-hidden="true"]',
    '.pv-top-card--experience-list-item',
    '#experience ~ .pvs-list__outer-container li:first-child span[aria-hidden="true"]',
  ];
  let company = '';
  for (const selector of companySelectors) {
    const el = document.querySelector(selector);
    const text = el?.textContent?.trim();
    if (text) {
      company = text;
      break;
    }
  }

  if (!company && headline.includes(' at ')) {
    const parts = headline.split(' at ');
    company = parts[parts.length - 1].trim().split('|')[0].trim();
  }

  // 6. Avatar Image URL
  const avatarEl = document.querySelector<HTMLImageElement>(
    'img.pv-top-card-profile-picture__image, .presence-entity__image, img.evi-image'
  );
  const avatarUrl = avatarEl?.src || '';

  return {
    name: name || 'LinkedIn Member',
    headline,
    location,
    company: company || '',
    about: about.slice(0, 500),
    profileUrl: cleanUrl,
    avatarUrl,
  };
}

/**
 * Reads the native LinkedIn "Contact info" modal when opened by user.
 * Explicitly does NOT click dismiss so modal remains stable and visible for the user.
 */
export async function scrapeLinkedInContactInfoModal(): Promise<{
  email?: string;
  phone?: string;
  websites: string[];
  twitter?: string;
  privacyRestricted: boolean;
}> {
  // Check if modal is already open
  let modal = document.querySelector('.artdeco-modal, .pv-profile-section__section-info');

  if (!modal) {
    const contactInfoLink = document.querySelector<HTMLAnchorElement>(
      'a#top-card-text-details-contact-info, a[href*="/overlay/contact-info/"]'
    );

    if (!contactInfoLink) {
      return { websites: [], privacyRestricted: true };
    }

    // Trigger click on contact info anchor
    contactInfoLink.click();

    // Wait up to 1.5 seconds for modal to appear
    for (let i = 0; i < 15; i++) {
      await new Promise((r) => setTimeout(r, 100));
      modal = document.querySelector('.artdeco-modal, .pv-profile-section__section-info');
      if (modal) break;
    }
  }

  // Extract Email
  const emailEl = document.querySelector<HTMLAnchorElement>(
    'section.ci-email a.pv-contact-info__contact-link, .ci-email .pv-contact-info__contact-link, a[href^="mailto:"]'
  );
  const email = emailEl?.textContent?.trim() || emailEl?.href?.replace('mailto:', '').trim();

  // Extract Phone Number
  const phoneEl = document.querySelector<HTMLElement>(
    'section.ci-phone .pv-contact-info__ci-container span, .ci-phone ul li span'
  );
  const phone = phoneEl?.textContent?.trim();

  // Extract Twitter / X
  const twitterEl = document.querySelector<HTMLAnchorElement>(
    'section.ci-twitter a, .ci-twitter a'
  );
  const twitter = twitterEl?.textContent?.trim();

  // Extract Websites
  const websiteEls = document.querySelectorAll<HTMLAnchorElement>(
    'section.ci-websites a, .ci-websites a'
  );
  const websites: string[] = [];
  websiteEls.forEach((el) => {
    if (el.href && !websites.includes(el.href)) websites.push(el.href);
  });

  // DO NOT auto-dismiss: Leave modal open so user can inspect or close at will
  return {
    email: email || undefined,
    phone: phone || undefined,
    twitter: twitter || undefined,
    websites,
    privacyRestricted: !email && !phone,
  };
}
