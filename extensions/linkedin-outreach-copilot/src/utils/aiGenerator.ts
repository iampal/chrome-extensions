import { GeneratedIcebreaker, LinkedInProfile, OutreachSequence, UserSettings } from '../types';

export function extractRoleFocus(headline: string): string {
  const h = (headline || '').toLowerCase();
  if (h.includes('sale') || h.includes('growth') || h.includes('revenue') || h.includes('cro') || h.includes('sdr') || h.includes('bdr')) return 'sales pipeline';
  if (h.includes('engineer') || h.includes('tech') || h.includes('cto') || h.includes('developer') || h.includes('software')) return 'engineering stack';
  if (h.includes('product') || h.includes('cpo')) return 'product roadmap';
  if (h.includes('operat') || h.includes('coo')) return 'internal operations';
  if (h.includes('market') || h.includes('cmo') || h.includes('brand') || h.includes('demand')) return 'customer acquisition';
  if (h.includes('recruit') || h.includes('talent') || h.includes('people') || h.includes('hr')) return 'talent acquisition';
  if (h.includes('founder') || h.includes('ceo') || h.includes('president') || h.includes('co-founder') || h.includes('partner')) return 'executive initiatives';
  return 'team priorities';
}

export function generateContextualSubjectLine(
  firstName: string,
  company: string,
  roleFocus: string,
  role: string
): string {
  const cleanCompany = company && company !== 'your team' && company !== 'Unknown' ? company.trim() : '';

  if (cleanCompany) {
    switch (roleFocus) {
      case 'sales pipeline':
        return `${cleanCompany}'s outbound pipeline & rep efficiency`;
      case 'engineering stack':
        return `Quick question re: ${cleanCompany}'s tech stack`;
      case 'product roadmap':
        return `Idea for ${cleanCompany}'s product roadmap`;
      case 'internal operations':
        return `Streamlining ${cleanCompany}'s internal workflows`;
      case 'customer acquisition':
        return `${cleanCompany}'s B2B customer acquisition`;
      case 'talent acquisition':
        return `${cleanCompany}'s candidate pipeline & hiring`;
      case 'executive initiatives':
        return `${cleanCompany}'s scaling milestones - quick thought`;
      default:
        return `${cleanCompany}'s ${roleFocus} - quick inquiry`;
    }
  }

  // Fallback when company is not explicitly listed
  const cleanRole = role.split(' at ')[0].slice(0, 26);
  return `${firstName} - quick question regarding ${cleanRole}`;
}

export async function generateIcebreakers(
  profile: LinkedInProfile,
  settings: UserSettings
): Promise<GeneratedIcebreaker[]> {
  const firstName = profile.name.split(' ')[0] || profile.name;
  const company = profile.company || 'your team';
  const role = profile.headline.split(' at ')[0] || profile.headline;

  if (settings.aiProvider === 'gemini' && settings.apiKey) {
    try {
      return await callGeminiAPI(profile, settings, firstName, company, role);
    } catch (err) {
      console.warn('Gemini API call failed, falling back to smart heuristic generator:', err);
    }
  }

  if (settings.aiProvider === 'openai' && settings.apiKey) {
    try {
      return await callOpenAIAPI(profile, settings, firstName, company, role);
    } catch (err) {
      console.warn('OpenAI API call failed, falling back to smart heuristic generator:', err);
    }
  }

  return generateSmartHeuristicHooks(firstName, company, role, profile, settings);
}

