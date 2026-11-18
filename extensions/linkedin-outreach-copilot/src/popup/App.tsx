import React, { useState, useEffect } from 'react';
import { SavedLead, UserSettings } from '../types';
import { getSettings, saveSettings, getSavedLeads, deleteLead, exportLeadsToCSV } from '../utils/storage';
import { Sparkles, Users, Settings as SettingsIcon, Download, Trash2, ExternalLink, ShieldCheck, Zap, Key } from 'lucide-react';

export const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'leads' | 'settings'>('leads');
  const [leads, setLeads] = useState<SavedLead[]>([]);
  const [settings, setSettings] = useState<UserSettings>({
    aiProvider: 'gemini',
    dailyQuota: 5,
    usedToday: 0,
    lastResetDate: new Date().toISOString().split('T')[0],
    isPro: false,
  });
  const [saveStatus, setSaveStatus] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const s = await getSettings();
    setSettings(s);
    const l = await getSavedLeads();
    setLeads(l);
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    await saveSettings(settings);
    setSaveStatus('Settings saved!');
    setTimeout(() => setSaveStatus(null), 2500);
  };

  const handleDownloadCSV = () => {
    const csvContent = exportLeadsToCSV(leads);
    if (!csvContent) return;

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `linkedin_leads_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleDeleteLead = async (id: string) => {
    await deleteLead(id);
    setLeads((prev) => prev.filter((l) => l.id !== id));
  };

  const toggleProSimulated = async () => {
    const updated = { ...settings, isPro: !settings.isPro };
    setSettings(updated);
    await saveSettings(updated);
  };

  return (
    <div style={{ width: '380px', minHeight: '520px', backgroundColor: '#ffffff', fontFamily: 'system-ui, -apple-system, sans-serif', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <div style={{ backgroundColor: '#0a66c2', color: '#ffffff', padding: '16px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Sparkles size={20} color="#fde047" />
          <span style={{ fontWeight: 700, fontSize: '16px' }}>Outreach Copilot</span>
        </div>
        {settings.isPro ? (
          <span style={{ backgroundColor: '#fde047', color: '#854d0e', fontSize: '11px', fontWeight: 800, padding: '3px 8px', borderRadius: '4px' }}>
            PRO ACTIVE
          </span>
        ) : (
          <span style={{ backgroundColor: 'rgba(255,255,255,0.2)', fontSize: '11px', padding: '3px 8px', borderRadius: '4px' }}>
            {settings.dailyQuota - settings.usedToday} Left Today
          </span>
        )}
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', borderBottom: '1px solid #e2e8f0', backgroundColor: '#f8fafc' }}>
        <button
          onClick={() => setActiveTab('leads')}
          style={{
            flex: 1,
            padding: '10px',
            border: 'none',
            background: 'none',
            borderBottom: activeTab === 'leads' ? '2px solid #0a66c2' : 'none',
            color: activeTab === 'leads' ? '#0a66c2' : '#64748b',
            fontWeight: 600,
            fontSize: '13px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '6px',
          }}
        >
          <Users size={16} /> Saved Leads ({leads.length})
        </button>
        <button
          onClick={() => setActiveTab('settings')}
          style={{
            flex: 1,
            padding: '10px',
            border: 'none',
            background: 'none',
            borderBottom: activeTab === 'settings' ? '2px solid #0a66c2' : 'none',
            color: activeTab === 'settings' ? '#0a66c2' : '#64748b',
            fontWeight: 600,
            fontSize: '13px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '6px',
          }}
        >
          <SettingsIcon size={16} /> Settings & API
        </button>
      </div>

      {/* Tab 1: Leads Pipeline */}
      {activeTab === 'leads' && (
        <div style={{ flex: 1, padding: '16px', display: 'flex', flexDirection: 'column' }}>
          {leads.length > 0 ? (
            <>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                <span style={{ fontSize: '12px', color: '#64748b', fontWeight: 600 }}>
                  {leads.length} Captured Leads
                </span>
                <button
                  onClick={handleDownloadCSV}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    backgroundColor: '#16a34a',
                    color: '#ffffff',
                    padding: '6px 12px',
                    borderRadius: '6px',
                    border: 'none',
                    fontSize: '12px',
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  <Download size={14} /> Export CSV
                </button>
              </div>

              <div style={{ flex: 1, overflowY: 'auto', maxHeight: '350px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {leads.map((lead) => (
                  <div
                    key={lead.id}
                    style={{
                      border: '1px solid #e2e8f0',
                      borderRadius: '8px',
                      padding: '10px 12px',
                      backgroundColor: '#ffffff',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '4px',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <div>
                        <a
                          href={lead.profileUrl}
                          target="_blank"
                          rel="noreferrer"
                          style={{ fontWeight: 600, fontSize: '13px', color: '#0a66c2', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '4px' }}
                        >
                          {lead.name} <ExternalLink size={12} />
                        </a>
                        <div style={{ fontSize: '11px', color: '#475569' }}>{lead.company}</div>
                        {lead.email && (
                          <div style={{ fontSize: '11px', color: '#0f172a', fontWeight: 600, marginTop: '2px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <span>📧 {lead.email}</span>
                            {lead.phone && <span style={{ color: '#64748b' }}>• 📞 {lead.phone}</span>}
                          </div>
                        )}
                      </div>
                      <button
                        onClick={() => handleDeleteLead(lead.id)}
                        style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: '2px' }}
                        title="Delete lead"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                    {lead.selectedIcebreaker && (
                      <div style={{ fontSize: '11px', color: '#64748b', backgroundColor: '#f8fafc', padding: '6px', borderRadius: '4px', marginTop: '4px' }}>
                        "{lead.selectedIcebreaker.slice(0, 80)}..."
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div style={{ textAlign: 'center', padding: '40px 16px', color: '#64748b' }}>
              <Users size={36} style={{ margin: '0 auto 12px', opacity: 0.4 }} />
              <div style={{ fontWeight: 600, fontSize: '14px', marginBottom: '4px' }}>No saved leads yet</div>
              <p style={{ fontSize: '12px', margin: 0 }}>
                Navigate to any LinkedIn profile and click <b>Save</b> on the Outreach Copilot widget.
              </p>
            </div>
          )}
        </div>
      )}

      {/* Tab 2: Settings */}
      {activeTab === 'settings' && (
        <form onSubmit={handleSaveSettings} style={{ flex: 1, padding: '16px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
              AI Provider
            </label>
            <select
              value={settings.aiProvider}
              onChange={(e) => setSettings({ ...settings, aiProvider: e.target.value as any })}
              style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px' }}
            >
              <option value="gemini">Google Gemini 1.5 Flash (Recommended)</option>
              <option value="openai">OpenAI GPT-4o-mini</option>
              <option value="mock">Smart Contextual Engine (Zero API Key Needed)</option>
            </select>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
              API Key (Optional)
            </label>
            <input
              type="password"
              placeholder={settings.aiProvider === 'gemini' ? 'AIzaSy...' : 'sk-...'}
              value={settings.apiKey || ''}
              onChange={(e) => setSettings({ ...settings, apiKey: e.target.value })}
              style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px', boxSizing: 'border-box' }}
            />
            <span style={{ fontSize: '11px', color: '#64748b' }}>
              Stored securely in local Chrome storage. Leave empty to use built-in smart templates.
            </span>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
              Hunter.io API Key (Optional for Verified Emails)
            </label>
            <input
              type="password"
              placeholder="hunter_api_key_..."
              value={settings.hunterApiKey || ''}
              onChange={(e) => setSettings({ ...settings, hunterApiKey: e.target.value })}
              style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px', boxSizing: 'border-box' }}
            />
            <span style={{ fontSize: '11px', color: '#64748b' }}>
              Optional. Free tier gives 100 verified email lookups/month. If omitted, smart pattern guessing is used.
            </span>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
              Your Offer / Pitch Context
            </label>
            <textarea
              placeholder="e.g. B2B lead generation software that scales outreach 10x"
              value={settings.customPitch || ''}
              onChange={(e) => setSettings({ ...settings, customPitch: e.target.value })}
              rows={3}
              style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px', boxSizing: 'border-box' }}
            />
            <span style={{ fontSize: '11px', color: '#64748b' }}>
              The AI will naturally weave this into value-focused connection requests.
            </span>
          </div>

          <button
            type="submit"
            style={{
              backgroundColor: '#0a66c2',
              color: '#ffffff',
              padding: '10px',
              borderRadius: '6px',
              border: 'none',
              fontWeight: 600,
              fontSize: '13px',
              cursor: 'pointer',
              marginTop: 'auto',
            }}
          >
            {saveStatus || 'Save Settings'}
          </button>
        </form>
      )}

      {/* Pro Monetization Callout Box */}
      <div style={{ margin: '12px 16px', padding: '12px', borderRadius: '8px', backgroundColor: settings.isPro ? '#f0fdf4' : '#eff6ff', border: `1px solid ${settings.isPro ? '#bbf7d0' : '#bfdbfe'}` }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ fontWeight: 700, fontSize: '13px', color: settings.isPro ? '#166534' : '#1e40af' }}>
              {settings.isPro ? 'Pro Subscription Active' : 'Unlock Pro - $19/mo'}
            </div>
            <div style={{ fontSize: '11px', color: settings.isPro ? '#15803d' : '#3b82f6' }}>
              {settings.isPro ? 'Unlimited generations & CRM export' : 'Unlimited icebreakers & instant CSV sync'}
            </div>
          </div>
          <button
            onClick={toggleProSimulated}
            style={{
              padding: '6px 10px',
              borderRadius: '6px',
              border: 'none',
              backgroundColor: settings.isPro ? '#15803d' : '#2563eb',
              color: '#ffffff',
              fontSize: '11px',
              fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            {settings.isPro ? 'Downgrade' : 'Simulate Pro'}
          </button>
        </div>
      </div>
    </div>
  );
};
