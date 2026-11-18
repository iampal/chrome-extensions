import { GeneratedIcebreaker, LinkedInProfile, UserSettings } from '../types';

export async function generateIcebreakers(
  profile: LinkedInProfile,
  settings: UserSettings
): Promise<GeneratedIcebreaker[]> {
  const firstName = profile.name.split(' ')[0] || profile.name;
  const company = profile.company || 'your team';
  const role = profile.headline.split(' at ')[0] || profile.headline;

  // If Gemini API Key is provided
  if (settings.aiProvider === 'gemini' && settings.apiKey) {
    try {
      return await callGeminiAPI(profile, settings, firstName, company, role);
    } catch (err) {
      console.warn('Gemini API call failed, falling back to smart heuristic generator:', err);
    }
  }

  // If OpenAI API Key is provided
  if (settings.aiProvider === 'openai' && settings.apiKey) {
    try {
      return await callOpenAIAPI(profile, settings, firstName, company, role);
    } catch (err) {
      console.warn('OpenAI API call failed, falling back to smart heuristic generator:', err);
    }
  }

  // Smart Contextual Engine (Instant & High-converting)
  return generateSmartHeuristicHooks(firstName, company, role, profile, settings);
}

function generateSmartHeuristicHooks(
  firstName: string,
  company: string,
  role: string,
  profile: LinkedInProfile,
  settings: UserSettings
): GeneratedIcebreaker[] {
  const customAngle = settings.customPitch
    ? ` We're currently helping teams like ${company} with ${settings.customPitch}.`
    : '';

  return [
    {
      id: 'hook_1',
      tone: 'casual',
      label: 'Casual Compliment',
      message: `Hi ${firstName}, came across your profile while exploring leaders in ${role.slice(0, 35)}. Really impressed by the work you're driving at ${company}! Would love to connect and follow your journey.`,
    },
    {
      id: 'hook_2',
      tone: 'value_focused',
      label: 'Problem / Value Angle',
      message: `Hi ${firstName}, saw you're leading ${role} at ${company}.${customAngle} Curious if optimizing your team's workflow is something on your radar this quarter? Either way, happy to connect!`,
    },
    {
      id: 'hook_3',
      tone: 'curious',
      label: 'Peer Curiosity Hook',
      message: `Hey ${firstName}, love how ${company} is approaching growth in your space. Quick question: what's been your biggest priority as ${role.slice(0, 30)} lately? Thought I'd reach out directly!`,
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
  const prompt = `You are an elite B2B cold outreach expert. Write 3 distinct, high-converting LinkedIn connection request messages (under 280 characters each, no hashtags, no generic fluff, sounds natural and human).
Target Profile:
- Name: ${profile.name} (First name: ${firstName})
- Headline/Role: ${role}
- Company: ${company}
- Location: ${profile.location || 'N/A'}
- About: ${profile.about || 'N/A'}
${settings.customPitch ? `Sender Offer/Context: ${settings.customPitch}` : ''}

Output strictly valid JSON with format:
[
  {"id": "hook_1", "tone": "casual", "label": "Casual Compliment", "message": "..."},
  {"id": "hook_2", "tone": "value_focused", "label": "Value Pitch", "message": "..."},
  {"id": "hook_3", "tone": "curious", "label": "Curiosity Hook", "message": "..."}
]`;

  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${settings.apiKey}`;
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { responseMimeType: 'application/json' },
    }),
  });

  if (!response.ok) {
    throw new Error(`Gemini API HTTP ${response.status}`);
  }

  const data = await response.json();
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
  const prompt = `Write 3 distinct, hyper-personalized LinkedIn cold outreach messages (under 280 characters each, no cheesy openings, sounds like a real professional peer).
Profile:
- Name: ${firstName}
- Role: ${role}
- Company: ${company}
- About: ${profile.about || 'N/A'}
${settings.customPitch ? `Sender context: ${settings.customPitch}` : ''}

Format as JSON array with items having keys: id, tone, label, message.`;

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
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

  if (!response.ok) {
    throw new Error(`OpenAI API HTTP ${response.status}`);
  }

  const data = await response.json();
  const content = JSON.parse(data.choices[0].message.content);
  return Array.isArray(content) ? content : content.messages || content.hooks;
}
