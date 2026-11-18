import React, { useState, useEffect } from 'react';
import { SavedLead, UserSettings } from '../types';
import { getSettings, saveSettings, getSavedLeads, deleteLead, exportLeadsToCSV } from '../utils/storage';
import { generateOSINTDorks, OSINTDork, openDorkSearch } from '../utils/osintSearch';
import { Sparkles, Users, Settings as SettingsIcon, Download, Trash2, ExternalLink, Search, Copy, Check } from 'lucide-react';

export const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'leads' | 'osint' | 'settings'>('leads');
  const [leads, setLeads] = useState<SavedLead[]>([]);
  const [settings, setSettings] = useState<UserSettings>({
    aiProvider: 'gemini',
    dailyQuota: 5,
    usedToday: 0,
    lastResetDate: new Date().toISOString().split('T')[0],
    isPro: false,
  });
  const [saveStatus, setSaveStatus] = useState<string | null>(null);

  // OSINT Tool State in popup
  const [osintName, setOsintName] = useState('');
  const [osintCompany, setOsintCompany] = useState('');
  const [osintDomain, setOsintDomain] = useState('');
  const [generatedDorks, setGeneratedDorks] = useState<OSINTDork[]>([]);
  const [copiedDorkId, setCopiedDorkId] = useState<string | null>(null);

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

  const handleGenerateDorks = (e: React.FormEvent) => {
    e.preventDefault();
    if (!osintName && !osintCompany && !osintDomain) return;
    const dorks = generateOSINTDorks(osintName, osintCompany, osintDomain);
    setGeneratedDorks(dorks);
  };

  const copyQuery = (id: string, query: string) => {
    navigator.clipboard.writeText(query);
    setCopiedDorkId(id);
    setTimeout(() => setCopiedDorkId(null), 2000);
  };

  return (
    <div style={{ width: '400px', minHeight: '540px', backgroundColor: '#ffffff', fontFamily: 'system-ui, -apple-system, sans-serif', display: 'flex', flexDirection: 'column' }}>
      {/* Header - Royal Navy */}
      <div style={{ background: 'linear-gradient(135deg, #0b192c 0%, #1e3e62 100%)', color: '#ffffff', padding: '16px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(56, 189, 248, 0.3)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Sparkles size={18} color="#fbbf24" />
          <span style={{ fontWeight: 800, fontSize: '15px', letterSpacing: '-0.01em' }}>Outreach Copilot</span>
          <span style={{ background: 'rgba(56, 189, 248, 0.2)', color: '#38bdf8', border: '1px solid rgba(56, 189, 248, 0.4)', fontSize: '10px', fontWeight: 700, padding: '2px 5px', borderRadius: '4px' }}>
            PRO
          </span>
        </div>
        {settings.isPro ? (
          <span style={{ backgroundColor: '#fbbf24', color: '#78350f', fontSize: '11px', fontWeight: 800, padding: '3px 8px', borderRadius: '4px' }}>
            PRO ACTIVE
          </span>
        ) : (
          <span style={{ backgroundColor: 'rgba(255,255,255,0.15)', fontSize: '11px', padding: '3px 8px', borderRadius: '4px', border: '1px solid rgba(255,255,255,0.2)' }}>
            Free Engine
          </span>
        )}
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', borderBottom: '1px solid #e2e8f0', backgroundColor: '#f8fafc' }}>
        <button
          onClick={() => setActiveTab('leads')}
          style={{
            flex: 1,
            padding: '10px 4px',
            border: 'none',
            background: 'none',
            borderBottom: activeTab === 'leads' ? '3px solid #1e3e62' : 'none',
            color: activeTab === 'leads' ? '#0b192c' : '#64748b',
            fontWeight: activeTab === 'leads' ? 700 : 600,
            fontSize: '12px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '5px',
          }}
        >
          <Users size={14} /> Leads ({leads.length})
        </button>
        <button
          onClick={() => setActiveTab('osint')}
          style={{
            flex: 1,
            padding: '10px 4px',
            border: 'none',
            background: 'none',
            borderBottom: activeTab === 'osint' ? '3px solid #1e3e62' : 'none',
            color: activeTab === 'osint' ? '#0b192c' : '#64748b',
            fontWeight: activeTab === 'osint' ? 700 : 600,
            fontSize: '12px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '5px',
          }}
        >
          <Search size={14} /> OSINT Dorks
        </button>
        <button
          onClick={() => setActiveTab('settings')}
          style={{
            flex: 1,
            padding: '10px 4px',
            border: 'none',
            background: 'none',
            borderBottom: activeTab === 'settings' ? '3px solid #1e3e62' : 'none',
            color: activeTab === 'settings' ? '#0b192c' : '#64748b',
            fontWeight: activeTab === 'settings' ? 700 : 600,
            fontSize: '12px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '5px',
          }}
        >
          <SettingsIcon size={14} /> Settings
        </button>
      </div>

      {/* Tab 1: Leads Pipeline */}
      {activeTab === 'leads' && (
        <div style={{ flex: 1, padding: '16px', display: 'flex', flexDirection: 'column' }}>
          {leads.length > 0 ? (
            <>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                <span style={{ fontSize: '12px', color: '#0b192c', fontWeight: 700 }}>
                  {leads.length} Captured Leads
                </span>
                <button
                  onClick={handleDownloadCSV}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    background: 'linear-gradient(135deg, #0b192c 0%, #1e3e62 100%)',
                    color: '#ffffff',
                    padding: '6px 12px',
                    borderRadius: '6px',
                    border: 'none',
                    fontSize: '11px',
                    fontWeight: 700,
                    cursor: 'pointer',
                  }}
                >
                  <Download size={13} /> Export CSV
                </button>
              </div>

              <div style={{ flex: 1, overflowY: 'auto', maxHeight: '330px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {leads.map((lead) => (
                  <div
                    key={lead.id}
                    style={{
                      border: '1px solid #cbd5e1',
                      borderRadius: '8px',
                      padding: '10px 12px',
                      backgroundColor: '#ffffff',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '4px',
                      boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <div>
                        <a
                          href={lead.profileUrl}
                          target="_blank"
                          rel="noreferrer"
                          style={{ fontWeight: 700, fontSize: '13px', color: '#1e3e62', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '4px' }}
                        >
                          {lead.name} <ExternalLink size={12} />
                        </a>
                        <div style={{ fontSize: '11px', color: '#475569' }}>{lead.company}</div>
                        {lead.email && (
                          <div style={{ fontSize: '11px', color: '#0b192c', fontWeight: 600, marginTop: '2px', display: 'flex', alignItems: 'center', gap: '4px' }}>
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
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div style={{ textAlign: 'center', padding: '40px 16px', color: '#64748b' }}>
              <Users size={36} style={{ margin: '0 auto 12px', opacity: 0.4 }} />
              <div style={{ fontWeight: 700, fontSize: '14px', marginBottom: '4px', color: '#0b192c' }}>No saved leads yet</div>
              <p style={{ fontSize: '12px', margin: 0 }}>
                Navigate to any LinkedIn profile and click <b>Save Lead</b> on the Outreach Copilot drawer.
              </p>
            </div>
          )}
        </div>
      )}

      {/* Tab 2: Standalone Free OSINT Dork Tool */}
      {activeTab === 'osint' && (
        <div style={{ flex: 1, padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <form onSubmit={handleGenerateDorks} style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div style={{ fontSize: '12px', color: '#475569', lineHeight: 1.4 }}>
              Enter any prospect or company to generate 1-click Google OSINT queries for verified emails and files:
            </div>
            <input
              type="text"
              placeholder="Prospect Full Name (e.g. Satya Nadella)"
              value={osintName}
              onChange={(e) => setOsintName(e.target.value)}
              style={{ padding: '7px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '12px' }}
            />
            <div style={{ display: 'flex', gap: '8px' }}>
              <input
                type="text"
                placeholder="Company (e.g. Microsoft)"
                value={osintCompany}
                onChange={(e) => setOsintCompany(e.target.value)}
                style={{ flex: 1, padding: '7px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '12px' }}
              />
              <input
                type="text"
                placeholder="Domain (e.g. microsoft.com)"
                value={osintDomain}
                onChange={(e) => setOsintDomain(e.target.value)}
                style={{ flex: 1, padding: '7px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '12px' }}
              />
            </div>
            <button
              type="submit"
              style={{
                background: 'linear-gradient(135deg, #0b192c 0%, #1e3e62 100%)',
                color: '#ffffff',
                border: 'none',
                padding: '8px',
                borderRadius: '6px',
                fontWeight: 700,
                fontSize: '12px',
                cursor: 'pointer',
              }}
            >
              Generate 1-Click OSINT Dorks
            </button>
          </form>

          {/* Dork Results */}
          <div style={{ flex: 1, overflowY: 'auto', maxHeight: '240px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {generatedDorks.length > 0 ? (
              generatedDorks.map((dork) => (
                <div
                  key={dork.id}
                  style={{
                    border: '1px solid #cbd5e1',
                    borderRadius: '6px',
                    padding: '8px 10px',
                    backgroundColor: '#f8fafc',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                    <span style={{ fontWeight: 700, fontSize: '11px', color: '#0b192c' }}>{dork.title}</span>
                    <span style={{ fontSize: '9px', fontWeight: 800, padding: '1px 5px', borderRadius: '3px', background: '#e0f2fe', color: '#0369a1' }}>
                      {dork.targetBadge}
                    </span>
                  </div>
                  <div style={{ fontSize: '10px', color: '#64748b', marginBottom: '6px' }}>{dork.description}</div>
                  <div style={{ display: 'flex', gap: '6px' }}>
                    <button
                      onClick={() => openDorkSearch(dork.url)}
                      style={{
                        background: 'linear-gradient(135deg, #0b192c 0%, #1e3e62 100%)',
                        color: '#ffffff',
                        border: 'none',
                        padding: '4px 8px',
                        borderRadius: '4px',
                        fontSize: '10px',
                        fontWeight: 700,
                        cursor: 'pointer',
                      }}
                    >
                      🚀 Search Google
                    </button>
                    <button
                      onClick={() => copyQuery(dork.id, dork.query)}
                      style={{
                        background: '#ffffff',
                        border: '1px solid #cbd5e1',
                        color: '#1e3e62',
                        padding: '4px 8px',
                        borderRadius: '4px',
                        fontSize: '10px',
                        fontWeight: 700,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '3px',
                      }}
                    >
                      {copiedDorkId === dork.id ? <Check size={11} color="#16a34a" /> : <Copy size={11} />}
                      {copiedDorkId === dork.id ? 'Copied' : 'Copy'}
                    </button>
                  </div>
                </div>
              ))
            ) : (
              <div style={{ textAlign: 'center', padding: '24px 12px', color: '#94a3b8', fontSize: '11px' }}>
                Fill in a name or company above to instantly launch Google OSINT dorks.
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tab 3: Settings */}
      {activeTab === 'settings' && (
        <form onSubmit={handleSaveSettings} style={{ flex: 1, padding: '16px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#0b192c', marginBottom: '4px' }}>
              AI Generation Engine
            </label>
            <select
              value={settings.aiProvider}
              onChange={(e) => setSettings({ ...settings, aiProvider: e.target.value as any })}
              style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '12px' }}
            >
              <option value="gemini">Google Gemini 1.5 Flash (Recommended)</option>
              <option value="openai">OpenAI GPT-4o-mini</option>
              <option value="mock">Built-in Contextual Engine (Zero API Key Needed)</option>
            </select>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#0b192c', marginBottom: '4px' }}>
              API Key (Optional)
            </label>
            <input
              type="password"
              placeholder={settings.aiProvider === 'gemini' ? 'AIzaSy...' : 'sk-...'}
              value={settings.apiKey || ''}
              onChange={(e) => setSettings({ ...settings, apiKey: e.target.value })}
              style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '12px', boxSizing: 'border-box' }}
            />
            <span style={{ fontSize: '10px', color: '#64748b' }}>
              Stored securely in local Chrome storage. Leave empty to use free built-in templates.
            </span>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#0b192c', marginBottom: '4px' }}>
              Your Offer / Pitch Context
            </label>
            <textarea
              placeholder="e.g. automating outbound sales workflows and scaling B2B pipeline"
              value={settings.customPitch || ''}
              onChange={(e) => setSettings({ ...settings, customPitch: e.target.value })}
              rows={3}
              style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '12px', boxSizing: 'border-box' }}
            />
            <span style={{ fontSize: '10px', color: '#64748b' }}>
              Weaved directly into Step 3 cold email and connection notes.
            </span>
          </div>

          <button
            type="submit"
            style={{
              background: 'linear-gradient(135deg, #0b192c 0%, #1e3e62 100%)',
              color: '#ffffff',
              padding: '10px',
              borderRadius: '6px',
              border: 'none',
              fontWeight: 700,
              fontSize: '12px',
              cursor: 'pointer',
              marginTop: 'auto',
            }}
          >
            {saveStatus || 'Save Settings'}
          </button>
        </form>
      )}

      {/* Pro Monetization Callout Box */}
      <div style={{ margin: '10px 16px', padding: '10px 12px', borderRadius: '8px', backgroundColor: settings.isPro ? '#f0fdf4' : '#f8fafc', border: `1px solid ${settings.isPro ? '#bbf7d0' : '#cbd5e1'}` }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ fontWeight: 800, fontSize: '12px', color: settings.isPro ? '#166534' : '#0b192c' }}>
              {settings.isPro ? 'Pro Subscription Active' : 'Outreach Copilot Pro'}
            </div>
            <div style={{ fontSize: '10px', color: settings.isPro ? '#15803d' : '#64748b' }}>
              100% Free DNS DoH & Google OSINT Verification Engine
            </div>
          </div>
          <button
            onClick={toggleProSimulated}
            style={{
              padding: '5px 8px',
              borderRadius: '4px',
              border: 'none',
              backgroundColor: settings.isPro ? '#15803d' : '#1e3e62',
              color: '#ffffff',
              fontSize: '10px',
              fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            {settings.isPro ? 'Pro Active' : 'Toggle Pro'}
          </button>
        </div>
      </div>
    </div>
  );
};
