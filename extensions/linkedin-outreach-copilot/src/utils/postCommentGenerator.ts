import { UserSettings } from '../types';
import { humanizeWithNotAi } from './notAiFilter';

export interface LinkedInPostDraft {
  id: string;
  style: 'story' | 'framework' | 'contrarian';
  title: string;
  content: string;
  notAiScore: number;
}

export interface LinkedInCommentDraft {
  id: string;
  type: 'insight' | 'question' | 'perspective';
  label: string;
  content: string;
  notAiScore: number;
}

/**
 * Generates 3 source-grounded, humanized LinkedIn posts based on Not-Ai rules:
 * - No em dashes
 * - No robotic AI filler ("in today's fast-paced world", "delve", "leverage", "game-changer")
 * - High scannability with 1-2 sentence paragraphs
 * - Concrete details, natural contractions, and authentic endings
 */
export async function generateLinkedInPosts(
  topicOrNotes: string,
  settings: UserSettings
): Promise<LinkedInPostDraft[]> {
  const cleanInput = (topicOrNotes || 'Scaling outbound sales workflows without hiring more reps').trim();

  // If Gemini API is configured
  if (settings.aiProvider === 'gemini' && settings.apiKey) {
    try {
      const prompt = `You are a viral LinkedIn creator who writes using the "Not-Ai" editorial method.
Rules from Not-Ai:
1. Absolutely NO em dashes (—). Use commas or hyphens.
2. Absolutely NO buzzwords: delve, leverage, utilize, seamless, pivotal, transformative, groundbreaking, tapestry, vibrant, "in today's fast-paced world", "it is worth noting".
3. Write with high scannability: 1-2 short sentences per paragraph with blank lines between paragraphs.
4. Use first-person naturally with real contractions (I've, we're, don't).
5. Ground claims in real observations, not generic cheerleading.

Input Topic/Notes: "${cleanInput}"

Generate JSON with 3 distinct posts:
{
  "story": "Story-driven post starting with a concrete event, tension, resolution, and takeaway.",
  "framework": "Step-by-step actionable framework with clear bullet points and actionable advice.",
  "contrarian": "A contrarian observation that challenges common industry misconceptions respectfully."
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
        if (parsed.story && parsed.framework) {
          return [
            createPostDraft('post_1', 'story', '📖 Story & Lesson', parsed.story),
            createPostDraft('post_2', 'framework', '⚡ Actionable Playbook', parsed.framework),
            createPostDraft('post_3', 'contrarian', '💡 Contrarian Truth', parsed.contrarian),
          ];
        }
      }
    } catch (e) {
      console.warn('Gemini post generation failed, falling back to Not-Ai smart templates:', e);
    }
  }

  // Built-in Not-Ai Heuristic Posts
  return [
    createPostDraft(
      'post_1',
      'story',
      '📖 Story & Lesson',
      `Most teams think scaling outreach means buying more contact lists.\n\nThree weeks ago, we tested this assumption directly on ${cleanInput}.\n\nInstead of blasting 500 cold templates, we sent 40 highly specific, one-line notes referencing published company projects.\n\nThe outcome:\n• 18 connection acceptances (45% rate)\n• 9 substantive conversations started\n• 3 qualified pipeline calls booked\n\nHigh volume hides bad targeting. A single relevant line beats three paragraphs of polished generic copy every single time.\n\nWhat has been your team's experience with outreach volume vs personalization this quarter?`
    ),
    createPostDraft(
      'post_2',
      'framework',
      '⚡ Actionable Playbook',
      `Here is a simple framework we use for ${cleanInput}:\n\n1. Find verified triggers first\nLook for job changes, SEC filings, or recent engineering blog updates before drafting a single word.\n\n2. Cut the first two sentences\nDelete "hope this finds you well" and "my name is X". Lead immediately with the problem you solve.\n\n3. Use low-friction CTAs\nNever ask for 30 minutes on a first touch. Ask for their perspective on a 1-sentence hypothesis.\n\n4. Follow up on LinkedIn after email\nMulti-channel touchpoints double response rates when spaced 48 hours apart.\n\nKeep it simple. Eliminate friction.`
    ),
    createPostDraft(
      'post_3',
      'contrarian',
      '💡 Contrarian Truth',
      `Unpopular opinion about ${cleanInput}:\n\nMost outbound sequences fail because they sound like an AI wrote them.\n\nWhen a prospect sees phrases like "in today's digital landscape" or "delve into your workflow", their brain instantly marks it as spam.\n\nThe highest-converting messages in 2026 look like a quick note typed from a phone by a peer who actually knows their market.\n\nDrop the corporate jargon. Speak like a human with real data.\n\nCurious: what is the worst outreach cliché in your inbox right now?`
    ),
  ];
}

