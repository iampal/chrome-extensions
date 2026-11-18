import React, { useState, useEffect, useCallback } from 'react';
import { LinkedInProfile, GeneratedIcebreaker, UserSettings } from '../types';
import { parseLinkedInProfile, isLinkedInProfileUrl } from '../utils/linkedinParser';
import { generateIcebreakers } from '../utils/aiGenerator';
import { getSettings, saveLead, checkAndIncrementQuota } from '../utils/storage';
import { Sparkles, Copy, Check, BookmarkPlus, Zap, X, AlertCircle, RefreshCw, UserCheck } from 'lucide-react';

const DEMO_PROFILE: LinkedInProfile = {
  name: 'Alex Rivera',
  headline: 'VP of Growth & Operations at ScaleWorks | B2B SaaS',
  location: 'San Francisco, CA',
  company: 'ScaleWorks',
  about: 'Scaling B2B go-to-market teams. Passionate about automating repetitive sales workflows and high-converting cold outreach.',
  profileUrl: 'https://www.linkedin.com/in/demo-prospect',
  avatarUrl: '',
};

export const CopilotWidget: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [profile, setProfile] = useState<LinkedInProfile | null>(null);
  const [isProfileUrl, setIsProfileUrl] = useState(false);
  const [icebreakers, setIcebreakers] = useState<GeneratedIcebreaker[]>([]);
  const [loading, setLoading] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [quotaExceeded, setQuotaExceeded] = useState(false);
  const [settings, setSettings] = useState<UserSettings | null>(null);

  // Scan current page
  const scanPage = useCallback(() => {
    const onProfile = isLinkedInProfileUrl();
    setIsProfileUrl(onProfile);
    const parsed = parseLinkedInProfile();
    if (parsed) {
      setProfile(parsed);
    } else if (!onProfile && !profile) {
      // not on profile url
    }
  }, [profile]);

  useEffect(() => {
    scanPage();
    getSettings().then(setSettings);

    // Watch for SPA URL changes and DOM updates
    const observer = new MutationObserver(() => {
      scanPage();
    });
    observer.observe(document.body, { childList: true, subtree: true });

    const interval = setInterval(scanPage, 1500);

    return () => {
      observer.disconnect();
      clearInterval(interval);
    };
  }, [scanPage]);

  const activeProfile = profile || (isProfileUrl ? parseLinkedInProfile() : null);

  const handleGenerate = async (targetProfile?: LinkedInProfile) => {
    const p = targetProfile || activeProfile;
    if (!p) return;

    setLoading(true);
    setQuotaExceeded(false);

    try {
      const quota = await checkAndIncrementQuota();
      if (!quota.allowed) {
        setQuotaExceeded(true);
        setLoading(false);
        return;
      }

      const currentSettings = await getSettings();
      setSettings(currentSettings);
      const results = await generateIcebreakers(p, currentSettings);
      setIcebreakers(results);
    } catch (err) {
      console.error('Failed to generate hooks:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = (hook: GeneratedIcebreaker) => {
    navigator.clipboard.writeText(hook.message);
    setCopiedId(hook.id);
    setTimeout(() => setCopiedId(null), 2000);

    // Auto-populate active message input if open
    insertIntoLinkedInInput(hook.message);
  };

  const insertIntoLinkedInInput = (text: string) => {
    const msgBox = document.querySelector<HTMLElement>(
      'div.msg-form__contenteditable, textarea[name="message"], div[role="textbox"]'
    );
    if (msgBox) {
      if (msgBox.tagName.toLowerCase() === 'textarea') {
        (msgBox as HTMLTextAreaElement).value = text;
      } else {
        msgBox.focus();
        document.execCommand('insertText', false, text);
      }
    }
  };

  const handleSaveLead = async (targetProfile?: LinkedInProfile, selectedMsg?: string) => {
    const p = targetProfile || activeProfile;
    if (!p) return;

    await saveLead({
      name: p.name,
      headline: p.headline,
      company: p.company || 'Unknown',
      profileUrl: p.profileUrl,
      selectedIcebreaker: selectedMsg || icebreakers[0]?.message,
    });
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 3000);
  };

  const handleLoadDemo = () => {
    setProfile(DEMO_PROFILE);
    setIsProfileUrl(true);
    handleGenerate(DEMO_PROFILE);
  };

  return (
    <div style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif' }}>
      {/* 1. Floating Launcher Button (Always visible on LinkedIn) */}
      {!isOpen && (
        <button
          onClick={() => {
            setIsOpen(true);
            scanPage();
          }}
          style={{
            position: 'fixed',
            bottom: '24px',
            right: '24px',
            zIndex: 2147483647,
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            backgroundColor: '#0a66c2',
            color: '#ffffff',
            padding: '12px 20px',
            borderRadius: '9999px',
            boxShadow: '0 10px 25px -3px rgba(10, 102, 194, 0.5), 0 4px 6px -4px rgba(0, 0, 0, 0.1)',
            border: '2px solid rgba(255, 255, 255, 0.2)',
            cursor: 'pointer',
            fontWeight: 700,
            fontSize: '14px',
            transition: 'transform 0.15s ease, box-shadow 0.15s ease',
          }}
          onMouseEnter={(e) => (e.currentTarget.style.transform = 'scale(1.05)')}
          onMouseLeave={(e) => (e.currentTarget.style.transform = 'scale(1)')}
        >
          <Sparkles size={18} color="#fde047" />
          <span>Outreach Copilot</span>
          {activeProfile && (
            <span
              style={{
                width: '8px',
                height: '8px',
                borderRadius: '50%',
                backgroundColor: '#4ade80',
                display: 'inline-block',
              }}
            />
          )}
        </button>
      )}

      {/* 2. Slide-out Drawer */}
      {isOpen && (
        <div
          style={{
            position: 'fixed',
            top: '72px',
            right: '24px',
            width: '390px',
            maxHeight: 'calc(100vh - 100px)',
            backgroundColor: '#ffffff',
            borderRadius: '16px',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25), 0 0 0 1px rgba(0,0,0,0.08)',
            zIndex: 2147483647,
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
          }}
        >
          {/* Header */}
          <div
            style={{
              padding: '14px 18px',
              backgroundColor: '#0a66c2',
              color: '#ffffff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Zap size={18} color="#fde047" />
              <span style={{ fontWeight: 700, fontSize: '15px' }}>Outreach Copilot</span>
              {settings?.isPro ? (
                <span style={{ fontSize: '10px', background: '#fde047', color: '#854d0e', padding: '2px 6px', borderRadius: '4px', fontWeight: 800 }}>
                  PRO
                </span>
              ) : (
                <span style={{ fontSize: '11px', background: 'rgba(255,255,255,0.25)', padding: '2px 7px', borderRadius: '4px', fontWeight: 600 }}>
                  {settings ? `${settings.dailyQuota - settings.usedToday} Left` : 'Free'}
                </span>
              )}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <button
                onClick={scanPage}
                title="Rescan page"
                style={{ background: 'none', border: 'none', color: '#ffffff', cursor: 'pointer', padding: '4px', opacity: 0.8 }}
              >
                <RefreshCw size={15} />
              </button>
              <button
                onClick={() => setIsOpen(false)}
                style={{ background: 'none', border: 'none', color: '#ffffff', cursor: 'pointer', padding: '4px' }}
              >
                <X size={18} />
              </button>
            </div>
          </div>

          {/* Profile Card Section */}
          {activeProfile ? (
            <div style={{ padding: '14px 18px', backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                {activeProfile.avatarUrl ? (
                  <img
                    src={activeProfile.avatarUrl}
                    alt={activeProfile.name}
                    style={{ width: '46px', height: '46px', borderRadius: '50%', objectFit: 'cover', border: '2px solid #ffffff' }}
                  />
                ) : (
                  <div
                    style={{
                      width: '46px',
                      height: '46px',
                      borderRadius: '50%',
                      backgroundColor: '#0a66c2',
                      color: '#ffffff',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontWeight: 'bold',
                      fontSize: '18px',
                    }}
                  >
                    {activeProfile.name[0] || 'U'}
                  </div>
                )}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 700, fontSize: '15px', color: '#0f172a', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {activeProfile.name}
                  </div>
                  <div style={{ fontSize: '12px', color: '#64748b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {activeProfile.headline}
                  </div>
                  {activeProfile.company && (
                    <div style={{ fontSize: '11px', color: '#0a66c2', fontWeight: 600, marginTop: '2px' }}>
                      🏢 {activeProfile.company}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div style={{ padding: '16px', backgroundColor: '#fffbeb', borderBottom: '1px solid #fef3c7', fontSize: '13px', color: '#92400e' }}>
              <div style={{ fontWeight: 600, marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <UserCheck size={16} /> Not viewing a profile
              </div>
              <p style={{ margin: '0 0 10px 0', fontSize: '12px', color: '#b45309' }}>
                Open any LinkedIn profile (`/in/...`) to capture their details, or test the copilot right now:
              </p>
              <button
                onClick={handleLoadDemo}
                style={{
                  backgroundColor: '#0a66c2',
                  color: '#ffffff',
                  border: 'none',
                  padding: '7px 12px',
                  borderRadius: '6px',
                  fontSize: '12px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
              >
                <Sparkles size={14} /> Try with Demo Prospect
              </button>
            </div>
          )}

          {/* Action Bar */}
          {activeProfile && (
            <div style={{ padding: '12px 18px', display: 'flex', gap: '8px', borderBottom: '1px solid #f1f5f9' }}>
              <button
                onClick={() => handleGenerate()}
                disabled={loading}
                style={{
                  flex: 1,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                  backgroundColor: '#0a66c2',
                  color: '#ffffff',
                  padding: '10px 14px',
                  borderRadius: '8px',
                  border: 'none',
                  fontWeight: 600,
                  fontSize: '13px',
                  cursor: loading ? 'not-allowed' : 'pointer',
                  opacity: loading ? 0.7 : 1,
                }}
              >
                <Sparkles size={16} />
                {loading ? 'Crafting Hooks...' : 'Generate Hooks'}
              </button>

              <button
                onClick={() => handleSaveLead()}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  backgroundColor: savedSuccess ? '#16a34a' : '#f1f5f9',
                  color: savedSuccess ? '#ffffff' : '#334155',
                  padding: '10px 14px',
                  borderRadius: '8px',
                  border: '1px solid #e2e8f0',
                  fontWeight: 600,
                  fontSize: '13px',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                }}
              >
                <BookmarkPlus size={16} />
                {savedSuccess ? 'Saved!' : 'Save'}
              </button>
            </div>
          )}

          {/* Content Body */}
          <div style={{ padding: '16px 18px', flex: 1, overflowY: 'auto' }}>
            {/* Quota Exceeded Alert */}
            {quotaExceeded && (
              <div style={{ padding: '12px', borderRadius: '8px', backgroundColor: '#fef2f2', border: '1px solid #fee2e2', color: '#991b1b', marginBottom: '14px', fontSize: '13px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 600, marginBottom: '4px' }}>
                  <AlertCircle size={16} /> Free Limit Reached
                </div>
                You've used all 5 free daily icebreakers. Upgrade to Pro for unlimited generations!
              </div>
            )}

            {/* Generated Hooks List */}
            {icebreakers.length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div style={{ fontSize: '11px', fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Personalized Connection Requests
                </div>

                {icebreakers.map((hook) => (
                  <div
                    key={hook.id}
                    style={{
                      border: '1px solid #e2e8f0',
                      borderRadius: '10px',
                      padding: '12px',
                      backgroundColor: '#ffffff',
                      boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                      <span style={{ fontSize: '11px', fontWeight: 700, color: '#0a66c2', textTransform: 'uppercase' }}>
                        {hook.label}
                      </span>
                      <button
                        onClick={() => handleCopy(hook)}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px',
                          border: 'none',
                          background: copiedId === hook.id ? '#dcfce7' : '#f8fafc',
                          color: copiedId === hook.id ? '#15803d' : '#475569',
                          padding: '4px 8px',
                          borderRadius: '6px',
                          fontSize: '11px',
                          fontWeight: 600,
                          cursor: 'pointer',
                        }}
                      >
                        {copiedId === hook.id ? (
                          <>
                            <Check size={12} /> Copied!
                          </>
                        ) : (
                          <>
                            <Copy size={12} /> Copy & Insert
                          </>
                        )}
                      </button>
                    </div>
                    <p style={{ margin: 0, fontSize: '13px', color: '#334155', lineHeight: '1.45' }}>
                      {hook.message}
                    </p>
                  </div>
                ))}
              </div>
            )}

            {icebreakers.length === 0 && !loading && activeProfile && (
              <div style={{ textAlign: 'center', padding: '24px 12px', color: '#94a3b8' }}>
                <Sparkles size={32} style={{ margin: '0 auto 8px', display: 'block', opacity: 0.5 }} />
                <p style={{ margin: 0, fontSize: '13px' }}>
                  Click <b>"Generate Hooks"</b> to create 3 hyper-personalized messages tailored to {activeProfile.name}.
                </p>
              </div>
            )}
          </div>

          {/* Footer */}
          <div style={{ padding: '10px 18px', borderTop: '1px solid #f1f3f5', backgroundColor: '#f8fafc', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '11px', color: '#64748b' }}>
            <span>Auto-injects into connection note</span>
            <span style={{ fontWeight: 600, color: '#0a66c2' }}>LinkedIn Copilot v1.0</span>
          </div>
        </div>
      )}
    </div>
  );
};
