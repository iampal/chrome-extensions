/**
 * Not-Ai Core Engine (TypeScript Port of udaysharmadev/Not-Ai 4.0)
 * Evaluates and edits prose into clear, specific, source-grounded human writing:
 * 1. Strips em dashes and mechanical AI punctuation
 * 2. Purges Tier 1 & Tier 2 overused model vocabulary (delve, leverage, tapestry, etc.)
 * 3. Cuts empty framing and ceremonial transitions (moreover, in today's fast-paced world)
 * 4. Ensures conversational rhythm and contractions
 */

export interface NotAiFinding {
  ruleId: string;
  category: 'INVARIANT' | 'REGISTER' | 'RESEARCH_SIGNAL' | 'HOUSE_STYLE';
  message: string;
  span?: string;
  replacement?: string;
}

export interface NotAiEvaluationResult {
  isClean: boolean;
  score: number; // 0 to 100
  findings: NotAiFinding[];
  cleanText: string;
}

// Tier 1: Overused model words found at 80-170x human rates in corpus studies
export const TIER_ONE_TERMS: Record<string, string> = {
  delve: 'explore',
  delves: 'explores',
  delving: 'exploring',
  delved: 'explored',
  tapestry: 'mix',
  camaraderie: 'teamwork',
  cacophony: 'noise',
  palpable: 'clear',
  intricate: 'detailed',
  vibrant: 'active',
  fleeting: 'brief',
  ignite: 'spark',
  ignites: 'sparks',
  igniting: 'sparking',
  unravel: 'unpack',
  unravels: 'unpacks',
  unraveling: 'unpacking',
  grapple: 'deal',
  grapples: 'deals',
  grappling: 'dealing',
  amidst: 'in',
  underscore: 'highlight',
  underscores: 'highlights',
  underscoring: 'highlighting',
  prioritize: 'focus on',
  prioritizes: 'focuses on',
  prioritizing: 'focusing on',
};

// Tier 2: Model clichés that dilute specific claims
export const TIER_TWO_TERMS: Record<string, string> = {
  leverage: 'use',
  leverages: 'uses',
  leveraging: 'using',
  leveraged: 'used',
  utilize: 'use',
  utilizes: 'uses',
  utilizing: 'using',
  utilized: 'used',
  facilitate: 'help',
  facilitates: 'helps',
  facilitating: 'helping',
  facilitated: 'helped',
  comprehensive: 'complete',
  robust: 'solid',
  seamless: 'smooth',
  seamlessly: 'smoothly',
  pivotal: 'key',
  foster: 'build',
  fosters: 'builds',
  fostering: 'building',
  fostered: 'built',
  meticulous: 'careful',
  meticulously: 'carefully',
  multifaceted: 'varied',
  transformative: 'major',
  groundbreaking: 'new',
  empower: 'help',
  empowers: 'helps',
  empowering: 'helping',
  empowered: 'helped',
  synergy: 'alignment',
  synergies: 'alignment',
  holistic: 'thorough',
  impactful: 'effective',
  landscape: 'market',
  revolutionize: 'change',
  revolutionizes: 'changes',
  revolutionizing: 'changing',
  harness: 'use',
  harnesses: 'uses',
  harnessing: 'using',
  unlock: 'open',
  unlocks: 'opens',
  unlocking: 'opening',
  elevate: 'improve',
  elevates: 'improves',
  elevating: 'improving',
  elevated: 'improved',
  showcase: 'show',
  showcases: 'shows',
  showcasing: 'showing',
  bolster: 'strengthen',
  bolsters: 'strengthens',
  bolstering: 'strengthening',
  testament: 'proof',
  enhance: 'improve',
  enhances: 'improves',
  enhancing: 'improving',
  enhanced: 'improved',
  supercharge: 'accelerate',
  unleash: 'release',
};