/**
 * Generates 3 thoughtful, authentic comments on a LinkedIn post using Not-Ai guidelines.
 */
export async function generateLinkedInComments(
  postSnippet: string,
  settings: UserSettings
): Promise<LinkedInCommentDraft[]> {
  const cleanSnippet = (postSnippet || 'Sharing thoughts on pipeline growth and outbound sales strategy').trim().slice(0, 500);

  // If Gemini API is configured
  if (settings.aiProvider === 'gemini' && settings.apiKey) {
    try {
      const prompt = `You are a senior executive leaving a high-value, authentic comment on a LinkedIn post.
Post snippet to comment on: "${cleanSnippet}"

Rules from Not-Ai:
1. No em dashes (—).
2. No generic filler ("Great post!", "Thanks for sharing!", "100% agree!", "So inspiring!").
3. Keep it 2 to 4 sentences max.
4. Add genuine substance, a peer tradeoff, or a thoughtful question.

Generate JSON with 3 comments:
{
  "insight": "Adds a specific peer observation or real-world tradeoff to their point.",
  "question": "Asks an insightful follow-up question on how they handle edge cases.",
  "perspective": "Offers a respectful alternative angle or constraint based on experience."
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
        if (parsed.insight && parsed.question) {
          return [
            createCommentDraft('comm_1', 'insight', '💡 Peer Value-Add', parsed.insight),
            createCommentDraft('comm_2', 'question', '❓ Thoughtful Question', parsed.question),
            createCommentDraft('comm_3', 'perspective', '⚖️ Nuanced Perspective', parsed.perspective),
          ];
        }
      }
    } catch (e) {
      console.warn('Gemini comment generation failed, using Not-Ai heuristic templates:', e);
    }
  }

  // Built-in Smart Heuristic Not-Ai Comments
  return [
    createCommentDraft(
      'comm_1',
      'insight',
      '💡 Peer Value-Add',
      `Spot on observation. We saw the exact same pattern when testing this: cutting the ceremonial preamble cut drop-off by nearly half. Focusing strictly on the primary bottleneck gives prospects a reason to reply.`
    ),
    createCommentDraft(
      'comm_2',
      'question',
      '❓ Thoughtful Question',
      `Really interesting takeaway here. How do you and your team balance this when dealing with enterprise accounts that have multiple decision-makers across engineering and procurement?`
    ),
    createCommentDraft(
      'comm_3',
      'perspective',
      '⚖️ Nuanced Perspective',
      `Great breakdown. One nuance we noticed is that timing often matters more than channel: reaching someone within 48 hours of an announced initiative consistently outperforms cold outbound regardless of pitch length.`
    ),
  ];
}

function createPostDraft(id: string, style: 'story' | 'framework' | 'contrarian', title: string, text: string): LinkedInPostDraft {
  const evaluated = humanizeWithNotAi(text);
  return {
    id,
    style,
    title,
    content: evaluated.cleanText,
    notAiScore: evaluated.score,
  };
}

function createCommentDraft(id: string, type: 'insight' | 'question' | 'perspective', label: string, text: string): LinkedInCommentDraft {
  const evaluated = humanizeWithNotAi(text);
  return {
    id,
    type,
    label,
    content: evaluated.cleanText,
    notAiScore: evaluated.score,
  };
}
