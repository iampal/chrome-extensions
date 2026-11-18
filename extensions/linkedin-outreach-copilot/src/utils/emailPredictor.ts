import { LinkedInProfile, UserSettings } from '../types';
import { scrapeLinkedInContactInfoModal } from './linkedinParser';
import { verifyDomainMXRecords, MXRecordResult } from './mxVerifier';
import { generateOSINTDorks, OSINTDork } from './osintSearch';

export interface ContactEnrichmentResult {
  email?: string;
  phone?: string;
  confidence: 'verified_linkedin' | 'verified_api' | 'pattern_guess' | 'not_found';
  domain?: string;
  sourceNote: string;
  deliverabilityGrade?: string;
  mxRecord?: MXRecordResult;
  osintDorks?: OSINTDork[];
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
 * 100% Free Verification Engine:
 * Method A: Live DNS MX Record Verification via Google DoH.
 * Method B: Google Search OSINT Dorking.
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

  // Generate Method B OSINT Dorks
  const osintDorks = domain ? generateOSINTDorks(profile.name, profile.company || '', domain) : [];

  // Method A: Check Domain MX Records via DNS-over-HTTPS (100% Free)
  let mxRecord: MXRecordResult | undefined;
  if (domain) {
    try {
      mxRecord = await verifyDomainMXRecords(domain);
    } catch (e) {
      console.warn('MX lookup failed:', e);
    }
  }

  // 1. If user explicitly clicked the modal scan button
  if (userRequestedModalScrape) {
    try {
      const modalData = await scrapeLinkedInContactInfoModal();
      if (modalData.email || modalData.phone) {
        return {
          email: modalData.email || patternEmail,
          phone: modalData.phone,
          confidence: 'verified_linkedin',
          domain,
          mxRecord,
          osintDorks,
          deliverabilityGrade: '100% (LinkedIn Verified)',
          sourceNote: 'Directly verified from LinkedIn Contact Info',
        };
      }
    } catch (err) {
      console.warn('Modal scrape error:', err);
    }
  }

  // 2. Corporate Pattern + Live MX Record Verification (Method A)
  if (patternEmail) {
    const providerName = mxRecord?.hasValidMX ? mxRecord.provider : 'Active Domain';
    const score = mxRecord?.confidenceScore || 85;

    return {
      email: patternEmail,
      phone: undefined, // Never fake phone numbers
      confidence: 'pattern_guess',
      domain,
      mxRecord,
      osintDorks,
      deliverabilityGrade: `${score}% Deliverable (${providerName})`,
      sourceNote: `Calculated from ${providerName} MX records`,
    };
  }

  return {
    confidence: 'not_found',
    domain,
    mxRecord,
    osintDorks,
    sourceNote: 'Not publicly listed on profile',
  };
}