export async function generateOutreachSequence(
  profile: LinkedInProfile,
  settings: UserSettings
): Promise<OutreachSequence> {
  const firstName = profile.name.split(' ')[0] || profile.name;
  const company = profile.company && profile.company !== 'Unknown' ? profile.company : 'your team';
  const role = profile.headline.split(' at ')[0] || profile.headline;
  const roleFocus = extractRoleFocus(profile.headline);
  const pitch = settings.customPitch || 'automating high-touch outbound workflows and increasing reply rates';

  // If Gemini API is available
  if (settings.aiProvider === 'gemini' && settings.apiKey) {
    try {
      const prompt = `You are an elite B2B outbound sales director. Create an ultra-relevant 4-step multi-channel outreach sequence for:
Prospect: ${profile.name} (First name: ${firstName})
Role: ${role} (Focus area: ${roleFocus})
Company: ${company}
Sender Offer: ${pitch}

Subject Line Requirements: Absolutely NO generic clickbait like "quick question" or "hello". Write a hyper-relevant subject line directly addressing their exact role and company (e.g. "${company}'s outbound pipeline & rep efficiency" or "Idea for ${company}'s ${roleFocus}").

Return JSON strictly with format:
{
  "touch1_linkedin_connect": "Connection note under 280 chars referencing their work",
  "touch2_linkedin_followup": "LinkedIn follow-up message 2 days after connect under 320 chars with peer question",
  "touch3_email_subject": "Contextual, relevant subject line under 6 words tailored to ${company} and ${roleFocus}",
  "touch3_email_body": "3-sentence personalized cold email under 80 words addressing ${roleFocus} pain points with a soft low-pressure CTA",
  "touch4_email_followup": "1-sentence polite bump email 4 days later"
}`;

      const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${settings.apiKey}`;
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { responseMimeType: 'application/json' },
        }),
      });

      if (res.ok) {
        const data = await res.json();
        const parsed = JSON.parse(data?.candidates?.[0]?.content?.parts?.[0]?.text);
        if (parsed.touch3_email_subject) return parsed;
      }
    } catch (e) {
      console.warn('Sequence generation via Gemini failed, falling back to contextual generator:', e);
    }
  }

  // Built-in Highly Relevant Contextual Sequence
  const relevantSubject = generateContextualSubjectLine(firstName, company, roleFocus, role);

  return {
    touch1_linkedin_connect: `Hi ${firstName}, came across your work leading ${role.slice(0, 32)} at ${company}. Really impressed by the team's trajectory! Would love to connect and follow your journey.`,
    touch2_linkedin_followup: `Hey ${firstName}, thanks for connecting! Quick question: how are you and the team at ${company} currently optimizing your ${roleFocus} workflows this quarter? Always love exchanging notes with peers in your space.`,
    touch3_email_subject: relevantSubject,
    touch3_email_body: `Hi ${firstName},\n\nSaw you're steering ${role} at ${company}. When speaking with other leaders in ${roleFocus}, the biggest bottleneck right now is ${pitch}.\n\nWe helped similar teams eliminate 8+ hours of manual overhead per rep while increasing pipeline response rates by 40%.\n\nOpen to a brief 5-minute chat next Tuesday to see how ${company} compares?\n\nBest,\n[Your Name]`,
    touch4_email_followup: `Hi ${firstName}, wanted to quickly bump this in case it got buried. Any interest in exploring this for ${company}'s ${roleFocus}, or is this not a priority right now?`,
  };
}

function generateSmartHeuristicHooks(
  firstName: string,
  company: string,
  role: string,
  profile: LinkedInProfile,
  settings: UserSettings
): GeneratedIcebreaker[] {
  const roleFocus = extractRoleFocus(profile.headline);
  const customAngle = settings.customPitch
    ? ` We're currently helping teams like ${company} with ${settings.customPitch}.`
    : '';

  return [
    {
      id: 'hook_1',
      tone: 'casual',
      label: 'Casual Compliment',
      message: `Hi ${firstName}, came across your profile while following leaders in ${roleFocus}. Really impressed by what you're building at ${company}! Would love to connect.`,
    },
    {
      id: 'hook_2',
      tone: 'value_focused',
      label: 'Role-Specific Value Angle',
      message: `Hi ${firstName}, saw you're driving ${role} at ${company}.${customAngle} Curious if optimizing your team's ${roleFocus} efficiency is a focus this quarter? Either way, happy to connect!`,
    },
    {
      id: 'hook_3',
      tone: 'curious',
      label: 'Peer Curiosity Hook',
      message: `Hey ${firstName}, love ${company}'s approach to growth. Quick question: what's been your biggest priority around ${roleFocus} lately? Thought I'd reach out directly!`,
    },
  ];
}

async function callGeminiAPI(
  profile: LinkedInProfile,
  settings: UserSettings,
  firstName: string,
  company: string,
  role: string
): Promise<GeneratedIcebreaker[]> {
  const roleFocus = extractRoleFocus(profile.headline);
  const prompt = `You are an elite B2B cold outreach expert. Write 3 distinct, high-converting LinkedIn connection request messages (under 280 characters each, no hashtags, no generic fluff, sounds natural and human).
Target Profile:
- Name: ${profile.name} (First name: ${firstName})
- Headline/Role: ${role} (Focus: ${roleFocus})
- Company: ${company}
- My Offer: ${settings.customPitch || 'B2B outreach automation'}

Return JSON array of 3 objects with structure:
[
  { "id": "hook_1", "tone": "casual", "label": "Casual Compliment", "message": "..." },
  { "id": "hook_2", "tone": "value_focused", "label": "Value Angle", "message": "..." },
  { "id": "hook_3", "tone": "curious", "label": "Peer Question", "message": "..." }
]`;

  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${settings.apiKey}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { responseMimeType: 'application/json' },
    }),
  });

  if (!res.ok) {
    throw new Error(`Gemini API error: ${res.statusText}`);
  }

  const data = await res.json();
  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
  return JSON.parse(text);
}

async function callOpenAIAPI(
  profile: LinkedInProfile,
  settings: UserSettings,
  firstName: string,
  company: string,
  role: string
): Promise<GeneratedIcebreaker[]> {
  const roleFocus = extractRoleFocus(profile.headline);
  const prompt = `You are an elite B2B cold outreach expert. Write 3 distinct, high-converting LinkedIn connection request messages (under 280 characters each, no hashtags, sounds natural).
Target: ${profile.name}, Role: ${role} (${roleFocus}), Company: ${company}.
Return JSON array with "id", "tone", "label", "message".`;

  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${settings.apiKey}`,
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: prompt }],
      response_format: { type: 'json_object' },
    }),
  });

  if (!res.ok) {
    throw new Error(`OpenAI API error: ${res.statusText}`);
  }

  const data = await res.json();
  const parsed = JSON.parse(data?.choices?.[0]?.message?.content);
  return Array.isArray(parsed) ? parsed : parsed.hooks || [];
}
