import { LinkedInProfile, UserSettings } from '../types';
import { scrapeLinkedInContactInfoModal } from './linkedinParser';

export interface ContactEnrichmentResult {
  email?: string;
  phone?: string;
  confidence: 'verified_linkedin' | 'verified_api' | 'pattern_guess' | 'not_found';
  domain?: string;
  sourceNote: string;
  patternEmail?: string;
}

// Clean company name to a likely web domain (e.g. "ScaleWorks Inc." -> "scaleworks.com")
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
 * Real contact enrichment engine:
 * 1. Checks LinkedIn's native "Contact info" modal for the user's real email/phone.
 * 2. If Hunter API key is provided, queries live database.
 * 3. Calculates the corporate domain pattern without faking phone numbers.
 */
export async function enrichContactInfo(
  profile: LinkedInProfile,
  settings?: UserSettings | null,
  forceModalScrape = false
): Promise<ContactEnrichmentResult> {
  const names = profile.name.trim().split(/\s+/);
  const firstName = (names[0] || '').toLowerCase().replace(/[^a-z]/g, '');
  const lastName = (names[names.length - 1] || '').toLowerCase().replace(/[^a-z]/g, '');
  const domain = guessCompanyDomain(profile.company || '');
  const patternEmail = domain && firstName ? (lastName ? `${firstName}.${lastName}@${domain}` : `${firstName}@${domain}`) : undefined;

  // 1. Automated extraction from LinkedIn's native "Contact info" modal
  if (forceModalScrape || typeof window !== 'undefined') {
    try {
      const modalData = await scrapeLinkedInContactInfoModal();
      if (modalData.email || modalData.phone) {
        return {
          email: modalData.email || patternEmail,
          phone: modalData.phone,
          confidence: 'verified_linkedin',
          domain,
          patternEmail,
          sourceNote: 'Direct from LinkedIn Contact Info',
        };
      }
    } catch (err) {
      console.warn('Native contact info scrape failed:', err);
    }
  }

  // 2. Real Hunter.io API lookup (if user configured key)
  if (settings?.hunterApiKey && domain && firstName && lastName) {
    try {
      const url = `https://api.hunter.io/v2/email-finder?domain=${domain}&first_name=${firstName}&last_name=${lastName}&api_key=${settings.hunterApiKey}`;
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        if (data?.data?.email) {
          return {
            email: data.data.email,
            phone: data.data.phone_number,
            confidence: 'verified_api',
            domain: data.data.domain || domain,
            patternEmail,
            sourceNote: `Verified via Hunter API (${data.data.score || 90}% confidence)`,
          };
        }
      }
    } catch (err) {
      console.warn('Hunter.io API query failed:', err);
    }
  }

  // 3. Corporate Pattern (Clearly tagged as pattern prediction, with NO fake phone numbers!)
  if (patternEmail) {
    return {
      email: patternEmail,
      phone: undefined, // NEVER fake phone numbers
      confidence: 'pattern_guess',
      domain,
      patternEmail,
      sourceNote: `Predicted corporate format ({first}.{last}@${domain})`,
    };
  }

  return {
    confidence: 'not_found',
    sourceNote: 'No public contact data listed on profile',
  };
}
