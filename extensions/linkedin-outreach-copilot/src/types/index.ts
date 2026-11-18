export interface LinkedInProfile {
  name: string;
  headline: string;
  location?: string;
  company?: string;
  companyDomain?: string;
  email?: string;
  phone?: string;
  emailConfidence?: string;
  about?: string;
  profileUrl: string;
  avatarUrl?: string;
}

export type OutreachTone = 'casual' | 'value_focused' | 'curious' | 'direct';

export interface GeneratedIcebreaker {
  id: string;
  tone: OutreachTone;
  label: string;
  message: string;
}

export interface SavedLead {
  id: string;
  name: string;
  headline: string;
  company: string;
  companyDomain?: string;
  email?: string;
  phone?: string;
  emailConfidence?: string;
  profileUrl: string;
  selectedIcebreaker?: string;
  savedAt: string;
  notes?: string;
  status: 'saved' | 'contacted' | 'replied';
}

export interface UserSettings {
  apiKey?: string;
  aiProvider: 'gemini' | 'openai' | 'mock';
  customPitch?: string;
  userRole?: string;
  dailyQuota: number;
  usedToday: number;
  lastResetDate: string;
  isPro: boolean;
  hunterApiKey?: string;
  webhookUrl?: string;
}
