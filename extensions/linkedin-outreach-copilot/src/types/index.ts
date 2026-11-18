export interface OutreachSequence {
  touch1_linkedin_connect: string;
  touch2_linkedin_followup: string;
  touch3_email_subject: string;
  touch3_email_body: string;
  touch4_email_followup: string;
}

export interface LinkedInProfile {
  name: string;
  headline: string;
  location?: string;
  company?: string;
  companyDomain?: string;
  email?: string;
  phone?: string;
  emailConfidence?: 'verified_linkedin' | 'verified_api' | 'pattern_guess' | 'not_found';
  deliverabilityGrade?: string;
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
  deliverabilityGrade?: string;
  profileUrl: string;
  sequence?: OutreachSequence;
  selectedIcebreaker?: string;
  savedAt: string;
  notes?: string;
  listTag?: string;
  status: 'new' | 'connected' | 'emailed' | 'replied';
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
  preferredTone?: OutreachTone;
}
