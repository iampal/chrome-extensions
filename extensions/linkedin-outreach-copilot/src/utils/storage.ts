import { SavedLead, UserSettings } from '../types';

const DEFAULT_SETTINGS: UserSettings = {
  aiProvider: 'gemini',
  dailyQuota: 5,
  usedToday: 0,
  lastResetDate: new Date().toISOString().split('T')[0],
  isPro: false,
};

export async function getSettings(): Promise<UserSettings> {
  return new Promise((resolve) => {
    if (typeof chrome === 'undefined' || !chrome.storage?.sync) {
      const local = localStorage.getItem('outreach_copilot_settings');
      resolve(local ? JSON.parse(local) : DEFAULT_SETTINGS);
      return;
    }

    chrome.storage.sync.get(['settings'], (result) => {
      const settings = (result.settings as UserSettings) || DEFAULT_SETTINGS;
      const today = new Date().toISOString().split('T')[0];

      // Reset daily quota if new day
      if (settings.lastResetDate !== today) {
        settings.usedToday = 0;
        settings.lastResetDate = today;
        saveSettings(settings);
      }

      resolve(settings);
    });
  });
}

export async function saveSettings(settings: UserSettings): Promise<void> {
  return new Promise((resolve) => {
    if (typeof chrome === 'undefined' || !chrome.storage?.sync) {
      localStorage.setItem('outreach_copilot_settings', JSON.stringify(settings));
      resolve();
      return;
    }

    chrome.storage.sync.set({ settings }, () => resolve());
  });
}

export async function checkAndIncrementQuota(): Promise<{ allowed: boolean; remaining: number }> {
  const settings = await getSettings();
  if (settings.isPro) {
    return { allowed: true, remaining: 999999 };
  }

  if (settings.usedToday >= settings.dailyQuota) {
    return { allowed: false, remaining: 0 };
  }

  settings.usedToday += 1;
  await saveSettings(settings);
  return { allowed: true, remaining: settings.dailyQuota - settings.usedToday };
}

export async function getSavedLeads(): Promise<SavedLead[]> {
  return new Promise((resolve) => {
    if (typeof chrome === 'undefined' || !chrome.storage?.local) {
      const local = localStorage.getItem('outreach_copilot_leads');
      resolve(local ? JSON.parse(local) : []);
      return;
    }

    chrome.storage.local.get(['savedLeads'], (result) => {
      resolve((result.savedLeads as SavedLead[]) || []);
    });
  });
}

export async function saveLead(lead: Omit<SavedLead, 'id' | 'savedAt' | 'status'>): Promise<SavedLead> {
  const leads = await getSavedLeads();
  const newLead: SavedLead = {
    ...lead,
    id: 'lead_' + Date.now(),
    savedAt: new Date().toISOString(),
    status: 'saved',
  };

  // Prevent duplicate by profile URL
  const existingIdx = leads.findIndex((l) => l.profileUrl === lead.profileUrl);
  if (existingIdx >= 0) {
    leads[existingIdx] = { ...leads[existingIdx], ...newLead };
  } else {
    leads.unshift(newLead);
  }

  return new Promise((resolve) => {
    if (typeof chrome === 'undefined' || !chrome.storage?.local) {
      localStorage.setItem('outreach_copilot_leads', JSON.stringify(leads));
      resolve(newLead);
      return;
    }

    chrome.storage.local.set({ savedLeads: leads }, () => resolve(newLead));
  });
}

export async function deleteLead(id: string): Promise<void> {
  const leads = await getSavedLeads();
  const filtered = leads.filter((l) => l.id !== id);

  return new Promise((resolve) => {
    if (typeof chrome === 'undefined' || !chrome.storage?.local) {
      localStorage.setItem('outreach_copilot_leads', JSON.stringify(filtered));
      resolve();
      return;
    }

    chrome.storage.local.set({ savedLeads: filtered }, () => resolve());
  });
}

export function exportLeadsToCSV(leads: SavedLead[]): string {
  if (!leads.length) return '';

  const headers = ['Name', 'Email', 'Phone', 'Confidence', 'Headline', 'Company', 'Profile URL', 'Selected Icebreaker', 'Status', 'Saved At'];
  const rows = leads.map((l) => [
    `"${(l.name || '').replace(/"/g, '""')}"`,
    `"${(l.email || '').replace(/"/g, '""')}"`,
    `"${(l.phone || '').replace(/"/g, '""')}"`,
    `"${(l.emailConfidence || '').replace(/"/g, '""')}"`,
    `"${(l.headline || '').replace(/"/g, '""')}"`,
    `"${(l.company || '').replace(/"/g, '""')}"`,
    `"${(l.profileUrl || '').replace(/"/g, '""')}"`,
    `"${(l.selectedIcebreaker || '').replace(/"/g, '""')}"`,
    `"${l.status}"`,
    `"${l.savedAt}"`,
  ]);

  return [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
}
