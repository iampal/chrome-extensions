export interface OSINTDork {
  id: string;
  title: string;
  query: string;
  url: string;
  description: string;
  targetBadge: string;
}

export function generateOSINTDorks(name: string, company: string, domain?: string): OSINTDork[] {
  const cleanName = (name || '').trim().replace(/['"]/g, '');
  const cleanCompany = (company || '').trim().replace(/['"]/g, '');
  const cleanDomain = (domain || '').trim().toLowerCase();

  const dorks: OSINTDork[] = [];

  // Dork 1: Direct Work Email & Contact Info
  if (cleanDomain) {
    const q1 = `"${cleanName}" "@${cleanDomain}" email OR contact`;
    dorks.push({
      id: 'dork_work_email',
      title: 'Direct Corporate Email Search',
      query: q1,
      url: `https://www.google.com/search?q=${encodeURIComponent(q1)}`,
      description: `Scans indexed web pages, conference attendees, and directory signatures at ${cleanDomain}`,
      targetBadge: 'WORK EMAIL',
    });
  } else if (cleanCompany) {
    const q1 = `"${cleanName}" "${cleanCompany}" email OR contact OR phone`;
    dorks.push({
      id: 'dork_work_email',
      title: 'Company Email & Contact Lookup',
      query: q1,
      url: `https://www.google.com/search?q=${encodeURIComponent(q1)}`,
      description: `Scans for public email listings and direct contact details associated with ${cleanCompany}`,
      targetBadge: 'EMAIL / PHONE',
    });
  } else {
    const q1 = `"${cleanName}" email OR contact OR "get in touch"`;
    dorks.push({
      id: 'dork_work_email',
      title: 'Public Contact Search',
      query: q1,
      url: `https://www.google.com/search?q=${encodeURIComponent(q1)}`,
      description: 'Scans public web footprints and indexed contact cards',
      targetBadge: 'PUBLIC CONTACT',
    });
  }

  // Dork 2: Company PDFs, Whitepapers & Slide Decks
  const companyTerm = cleanCompany || cleanDomain;
  if (companyTerm) {
    const q2 = `"${cleanName}" "${companyTerm}" filetype:pdf email OR phone`;
    dorks.push({
      id: 'dork_pdf_filings',
      title: 'Published PDFs & SEC Filings',
      query: q2,
      url: `https://www.google.com/search?q=${encodeURIComponent(q2)}`,
      description: 'Discovers speaker decks, board disclosures, whitepapers, and published press packets',
      targetBadge: 'PDFs & DECKS',
    });
  }

  // Dork 3: Company Website Staff Directory
  if (cleanDomain) {
    const q3 = `site:${cleanDomain} "${cleanName}" email OR phone OR contact`;
    dorks.push({
      id: 'dork_staff_directory',
      title: 'Official Website Staff Directory',
      query: q3,
      url: `https://www.google.com/search?q=${encodeURIComponent(q3)}`,
      description: `Direct deep search on ${cleanDomain} for about/team/leadership bio pages`,
      targetBadge: 'STAFF DIRECTORY',
    });
  } else if (cleanCompany) {
    const q3 = `site:linkedin.com/in "${cleanName}" "${cleanCompany}" contact`;
    dorks.push({
      id: 'dork_staff_directory',
      title: 'Public LinkedIn Profile Index',
      query: q3,
      url: `https://www.google.com/search?q=${encodeURIComponent(q3)}`,
      description: `Locates cached Google search index for ${cleanName}'s profile data`,
      targetBadge: 'CACHED PROFILE',
    });
  }

  // Dork 4: Social DMs & X / Twitter
  const q4 = cleanCompany
    ? `site:x.com "${cleanName}" "${cleanCompany}"`
    : `site:x.com "${cleanName}"`;
  dorks.push({
    id: 'dork_twitter_profile',
    title: 'Verified X / Twitter Handle',
    query: q4,
    url: `https://www.google.com/search?q=${encodeURIComponent(q4)}`,
    description: 'Finds verified personal Twitter/X handles for fast social outreach and direct messages',
    targetBadge: 'X / TWITTER',
  });

  // Dork 5: Personal Email / Secondary Accounts (Bonus)
  const q5 = cleanCompany
    ? `"${cleanName}" "${cleanCompany}" ("@gmail.com" OR "@outlook.com")`
    : `"${cleanName}" ("@gmail.com" OR "@outlook.com")`;
  dorks.push({
    id: 'dork_personal_email',
    title: 'Personal Email & Secondary Accounts',
    query: q5,
    url: `https://www.google.com/search?q=${encodeURIComponent(q5)}`,
    description: 'Uncovers personal email addresses listed on newsletters, open-source repos, and blogs',
    targetBadge: 'PERSONAL EMAIL',
  });

  return dorks;
}

export function openDorkSearch(url: string): void {
  window.open(url, '_blank');
}
