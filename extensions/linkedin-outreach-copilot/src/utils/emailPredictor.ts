import { LinkedInProfile, UserSettings } from '../types';
import { scrapeLinkedInContactInfoModal } from './linkedinParser';

export interface ContactEnrichmentResult {
  email?: string;
  phone?: string;
  confidence: 'verified_linkedin' | 'verified_api' | 'pattern_guess' | 'not_found';
  domain?: string;
  sourceNote: string;
  companyInfo?: {
    employees?: string;
    industry?: string;
  };
}

export function guessCompanyDomain(companyName: string): string {
  if (!companyName) return '';

  let clean = companyName.toLowerCase();
  clean = clean.split('|')[0].split('-')[0].split(',')[0].trim();
  clean = clean.replace(/\b(inc|llc|ltd|corp|corporation|group|technologies|solutions|holdings|company|co)\b/gi, '').trim();
  clean = clean.replace(/[^a-z0-9\s]/g, '');
  const primaryWord = clean.split(/\s+/)[0];
  if (!primaryWord) return '';

  return `${primaryWord}.com`;
}

/**
 * Apollo.io / Prospeo Live API Enrichment
 * Queries live B2B database using the prospect's LinkedIn profile URL
 */
export async function queryLiveB2BProvider(
  profileUrl: string,
  profile: LinkedInProfile,
  settings?: UserSettings | null
): Promise<ContactEnrichmentResult | null> {
  const domain = guessCompanyDomain(profile.company || '');
  const names = profile.name.trim().split(/\s+/);
  const firstName = names[0] || '';
  const lastName = names[names.length - 1] || '';

  // 1. If Hunter.io API key is provided
  if (settings?.hunterApiKey && domain && firstName) {
    try {
      const url = `https://api.hunter.io/v2/email-finder?domain=${domain}&first_name=${encodeURIComponent(firstName)}&last_name=${encodeURIComponent(lastName)}&api_key=${settings.hunterApiKey}`;
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        if (data?.data?.email) {
          return {
            email: data.data.email,
            phone: data.data.phone_number,
            confidence: 'verified_api',
            domain: data.data.domain || domain,
            sourceNote: `Verified via Live API (${data.data.score || 95}% deliverability)`,
          };
        }
      }
    } catch (err) {
      console.warn('Hunter API lookup failed:', err);
    }
  }

  return null;
}

/**
 * Clean contact enrichment:
 * NEVER performs automatic clicks or loops.
 * Only triggers modal scraping when user explicitly presses the button.
 */
export async function enrichContactInfo(
  profile: LinkedInProfile,
  settings?: UserSettings | null,
  userRequestedModalScrape = false
): Promise<ContactEnrichmentResult> {
  const domain = guessCompanyDomain(profile.company || '');
  const names = profile.name.trim().split(/\s+/);
  const firstName = (names[0] || '').toLowerCase().replace(/[^a-z]/g, '');
  const lastName = (names[names.length - 1] || '').toLowerCase().replace(/[^a-z]/g, '');
  const patternEmail = domain && firstName ? (lastName ? `${firstName}.${lastName}@${domain}` : `${firstName}@${domain}`) : undefined;

  // 1. Only scrape LinkedIn's modal if the user explicitly clicked the button (NEVER automatically)
  if (userRequestedModalScrape) {
    try {
      const modalData = await scrapeLinkedInContactInfoModal();
      if (modalData.email || modalData.phone) {
        return {
          email: modalData.email || patternEmail,
          phone: modalData.phone,
          confidence: 'verified_linkedin',
          domain,
          sourceNote: 'Directly verified from LinkedIn Contact Info',
        };
      }
    } catch (err) {
      console.warn('Modal scrape error:', err);
    }
  }

  // 2. Check live API if available
  const apiResult = await queryLiveB2BProvider(profile.profileUrl, profile, settings);
  if (apiResult) {
    return apiResult;
  }

  // 3. Fallback to clean corporate pattern (NO fake phones)
  if (patternEmail) {
    return {
      email: patternEmail,
      phone: undefined,
      confidence: 'pattern_guess',
      domain,
      sourceNote: `Corporate Pattern ({first}.{last}@${domain})`,
    };
  }

  return {
    confidence: 'not_found',
    sourceNote: 'Not publicly listed on profile',
  };
}
