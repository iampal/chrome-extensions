export interface OSINTDork {
  title: string;
  query: string;
  url: string;
  description: string;
}

export function generateOSINTDorks(name: string, company: string, domain: string): OSINTDork[] {
  const cleanName = name.trim();
  const cleanDomain = domain.trim();
  const cleanCompany = company.trim();

  const dorks: OSINTDork[] = [
    {
      title: 'Direct Corporate Email Search',
      query: `"${cleanName}" "@${cleanDomain}" email OR contact`,
      url: `https://www.google.com/search?q=${encodeURIComponent(`"${cleanName}" "@${cleanDomain}" email OR contact`)}`,
      description: 'Finds published work emails indexed in web pages, directories, and signatures',
    },
    {
      title: 'Company PDFs & Whitepapers',
      query: `"${cleanName}" "${cleanCompany}" filetype:pdf email OR phone`,
      url: `https://www.google.com/search?q=${encodeURIComponent(`"${cleanName}" "${cleanCompany}" filetype:pdf email OR phone`)}`,
      description: 'Scans conference lists, SEC filings, press releases, and published reports',
    },
    {
      title: 'Company Website Directory',
      query: `site:${cleanDomain} "${cleanName}" email OR phone OR contact`,
      url: `https://www.google.com/search?q=${encodeURIComponent(`site:${cleanDomain} "${cleanName}" email OR phone OR contact`)}`,
      description: `Searches directly on ${cleanDomain} for public staff listings`,
    },
    {
      title: 'Social & Twitter/X Profiles',
      query: `site:x.com "${cleanName}" "${cleanCompany}"`,
      url: `https://www.google.com/search?q=${encodeURIComponent(`site:x.com "${cleanName}" "${cleanCompany}"`)}`,
      description: 'Finds verified personal X/Twitter handle for social DMs',
    },
  ];

  return dorks;
}

export function openDorkSearch(url: string): void {
  window.open(url, '_blank');
}