// Empty frames that delay the point without adding claims
export const EMPTY_FRAMES: Array<{ pattern: RegExp; replacement: string; name: string }> = [
  { pattern: /\b(?:in today's fast-paced (?:world|digital landscape|environment))\b/gi, replacement: 'today', name: "in today's fast-paced world" },
  { pattern: /\bit is (?:worth|important) to (?:note|remember|mention) that\s*/gi, replacement: '', name: 'it is worth noting that' },
  { pattern: /\bit is crucial to (?:understand|recognize) that\s*/gi, replacement: '', name: 'it is crucial to recognize that' },
  { pattern: /\bserves as a testament to\b/gi, replacement: 'proves', name: 'serves as a testament to' },
  { pattern: /\bplays a (?:crucial|pivotal|vital|key) role in\b/gi, replacement: 'directly drives', name: 'plays a crucial role in' },
  { pattern: /\bat the end of the day,?\s*/gi, replacement: '', name: 'at the end of the day' },
  { pattern: /\bwithout further ado,?\s*/gi, replacement: '', name: 'without further ado' },
];

// Mechanical ceremonial transitions
export const TEMPLATE_TRANSITIONS: Array<{ pattern: RegExp; replacement: string; name: string }> = [
  { pattern: /^[ \t]*Furthermore,?\s*/gim, replacement: 'Plus, ', name: 'Furthermore' },
  { pattern: /^[ \t]*Moreover,?\s*/gim, replacement: 'Also, ', name: 'Moreover' },
  { pattern: /^[ \t]*Additionally,?\s*/gim, replacement: 'And ', name: 'Additionally' },
  { pattern: /^[ \t]*In conclusion,?\s*/gim, replacement: 'Bottom line: ', name: 'In conclusion' },
  { pattern: /^[ \t]*To summarize,?\s*/gim, replacement: 'In short: ', name: 'To summarize' },
];

/**
 * Strips em dashes and replaces with natural human punctuation
 */
export function removeEmDashes(text: string): string {
  // Replace "—" surrounded by spaces or words with ", " or " - "
  return text
    .replace(/\s*—\s*/g, ', ')
    .replace(/\s*--\s*/g, ', ')
    .replace(/,\s*,/g, ',');
}

/**
 * Humanizes any text using Not-Ai 4.0 deterministic rules.
 */
export function humanizeWithNotAi(rawText: string): NotAiEvaluationResult {
  if (!rawText || !rawText.trim()) {
    return {
      isClean: true,
      score: 100,
      findings: [],
      cleanText: '',
    };
  }

  let text = rawText;
  const findings: NotAiFinding[] = [];

  // 1. Remove Em Dashes (Rule 8 / HOUSE_STYLE)
  if (text.includes('—') || text.includes('--')) {
    text = removeEmDashes(text);
    findings.push({
      ruleId: 'typography-em-dash',
      category: 'HOUSE_STYLE',
      message: 'Removed em dashes (—) in favor of natural punctuation cadence.',
    });
  }

  // 2. Cut Empty Framing
  for (const ef of EMPTY_FRAMES) {
    if (ef.pattern.test(text)) {
      text = text.replace(ef.pattern, ef.replacement);
      findings.push({
        ruleId: 'empty-frame',
        category: 'REGISTER',
        message: `Removed empty delay frame: "${ef.name}".`,
      });
    }
  }

  // 3. Clean Template Transitions
  for (const tt of TEMPLATE_TRANSITIONS) {
    if (tt.pattern.test(text)) {
      text = text.replace(tt.pattern, tt.replacement);
      findings.push({
        ruleId: 'template-transition',
        category: 'REGISTER',
        message: `Replaced decorative transition "${tt.name}".`,
      });
    }
  }

  // 4. Replace Tier 1 & Tier 2 Vocabulary
  const words = text.split(/\b/);
  const replacedWords: string[] = [];

  for (let i = 0; i < words.length; i++) {
    const w = words[i];
    const lower = w.toLowerCase();

    if (TIER_ONE_TERMS[lower]) {
      const rep = TIER_ONE_TERMS[lower];
      // Match case
      const finalRep = w[0] === w[0].toUpperCase() ? rep.charAt(0).toUpperCase() + rep.slice(1) : rep;
      replacedWords.push(finalRep);
      findings.push({
        ruleId: 'tier-1-vocabulary',
        category: 'RESEARCH_SIGNAL',
        message: `Replaced model-excess word "${w}" with plain equivalent "${rep}".`,
        span: w,
        replacement: rep,
      });
    } else if (TIER_TWO_TERMS[lower]) {
      const rep = TIER_TWO_TERMS[lower];
      const finalRep = w[0] === w[0].toUpperCase() ? rep.charAt(0).toUpperCase() + rep.slice(1) : rep;
      replacedWords.push(finalRep);
      findings.push({
        ruleId: 'tier-2-vocabulary',
        category: 'RESEARCH_SIGNAL',
        message: `Replaced buzzword "${w}" with grounded verb "${rep}".`,
        span: w,
        replacement: rep,
      });
    } else {
      replacedWords.push(w);
    }
  }

  text = replacedWords.join('');

  // 5. Clean up awkward double spaces or loose punctuation
  text = text.replace(/[ \t]{2,}/g, ' ');
  text = text.replace(/\s+([.,!?;:])/g, '$1');

  // Compute Not-Ai Human Score
  const penalties = findings.length * 5;
  const score = Math.max(70, Math.min(100, 100 - penalties));

  return {
    isClean: findings.length === 0,
    score,
    findings,
    cleanText: text.trim(),
  };
}
