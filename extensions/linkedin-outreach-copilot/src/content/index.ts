import { parseLinkedInProfile } from '../utils/linkedinParser';
import { generateIcebreakers, generateOutreachSequence, extractRoleFocus } from '../utils/aiGenerator';
import { getSettings, saveLead } from '../utils/storage';
import { enrichContactInfo, ContactEnrichmentResult } from '../utils/emailPredictor';
import { openDorkSearch } from '../utils/osintSearch';
import { generateLinkedInPosts, generateLinkedInComments, LinkedInPostDraft, LinkedInCommentDraft } from '../utils/postCommentGenerator';
import { GeneratedIcebreaker, LinkedInProfile, OutreachSequence, UserSettings } from '../types';

(function () {
  console.log('⚡ LinkedIn Outreach Copilot + Not-Ai Humanizer initializing...');

  const CONTAINER_ID = 'outreach-copilot-root-host';
  if (document.getElementById(CONTAINER_ID)) {
    return;
  }

  // State
  let isOpen = false;
  let activeTab: 'sequence' | 'osint' | 'posts' | 'comments' | 'icebreakers' = 'sequence';
  let activeProfile: LinkedInProfile | null = null;
  let lastScannedUrl = '';
  let currentSequence: OutreachSequence | null = null;
  let currentHooks: GeneratedIcebreaker[] = [];
  let currentContact: ContactEnrichmentResult | null = null;
  let settings: UserSettings | null = null;
  let isGenerating = false;
  let isExtractingContact = false;
  let selectedSubjectIndex = 0;

  // Not-Ai Posts & Comments state
  let postTopic = '';
  let currentPosts: LinkedInPostDraft[] = [];
  let isGeneratingPosts = false;
  let commentContext = '';
  let currentComments: LinkedInCommentDraft[] = [];
  let isGeneratingComments = false;

  // Load settings once
  getSettings().then((s) => {
    settings = s;
  });

  // Create isolated container host
  const host = document.createElement('div');
  host.id = CONTAINER_ID;
  host.style.all = 'initial';
  host.style.position = 'fixed';
  host.style.zIndex = '2147483647';
  host.style.top = '0';
  host.style.left = '0';
  host.style.width = '0';
  host.style.height = '0';
  host.style.overflow = 'visible';

  // Attach Shadow DOM for 100% CSS encapsulation
  const shadow = host.attachShadow({ mode: 'open' });

  // Add styles inside Shadow DOM (Executive Royal Navy Theme)
  const style = document.createElement('style');
  style.textContent = `
    * {
      box-sizing: border-box;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
    }

    /* Stable Floating Launcher Button - Royal Navy */
    .copilot-launcher {
      position: fixed;
      bottom: 24px;
      right: 24px;
      display: flex;
      align-items: center;
      gap: 10px;
      background: linear-gradient(135deg, #0b192c 0%, #1e3e62 100%);
      color: #ffffff;
      padding: 12px 22px;
      border-radius: 9999px;
      border: 2px solid rgba(56, 189, 248, 0.45);
      box-shadow: 0 12px 28px -4px rgba(11, 25, 44, 0.65), 0 4px 8px -2px rgba(0, 0, 0, 0.3);
      cursor: pointer;
      font-weight: 700;
      font-size: 14px;
      user-select: none;
      z-index: 2147483647;
      transition: transform 0.15s ease, box-shadow 0.15s ease;
    }
    .copilot-launcher:hover {
      transform: translateY(-2px) scale(1.03);
      box-shadow: 0 16px 32px -4px rgba(11, 25, 44, 0.75), 0 0 16px rgba(56, 189, 248, 0.4);
    }
    .copilot-badge-dot {
      width: 9px;
      height: 9px;
      border-radius: 50%;
      background: #fbbf24;
      box-shadow: 0 0 8px #fbbf24;
    }

    /* Apollo-style Docked Drawer - Royal Navy */
    .copilot-drawer {
      position: fixed;
      top: 64px;
      right: 24px;
      width: 440px;
      max-height: calc(100vh - 84px);
      background: #ffffff;
      border-radius: 16px;
      border: 1px solid rgba(30, 62, 98, 0.2);
      box-shadow: 0 25px 50px -12px rgba(11, 25, 44, 0.4), 0 0 0 1px rgba(11, 25, 44, 0.08);
      display: flex;
      flex-direction: column;
      overflow: hidden;
      z-index: 2147483647;
      animation: copilotFadeIn 0.15s ease-out;
    }

    @keyframes copilotFadeIn {
      from { opacity: 0; transform: translateY(-8px); }
      to { opacity: 1; transform: translateY(0); }
    }

    .copilot-header {
      padding: 14px 18px;
      background: linear-gradient(135deg, #0b192c 0%, #1e3e62 100%);
      color: #ffffff;
      display: flex;
      align-items: center;
      justify-content: space-between;
      border-bottom: 1px solid rgba(56, 189, 248, 0.25);
    }
    .copilot-title {
      font-weight: 700;
      font-size: 15px;
      display: flex;
      align-items: center;
      gap: 8px;
      color: #ffffff;
    }
    .copilot-title-badge {
      background: rgba(56, 189, 248, 0.2);
      color: #38bdf8;
      border: 1px solid rgba(56, 189, 248, 0.4);
      font-size: 10px;
      font-weight: 700;
      padding: 2px 6px;
      border-radius: 4px;
      text-transform: uppercase;
      letter-spacing: 0.04em;
    }
    .copilot-close-btn {
      background: rgba(255, 255, 255, 0.1);
      border: 1px solid rgba(255, 255, 255, 0.2);
      color: #ffffff;
      font-size: 16px;
      cursor: pointer;
      width: 28px;
      height: 28px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      opacity: 0.9;
      transition: background 0.15s;
    }
    .copilot-close-btn:hover {
      background: rgba(255, 255, 255, 0.25);
      opacity: 1;
    }

    .copilot-profile-box {
      padding: 12px 18px;
      background: #f8fafc;
      border-bottom: 1px solid #e2e8f0;
      display: flex;
      align-items: center;
      gap: 12px;
    }
    .copilot-avatar {
      width: 44px;
      height: 44px;
      border-radius: 50%;
      background: linear-gradient(135deg, #0b192c 0%, #1e3e62 100%);
      color: #ffffff;
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: 700;
      font-size: 18px;
      object-fit: cover;
      flex-shrink: 0;
      border: 2px solid #38bdf8;
    }
    .copilot-profile-info {
      flex: 1;
      min-width: 0;
    }
    .copilot-prospect-name {
      font-weight: 700;
      font-size: 15px;
      color: #0b192c;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .copilot-prospect-role {
      font-size: 12px;
      color: #475569;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      margin-top: 2px;
    }
    .copilot-prospect-company {
      font-size: 11px;
      color: #1e3e62;
      font-weight: 700;
      margin-top: 2px;
      display: flex;
      align-items: center;
      gap: 4px;
    }

    /* Contact Details Card */
    .copilot-contact-card {
      margin: 10px 18px 0;
      padding: 12px;
      background: #f8fafc;
      border: 1px solid #cbd5e1;
      border-radius: 10px;
    }
    .copilot-contact-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 8px;
    }
    .copilot-contact-title {
      font-size: 11px;
      font-weight: 800;
      color: #0b192c;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      display: flex;
      align-items: center;
      gap: 4px;
    }
    .copilot-badge-verified {
      font-size: 10px;
      padding: 2px 6px;
      border-radius: 4px;
      font-weight: 700;
      background: #dcfce7;
      color: #15803d;
      border: 1px solid #86efac;
    }
    .copilot-badge-mx {
      font-size: 10px;
      padding: 2px 6px;
      border-radius: 4px;
      font-weight: 700;
      background: #e0f2fe;
      color: #0369a1;
      border: 1px solid #7dd3fc;
    }
    .copilot-contact-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 6px 0;
      border-bottom: 1px dashed #e2e8f0;
      font-size: 12px;
    }
    .copilot-contact-row:last-child {
      border-bottom: none;
    }
    .copilot-contact-val {
      font-weight: 600;
      color: #0b192c;
      display: flex;
      align-items: center;
      gap: 6px;
      word-break: break-all;
    }
    .copilot-contact-empty {
      font-weight: 500;
      color: #94a3b8;
      font-style: italic;
    }
    .copilot-contact-copy-btn {
      background: #ffffff;
      border: 1px solid #cbd5e1;
      color: #1e3e62;
      padding: 3px 8px;
      border-radius: 4px;
      font-size: 11px;
      font-weight: 700;
      cursor: pointer;
      flex-shrink: 0;
      margin-left: 8px;
      transition: background 0.1s;
    }
    .copilot-contact-copy-btn:hover {
      background: #e2e8f0;
    }

    /* Buttons inside Contact Card */
    .copilot-contact-actions {
      display: flex;
      gap: 6px;
      margin-top: 10px;
    }
    .copilot-extract-btn {
      flex: 1;
      padding: 7px 10px;
      background: #ffffff;
      border: 1px solid #1e3e62;
      color: #1e3e62;
      border-radius: 6px;
      font-size: 11px;
      font-weight: 700;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 4px;
      transition: background 0.15s;
    }
    .copilot-extract-btn:hover {
      background: #f1f5f9;
    }
    .copilot-osint-quick-btn {
      flex: 1;
      padding: 7px 10px;
      background: linear-gradient(135deg, #0b192c 0%, #1e3e62 100%);
      border: 1px solid #0b192c;
      color: #ffffff;
      border-radius: 6px;
      font-size: 11px;
      font-weight: 700;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 4px;
      box-shadow: 0 2px 4px rgba(11, 25, 44, 0.2);
    }
    .copilot-osint-quick-btn:hover {
      background: linear-gradient(135deg, #07101e 0%, #142b45 100%);
    }

    /* Tabs - Royal Navy */
    .copilot-tabs {
      display: flex;
      background: #f1f5f9;
      border-bottom: 1px solid #e2e8f0;
      margin-top: 10px;
      overflow-x: auto;
    }
    .copilot-tab {
      flex: 1;
      min-width: 72px;
      padding: 9px 4px;
      background: none;
      border: none;
      font-size: 11px;
      font-weight: 600;
      color: #64748b;
      cursor: pointer;
      text-align: center;
      border-bottom: 2px solid transparent;
      transition: all 0.15s;
      white-space: nowrap;
    }
    .copilot-tab.active {
      color: #0b192c;
      border-bottom: 3px solid #1e3e62;
      background: #ffffff;
      font-weight: 700;
    }

    /* Actions Bar */
    .copilot-actions {
      padding: 10px 18px;
      display: flex;
      gap: 8px;
      border-bottom: 1px solid #f1f5f9;
    }
    .copilot-btn-primary {
      flex: 1;
      background: linear-gradient(135deg, #0b192c 0%, #1e3e62 100%);
      color: #ffffff;
      border: none;
      padding: 10px 14px;
      border-radius: 8px;
      font-weight: 700;
      font-size: 13px;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 6px;
      box-shadow: 0 4px 12px rgba(11, 25, 44, 0.25);
      transition: background 0.15s, transform 0.1s;
    }
    .copilot-btn-primary:hover {
      background: linear-gradient(135deg, #07101e 0%, #142b45 100%);
      transform: translateY(-1px);
    }
    .copilot-btn-secondary {
      background: #ffffff;
      color: #1e3e62;
      border: 1px solid #cbd5e1;
      padding: 10px 14px;
      border-radius: 8px;
      font-weight: 700;
      font-size: 13px;
      cursor: pointer;
      display: flex;
      align-items: center;
      gap: 6px;
      transition: background 0.15s;
    }
    .copilot-btn-secondary:hover {
      background: #f1f5f9;
    }
    .copilot-btn-saved {
      background: #16a34a !important;
      color: #ffffff !important;
      border-color: #16a34a !important;
    }

    /* Content Area */
    .copilot-body {
      padding: 14px 18px;
      flex: 1;
      overflow-y: auto;
      max-height: 310px;
    }

    .copilot-sequence-step {
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      padding: 10px 12px;
      margin-bottom: 10px;
      background: #ffffff;
      box-shadow: 0 1px 3px rgba(0,0,0,0.04);
    }
    .copilot-step-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 6px;
    }
    .copilot-step-tag {
      font-size: 10px;
      font-weight: 800;
      text-transform: uppercase;
      color: #0b192c;
      background: #e0f2fe;
      border: 1px solid #bae6fd;
      padding: 2px 6px;
      border-radius: 4px;
      letter-spacing: 0.03em;
    }
    .copilot-notai-badge {
      font-size: 9px;
      font-weight: 800;
      color: #166534;
      background: #dcfce7;
      border: 1px solid #86efac;
      padding: 1px 5px;
      border-radius: 3px;
    }
    .copilot-step-btns {
      display: flex;
      gap: 6px;
    }
    .copilot-step-btn {
      background: #f8fafc;
      border: 1px solid #cbd5e1;
      color: #1e3e62;
      padding: 3px 8px;
      border-radius: 4px;
      font-size: 11px;
      font-weight: 700;
      cursor: pointer;
    }
    .copilot-step-btn:hover {
      background: #e2e8f0;
    }
    .copilot-gmail-btn {
      background: #ea4335 !important;
      color: #ffffff !important;
      border-color: #ea4335 !important;
    }
    .copilot-step-text {
      margin: 0;
      font-size: 12px;
      color: #334155;
      line-height: 1.45;
      white-space: pre-wrap;
    }

    /* Step 3 Subject Line Box */
    .copilot-subject-box {
      background: #f1f5f9;
      border-left: 3px solid #1e3e62;
      padding: 6px 8px;
      margin-bottom: 6px;
      border-radius: 0 4px 4px 0;
    }
    .copilot-subject-label {
      font-size: 10px;
      font-weight: 800;
      color: #1e3e62;
      text-transform: uppercase;
      letter-spacing: 0.04em;
    }
    .copilot-subject-text {
      font-weight: 700;
      font-size: 12px;
      color: #0b192c;
      margin-top: 2px;
    }
    .copilot-subject-chips {
      display: flex;
      flex-wrap: wrap;
      gap: 4px;
      margin-top: 6px;
    }
    .copilot-subject-chip {
      background: #ffffff;
      border: 1px solid #cbd5e1;
      font-size: 10px;
      padding: 2px 6px;
      border-radius: 4px;
      cursor: pointer;
      color: #334155;
      font-weight: 600;
    }
    .copilot-subject-chip.active {
      background: #1e3e62;
      color: #ffffff;
      border-color: #0b192c;
    }

    /* Not-Ai Post & Comment Elements */
    .copilot-input-field {
      width: 100%;
      padding: 8px 10px;
      border: 1px solid #cbd5e1;
      border-radius: 6px;
      font-size: 12px;
      margin-bottom: 8px;
      box-sizing: border-box;
      resize: vertical;
    }
    .copilot-insert-btn {
      background: linear-gradient(135deg, #0b192c 0%, #1e3e62 100%);
      color: #ffffff;
      border: none;
      padding: 4px 8px;
      border-radius: 4px;
      font-size: 11px;
      font-weight: 700;
      cursor: pointer;
    }
    .copilot-insert-btn:hover {
      background: linear-gradient(135deg, #07101e 0%, #142b45 100%);
    }

    /* OSINT Dork Card */
    .copilot-dork-card {
      border: 1px solid #cbd5e1;
      border-radius: 8px;
      padding: 10px 12px;
      margin-bottom: 10px;
      background: #ffffff;
      box-shadow: 0 1px 3px rgba(0,0,0,0.05);
    }
    .copilot-dork-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 4px;
    }
    .copilot-dork-title {
      font-weight: 700;
      font-size: 12px;
      color: #0b192c;
    }
    .copilot-dork-badge {
      font-size: 9px;
      font-weight: 800;
      padding: 1px 5px;
      border-radius: 3px;
      background: #f1f5f9;
      color: #1e3e62;
      border: 1px solid #cbd5e1;
    }
    .copilot-dork-desc {
      font-size: 11px;
      color: #64748b;
      margin: 2px 0 6px;
      line-height: 1.35;
    }
    .copilot-dork-query-box {
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 4px;
      padding: 5px 8px;
      font-family: monospace;
      font-size: 10px;
      color: #0b192c;
      word-break: break-all;
      margin-bottom: 8px;
    }
    .copilot-dork-actions {
      display: flex;
      gap: 6px;
    }
    .copilot-dork-btn {
      background: linear-gradient(135deg, #0b192c 0%, #1e3e62 100%);
      color: #ffffff;
      border: none;
      padding: 5px 10px;
      border-radius: 4px;
      font-size: 11px;
      font-weight: 700;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      gap: 4px;
    }
    .copilot-dork-btn:hover {
      background: linear-gradient(135deg, #07101e 0%, #142b45 100%);
    }
    .copilot-dork-copy-btn {
      background: #ffffff;
      color: #1e3e62;
      border: 1px solid #cbd5e1;
      padding: 5px 8px;
      border-radius: 4px;
      font-size: 11px;
      font-weight: 700;
      cursor: pointer;
    }
    .copilot-dork-copy-btn:hover {
      background: #f1f5f9;
    }

    .copilot-footer {
      padding: 8px 18px;
      border-top: 1px solid #f1f3f5;
      background: #f8fafc;
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 11px;
      color: #64748b;
    }
  `;
  shadow.appendChild(style);

  const wrapper = document.createElement('div');
  wrapper.id = 'copilot-shadow-wrapper';
  shadow.appendChild(wrapper);

  function normalizeLinkedInProfilePath(path: string): string {
    return path.replace(/\/overlay\/.*$/, '').replace(/\/$/, '');
  }

  function getSubjectVariants(p: LinkedInProfile, seq: OutreachSequence | null): string[] {
    const firstName = p.name.split(' ')[0] || p.name;
    const company = p.company && p.company !== 'Unknown' ? p.company : '';
    const roleFocus = extractRoleFocus(p.headline);

    if (company) {
      return [
        seq?.touch3_email_subject || `${company}'s outbound pipeline & rep efficiency`,
        `${firstName} - quick question re: ${company}`,
        `Idea for ${company}'s ${roleFocus}`,
      ];
    }
    return [
      seq?.touch3_email_subject || `${firstName} - quick thought on ${p.headline.slice(0, 24)}`,
      `${firstName} - 5-min chat regarding ${roleFocus}`,
      `Quick question for ${firstName}`,
    ];
  }

  function renderLauncher() {
    wrapper.innerHTML = `
      <div class="copilot-launcher" id="copilot-launch-btn">
        <span>⚡</span>
        <span>Outreach Copilot</span>
        ${activeProfile ? '<div class="copilot-badge-dot" title="Profile detected"></div>' : ''}
      </div>
    `;

    wrapper.querySelector('#copilot-launch-btn')?.addEventListener('click', () => {
      isOpen = true;
      scanPageOnce();
      renderDrawer();
    });
  }

  function renderDrawer() {
    const p = activeProfile || parseLinkedInProfile();

    if (!p) {
      wrapper.innerHTML = `
        <div class="copilot-drawer">
          <div class="copilot-header">
            <div class="copilot-title">
              <span>⚡</span>
              <span>Outreach Copilot</span>
              <span class="copilot-title-badge">Not-Ai Powered</span>
            </div>
            <button class="copilot-close-btn" id="copilot-close-btn">✕</button>
          </div>
          <div style="padding: 24px; text-align: center; color: #475569;">
            <div style="font-size: 32px; margin-bottom: 8px;">👤</div>
            <div style="font-weight: 700; font-size: 15px; margin-bottom: 6px; color: #0b192c;">No Profile Detected</div>
            <p style="font-size: 13px; color: #64748b; line-height: 1.5; margin: 0 0 16px;">
              Open any LinkedIn profile page or use the Not-Ai Post & Comment tools below:
            </p>
            <div style="display: flex; gap: 8px; justify-content: center;">
              <button class="copilot-tab" id="open-posts-standalone" style="background: #1e3e62; color: #fff; border-radius: 6px; padding: 8px 12px; font-weight: 700;">
                ✍️ Write a Post
              </button>
              <button class="copilot-tab" id="open-comments-standalone" style="background: #ffffff; border: 1px solid #cbd5e1; color: #1e3e62; border-radius: 6px; padding: 8px 12px; font-weight: 700;">
                💬 Smart Comment
              </button>
            </div>
          </div>
          <div class="copilot-footer">
            <span>Free Engine: DNS/MX + Not-Ai Skills</span>
            <span style="font-weight: 700; color: #1e3e62;">v2.3 Pro</span>
          </div>
        </div>
      `;
      wrapper.querySelector('#copilot-close-btn')?.addEventListener('click', () => {
        isOpen = false;
        renderLauncher();
      });
      wrapper.querySelector('#open-posts-standalone')?.addEventListener('click', () => {
        activeTab = 'posts';
        renderDrawer();
      });
      wrapper.querySelector('#open-comments-standalone')?.addEventListener('click', () => {
        activeTab = 'comments';
        renderDrawer();
      });
      return;
    }

    const contact = currentContact;
    const seq = currentSequence;
    const subjectVariants = getSubjectVariants(p, seq);
    const activeSubject = subjectVariants[selectedSubjectIndex] || seq?.touch3_email_subject || subjectVariants[0];

    wrapper.innerHTML = `
      <div class="copilot-drawer">
        <!-- Header -->
        <div class="copilot-header">
          <div class="copilot-title">
            <span>⚡</span>
            <span>Outreach Copilot</span>
            <span class="copilot-title-badge">Not-Ai Skills</span>
          </div>
          <button class="copilot-close-btn" id="copilot-close-btn" title="Close panel">✕</button>
        </div>

        <!-- Profile Top Card -->
        <div class="copilot-profile-box">
          ${
            p.avatarUrl
              ? `<img src="${p.avatarUrl}" class="copilot-avatar" alt="${p.name}"/>`
              : `<div class="copilot-avatar">${(p.name[0] || 'U').toUpperCase()}</div>`
          }
          <div class="copilot-profile-info">
            <div class="copilot-prospect-name">${p.name}</div>
            <div class="copilot-prospect-role">${p.headline || 'Professional on LinkedIn'}</div>
            ${p.company ? `<div class="copilot-prospect-company">🏢 ${p.company}</div>` : ''}
          </div>
        </div>

        <!-- Contact Intelligence (Method A & B) -->
        <div class="copilot-contact-card">
          <div class="copilot-contact-header">
            <div class="copilot-contact-title">🎯 Contact Intelligence</div>
            ${
              contact?.confidence === 'verified_linkedin'
                ? '<span class="copilot-badge-verified">✓ LINKEDIN VERIFIED</span>'
                : contact?.mxRecord?.hasValidMX
                ? `<span class="copilot-badge-mx">✓ MX: ${contact.mxRecord.provider}</span>`
                : '<span class="copilot-badge-mx">⚡ DOMAIN PATTERN</span>'
            }
          </div>

          <!-- Email Row -->
          <div class="copilot-contact-row">
            <div class="copilot-contact-val">
              <span>📧</span>
              ${
                contact?.email
                  ? `<span id="contact-email-val">${contact.email}</span>`
                  : `<span class="copilot-contact-empty">Not detected yet</span>`
              }
            </div>
            ${contact?.email ? '<button class="copilot-contact-copy-btn" id="copy-email-btn">Copy</button>' : ''}
          </div>

          <!-- Phone Row -->
          <div class="copilot-contact-row">
            <div class="copilot-contact-val">
              <span>📞</span>
              ${
                contact?.phone
                  ? `<span id="contact-phone-val">${contact.phone}</span>`
                  : `<span class="copilot-contact-empty">Not publicly listed</span>`
              }
            </div>
            ${contact?.phone ? '<button class="copilot-contact-copy-btn" id="copy-phone-btn">Copy</button>' : ''}
          </div>

          <!-- Contact Dual Action Buttons -->
          <div class="copilot-contact-actions">
            <button class="copilot-extract-btn" id="extract-modal-btn" title="Inspect native LinkedIn contact modal without closing it">
              ${isExtractingContact ? '⏳ Checking Modal...' : '🔍 Reveal Public Info'}
            </button>
            <button class="copilot-osint-quick-btn" id="quick-osint-btn" title="Launch 1-Click Google Search for published emails and PDFs">
              🔎 Google OSINT Search
            </button>
          </div>
        </div>

        <!-- Navigation Tabs: Sequence, Not-Ai Posts, Not-Ai Comments, Google OSINT, Hooks -->
        <div class="copilot-tabs">
          <button class="copilot-tab ${activeTab === 'sequence' ? 'active' : ''}" id="tab-sequence">
            🚀 Outreach
          </button>
          <button class="copilot-tab ${activeTab === 'posts' ? 'active' : ''}" id="tab-posts">
            ✍️ Post Drafter
          </button>
          <button class="copilot-tab ${activeTab === 'comments' ? 'active' : ''}" id="tab-comments">
            💬 Commenter
          </button>
          <button class="copilot-tab ${activeTab === 'osint' ? 'active' : ''}" id="tab-osint">
            🔎 OSINT (${contact?.osintDorks?.length || 5})
          </button>
          <button class="copilot-tab ${activeTab === 'icebreakers' ? 'active' : ''}" id="tab-icebreakers">
            ✨ Hooks
          </button>
        </div>

        ${
          activeTab === 'sequence'
            ? `
          <!-- Action Bar for Sequence -->
          <div class="copilot-actions">
            <button class="copilot-btn-primary" id="copilot-generate-btn">
              ${isGenerating ? '<span>⏳</span> Crafting Sequence...' : '<span>⚡</span> Generate Sequence'}
            </button>
            <button class="copilot-btn-secondary" id="copilot-save-btn">
              <span>💾</span> Save Lead
            </button>
          </div>
        `
            : ''
        }

        <!-- Body Content -->
        <div class="copilot-body">
          ${
            activeTab === 'sequence'
              ? seq
                ? `
                <!-- Touch 1: LinkedIn Connect -->
                <div class="copilot-sequence-step">
                  <div class="copilot-step-header">
                    <span class="copilot-step-tag">Step 1: LinkedIn Connect Note</span>
                    <span class="copilot-notai-badge">✓ Not-Ai Humanized</span>
                    <div class="copilot-step-btns">
                      <button class="copilot-step-btn" id="copy-touch1">Copy & Insert</button>
                    </div>
                  </div>
                  <p class="copilot-step-text">${seq.touch1_linkedin_connect}</p>
                </div>

                <!-- Touch 2: LinkedIn Followup -->
                <div class="copilot-sequence-step">
                  <div class="copilot-step-header">
                    <span class="copilot-step-tag">Step 2: Follow-Up (+2 Days)</span>
                    <div class="copilot-step-btns">
                      <button class="copilot-step-btn" id="copy-touch2">Copy</button>
                    </div>
                  </div>
                  <p class="copilot-step-text">${seq.touch2_linkedin_followup}</p>
                </div>

                <!-- Touch 3: Cold Email Pitch (Role-Targeted Subject) -->
                <div class="copilot-sequence-step">
                  <div class="copilot-step-header">
                    <span class="copilot-step-tag">Step 3: Direct Email (+4 Days)</span>
                    <div class="copilot-step-btns">
                      <button class="copilot-step-btn copilot-gmail-btn" id="gmail-touch3">✉️ Open in Gmail</button>
                      <button class="copilot-step-btn" id="copy-touch3">Copy</button>
                    </div>
                  </div>
                  
                  <!-- Dynamic Relevant Subject Line with Quick Selector -->
                  <div class="copilot-subject-box">
                    <div class="copilot-subject-label">Relevant Subject Line:</div>
                    <div class="copilot-subject-text">${activeSubject}</div>
                    <div class="copilot-subject-chips">
                      ${subjectVariants
                        .map(
                          (sub, idx) => `
                        <button class="copilot-subject-chip ${idx === selectedSubjectIndex ? 'active' : ''}" data-idx="${idx}">
                          ${idx === 0 ? '🎯 Executive' : idx === 1 ? '⚡ Direct' : '💡 Collaborative'}
                        </button>
                      `
                        )
                        .join('')}
                    </div>
                  </div>

                  <p class="copilot-step-text">${seq.touch3_email_body}</p>
                </div>

                <!-- Touch 4: Final Bump -->
                <div class="copilot-sequence-step">
                  <div class="copilot-step-header">
                    <span class="copilot-step-tag">Step 4: Final Follow-Up Bump</span>
                    <div class="copilot-step-btns">
                      <button class="copilot-step-btn" id="copy-touch4">Copy</button>
                    </div>
                  </div>
                  <p class="copilot-step-text">${seq.touch4_email_followup}</p>
                </div>
              `
                : `
                <div style="text-align: center; padding: 24px 12px; color: #94a3b8;">
                  <div style="font-size: 32px; margin-bottom: 6px;">🚀</div>
                  <div style="font-weight: 700; font-size: 14px; color: #0b192c; margin-bottom: 4px;">Multi-Channel Sequence</div>
                  <p style="margin: 0; font-size: 12px; color: #64748b; line-height: 1.4;">
                    Click <b>"Generate Sequence"</b> to create an enterprise 4-step LinkedIn & Cold Email sequence tailored specifically to <b>${p.name}</b>.
                  </p>
                </div>
              `
              : activeTab === 'posts'
              ? `
                <!-- Not-Ai Post Drafter -->
                <div style="margin-bottom: 12px;">
                  <label style="display: block; font-size: 11px; font-weight: 700; color: #0b192c; margin-bottom: 4px;">
                    What topic or experience would you like to post about?
                  </label>
                  <textarea class="copilot-input-field" id="post-topic-input" rows="2" placeholder="e.g. Scaling outbound SDR workflows, why most cold emails fail, closing our first 10 clients...">${postTopic}</textarea>
                  <button class="copilot-btn-primary" id="generate-posts-btn" style="width: 100%; padding: 8px;">
                    ${isGeneratingPosts ? '<span>⏳</span> Humanizing with Not-Ai...' : '<span>✍️</span> Generate 3 Human LinkedIn Posts'}
                  </button>
                </div>

                ${
                  currentPosts.length > 0
                    ? currentPosts
                        .map(
                          (post) => `
                    <div class="copilot-sequence-step">
                      <div class="copilot-step-header">
                        <span class="copilot-step-tag">${post.title}</span>
                        <span class="copilot-notai-badge">Not-Ai: ${post.notAiScore}%</span>
                        <div class="copilot-step-btns">
                          <button class="copilot-insert-btn insert-post-btn" data-content="${encodeURIComponent(post.content)}">
                            📝 Insert into Post
                          </button>
                          <button class="copilot-step-btn copy-post-btn" data-content="${encodeURIComponent(post.content)}">
                            Copy
                          </button>
                        </div>
                      </div>
                      <p class="copilot-step-text">${post.content}</p>
                    </div>
                  `
                        )
                        .join('')
                    : `
                    <div style="text-align: center; padding: 20px 12px; color: #64748b; font-size: 11px;">
                      Enter a topic above to generate 3 source-grounded posts (Story, Playbook, Contrarian) free of generic AI buzzwords.
                    </div>
                  `
                }
              `
              : activeTab === 'comments'
              ? `
                <!-- Not-Ai Comment Suggestions -->
                <div style="margin-bottom: 12px;">
                  <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px;">
                    <label style="font-size: 11px; font-weight: 700; color: #0b192c;">
                      Post text to reply to:
                    </label>
                    <button id="scrape-visible-post-btn" style="background: none; border: none; color: #1e3e62; font-size: 11px; font-weight: 700; cursor: pointer; text-decoration: underline;">
                      ⚡ Grab Post on Screen
                    </button>
                  </div>
                  <textarea class="copilot-input-field" id="comment-context-input" rows="2" placeholder="Paste post snippet or click 'Grab Post on Screen'...">${commentContext}</textarea>
                  <button class="copilot-btn-primary" id="generate-comments-btn" style="width: 100%; padding: 8px;">
                    ${isGeneratingComments ? '<span>⏳</span> Crafting Thoughtful Replies...' : '<span>💬</span> Generate 3 Authentic Comments'}
                  </button>
                </div>

                ${
                  currentComments.length > 0
                    ? currentComments
                        .map(
                          (c) => `
                    <div class="copilot-sequence-step">
                      <div class="copilot-step-header">
                        <span class="copilot-step-tag">${c.label}</span>
                        <span class="copilot-notai-badge">Not-Ai: ${c.notAiScore}%</span>
                        <div class="copilot-step-btns">
                          <button class="copilot-insert-btn insert-comment-btn" data-content="${encodeURIComponent(c.content)}">
                            💬 Insert Comment
                          </button>
                          <button class="copilot-step-btn copy-comment-btn" data-content="${encodeURIComponent(c.content)}">
                            Copy
                          </button>
                        </div>
                      </div>
                      <p class="copilot-step-text">${c.content}</p>
                    </div>
                  `
                        )
                        .join('')
                    : `
                    <div style="text-align: center; padding: 20px 12px; color: #64748b; font-size: 11px;">
                      Click <b>"Grab Post on Screen"</b> or paste any post to generate value-add comments that stand out from AI spam.
                    </div>
                  `
                }
              `
              : activeTab === 'osint'
              ? `
                <div style="margin-bottom: 10px; font-size: 12px; color: #334155; line-height: 1.4;">
                  <b>1-Click Google OSINT Dorks (100% Free):</b><br/>
                  Locate indexed work emails, company PDFs, staff directories, and verified social handles without any paid credits:
                </div>
                ${(contact?.osintDorks || [])
                  .map(
                    (dork) => `
                  <div class="copilot-dork-card">
                    <div class="copilot-dork-header">
                      <span class="copilot-dork-title">${dork.title}</span>
                      <span class="copilot-dork-badge">${dork.targetBadge}</span>
                    </div>
                    <div class="copilot-dork-desc">${dork.description}</div>
                    <div class="copilot-dork-query-box">${dork.query}</div>
                    <div class="copilot-dork-actions">
                      <button class="copilot-dork-btn" data-url="${encodeURIComponent(dork.url)}">
                        🚀 Launch on Google
                      </button>
                      <button class="copilot-dork-copy-btn" data-query="${encodeURIComponent(dork.query)}">
                        📋 Copy Query
                      </button>
                    </div>
                  </div>
                `
                  )
                  .join('')}
              `
              : currentHooks.length > 0
              ? currentHooks
                  .map(
                    (h) => `
                <div class="copilot-sequence-step">
                  <div class="copilot-step-header">
                    <span class="copilot-step-tag">${h.label}</span>
                    <button class="copilot-step-btn copy-hook-btn" data-hook="${encodeURIComponent(h.message)}">Copy & Insert</button>
                  </div>
                  <p class="copilot-step-text">${h.message}</p>
                </div>
              `
                  )
                  .join('')
              : `
                <div style="text-align: center; padding: 24px 12px; color: #94a3b8;">
                  <div style="font-size: 30px; margin-bottom: 6px;">✨</div>
                  <p style="margin: 0; font-size: 12px; color: #64748b;">
                    Click <b>"Generate Sequence"</b> to populate personalized connection hooks and angles.
                  </p>
                </div>
              `
          }
        </div>

        <!-- Footer -->
        <div class="copilot-footer">
          <span>Engine: Not-Ai 4.0 Humanizer • DNS DoH</span>
          <span style="font-weight: 700; color: #1e3e62;">Copilot v2.3</span>
        </div>
      </div>
    `;

    // Event Listeners inside drawer
    wrapper.querySelector('#copilot-close-btn')?.addEventListener('click', () => {
      isOpen = false;
      renderLauncher();
    });

    wrapper.querySelector('#tab-sequence')?.addEventListener('click', () => {
      activeTab = 'sequence';
      renderDrawer();
    });

    wrapper.querySelector('#tab-posts')?.addEventListener('click', () => {
      activeTab = 'posts';
      renderDrawer();
    });

    wrapper.querySelector('#tab-comments')?.addEventListener('click', () => {
      activeTab = 'comments';
      renderDrawer();
    });

    wrapper.querySelector('#tab-osint')?.addEventListener('click', () => {
      activeTab = 'osint';
      renderDrawer();
    });

    wrapper.querySelector('#tab-icebreakers')?.addEventListener('click', () => {
      activeTab = 'icebreakers';
      renderDrawer();
    });

    // Subject Chip Switcher
    wrapper.querySelectorAll('.copilot-subject-chip').forEach((chip) => {
      chip.addEventListener('click', (e) => {
        const target = e.currentTarget as HTMLButtonElement;
        const idx = parseInt(target.getAttribute('data-idx') || '0', 10);
        selectedSubjectIndex = idx;
        renderDrawer();
      });
    });

    // Quick OSINT Launch from Contact Card
    wrapper.querySelector('#quick-osint-btn')?.addEventListener('click', () => {
      activeTab = 'osint';
      const topDork = contact?.osintDorks?.[0];
      if (topDork) {
        openDorkSearch(topDork.url);
      }
      renderDrawer();
    });

    // OSINT Search Buttons
    wrapper.querySelectorAll('.copilot-dork-btn').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        const target = e.currentTarget as HTMLButtonElement;
        const url = decodeURIComponent(target.getAttribute('data-url') || '');
        if (url) openDorkSearch(url);
      });
    });

    // OSINT Copy Query Buttons
    wrapper.querySelectorAll('.copilot-dork-copy-btn').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        const target = e.currentTarget as HTMLButtonElement;
        const query = decodeURIComponent(target.getAttribute('data-query') || '');
        if (query) {
          navigator.clipboard.writeText(query);
          target.innerText = '✓ Copied!';
          setTimeout(() => (target.innerText = '📋 Copy Query'), 2000);
        }
      });
    });

    // Generate Not-Ai Posts
    wrapper.querySelector('#generate-posts-btn')?.addEventListener('click', async () => {
      if (isGeneratingPosts) return;
      const inputEl = wrapper.querySelector('#post-topic-input') as HTMLTextAreaElement;
      postTopic = inputEl?.value || '';
      isGeneratingPosts = true;
      renderDrawer();

      try {
        const s = await getSettings();
        currentPosts = await generateLinkedInPosts(postTopic, s);
      } catch (e) {
        console.error('Error generating posts:', e);
      } finally {
        isGeneratingPosts = false;
        renderDrawer();
      }
    });

    // Insert Post into LinkedIn's active post creator
    wrapper.querySelectorAll('.insert-post-btn').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        const target = e.currentTarget as HTMLButtonElement;
        const content = decodeURIComponent(target.getAttribute('data-content') || '');
        if (content) {
          navigator.clipboard.writeText(content);
          const inserted = insertIntoLinkedInPostEditor(content);
          target.innerText = inserted ? '✓ Inserted!' : '✓ Copied!';
          setTimeout(() => (target.innerText = '📝 Insert into Post'), 2000);
        }
      });
    });

    // Copy Post
    wrapper.querySelectorAll('.copy-post-btn').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        const target = e.currentTarget as HTMLButtonElement;
        const content = decodeURIComponent(target.getAttribute('data-content') || '');
        if (content) {
          navigator.clipboard.writeText(content);
          target.innerText = '✓ Copied!';
          setTimeout(() => (target.innerText = 'Copy'), 2000);
        }
      });
    });

    // Grab Post from screen for commenting
    wrapper.querySelector('#scrape-visible-post-btn')?.addEventListener('click', () => {
      const scraped = scrapeVisibleLinkedInPostText();
      if (scraped) {
        commentContext = scraped;
        const inputEl = wrapper.querySelector('#comment-context-input') as HTMLTextAreaElement;
        if (inputEl) inputEl.value = scraped;
      }
    });

    // Generate Not-Ai Comments
    wrapper.querySelector('#generate-comments-btn')?.addEventListener('click', async () => {
      if (isGeneratingComments) return;
      const inputEl = wrapper.querySelector('#comment-context-input') as HTMLTextAreaElement;
      commentContext = inputEl?.value || '';
      isGeneratingComments = true;
      renderDrawer();

      try {
        const s = await getSettings();
        currentComments = await generateLinkedInComments(commentContext, s);
      } catch (e) {
        console.error('Error generating comments:', e);
      } finally {
        isGeneratingComments = false;
        renderDrawer();
      }
    });

    // Insert Comment into active LinkedIn comment box
    wrapper.querySelectorAll('.insert-comment-btn').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        const target = e.currentTarget as HTMLButtonElement;
        const content = decodeURIComponent(target.getAttribute('data-content') || '');
        if (content) {
          navigator.clipboard.writeText(content);
          const inserted = insertIntoLinkedInCommentEditor(content);
          target.innerText = inserted ? '✓ Inserted!' : '✓ Copied!';
          setTimeout(() => (target.innerText = '💬 Insert Comment'), 2000);
        }
      });
    });

    // Copy Comment
    wrapper.querySelectorAll('.copy-comment-btn').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        const target = e.currentTarget as HTMLButtonElement;
        const content = decodeURIComponent(target.getAttribute('data-content') || '');
        if (content) {
          navigator.clipboard.writeText(content);
          target.innerText = '✓ Copied!';
          setTimeout(() => (target.innerText = 'Copy'), 2000);
        }
      });
    });

    // Manual Contact Info click (Opens modal and extracts data without closing it)
    wrapper.querySelector('#extract-modal-btn')?.addEventListener('click', async () => {
      if (isExtractingContact) return;
      isExtractingContact = true;
      renderDrawer();

      try {
        currentContact = await enrichContactInfo(p, settings, true);
      } catch (err) {
        console.error('Manual contact info check failed:', err);
      } finally {
        isExtractingContact = false;
        renderDrawer();
      }
    });

    // Copy Email
    wrapper.querySelector('#copy-email-btn')?.addEventListener('click', (e) => {
      const btn = e.currentTarget as HTMLButtonElement;
      if (contact?.email) {
        navigator.clipboard.writeText(contact.email);
        btn.innerText = 'Copied!';
        btn.style.color = '#15803d';
        setTimeout(() => {
          btn.innerText = 'Copy';
          btn.style.color = '#1e3e62';
        }, 2000);
      }
    });

    // Copy Phone
    wrapper.querySelector('#copy-phone-btn')?.addEventListener('click', (e) => {
      const btn = e.currentTarget as HTMLButtonElement;
      if (contact?.phone) {
        navigator.clipboard.writeText(contact.phone);
        btn.innerText = 'Copied!';
        btn.style.color = '#15803d';
        setTimeout(() => {
          btn.innerText = 'Copy';
          btn.style.color = '#1e3e62';
        }, 2000);
      }
    });

    // Generate Sequence + Hooks
    wrapper.querySelector('#copilot-generate-btn')?.addEventListener('click', async () => {
      if (isGenerating) return;
      isGenerating = true;
      renderDrawer();

      try {
        const s = await getSettings();
        settings = s;
        const [seqRes, hooksRes] = await Promise.all([
          generateOutreachSequence(p, s),
          generateIcebreakers(p, s),
        ]);
        currentSequence = seqRes;
        currentHooks = hooksRes;
      } catch (err) {
        console.error('Error generating sequence:', err);
      } finally {
        isGenerating = false;
        renderDrawer();
      }
    });

    // Save Lead to Pipeline
    wrapper.querySelector('#copilot-save-btn')?.addEventListener('click', async (e) => {
      const btn = e.currentTarget as HTMLButtonElement;
      await saveLead({
        name: p.name,
        headline: p.headline,
        company: p.company || 'Unknown',
        companyDomain: contact?.domain,
        email: contact?.email,
        phone: contact?.phone,
        emailConfidence: contact?.confidence,
        deliverabilityGrade: contact?.deliverabilityGrade || 'MX Verified',
        sequence: currentSequence
          ? {
              ...currentSequence,
              touch3_email_subject: activeSubject,
            }
          : undefined,
        profileUrl: p.profileUrl,
        selectedIcebreaker: currentSequence?.touch1_linkedin_connect || currentHooks[0]?.message,
      });
      btn.classList.add('copilot-btn-saved');
      btn.innerHTML = '<span>✓</span> Saved!';
      setTimeout(() => {
        btn.classList.remove('copilot-btn-saved');
        btn.innerHTML = '<span>💾</span> Save Lead';
      }, 2500);
    });

    // Touch 1 Copy & Insert
    wrapper.querySelector('#copy-touch1')?.addEventListener('click', (e) => {
      if (seq) {
        navigator.clipboard.writeText(seq.touch1_linkedin_connect);
        insertIntoLinkedInInput(seq.touch1_linkedin_connect);
        const btn = e.currentTarget as HTMLButtonElement;
        btn.innerText = '✓ Inserted!';
        setTimeout(() => (btn.innerText = 'Copy & Insert'), 2000);
      }
    });

    // Touch 2 Copy
    wrapper.querySelector('#copy-touch2')?.addEventListener('click', (e) => {
      if (seq) {
        navigator.clipboard.writeText(seq.touch2_linkedin_followup);
        const btn = e.currentTarget as HTMLButtonElement;
        btn.innerText = '✓ Copied!';
        setTimeout(() => (btn.innerText = 'Copy'), 2000);
      }
    });

    // Touch 3 Gmail Launcher (1-Click email draft)
    wrapper.querySelector('#gmail-touch3')?.addEventListener('click', () => {
      if (seq) {
        const to = contact?.email || '';
        const su = encodeURIComponent(activeSubject);
        const body = encodeURIComponent(seq.touch3_email_body);
        const gmailUrl = `https://mail.google.com/mail/?view=cm&fs=1&to=${to}&su=${su}&body=${body}`;
        window.open(gmailUrl, '_blank');
      }
    });

    // Touch 3 Copy
    wrapper.querySelector('#copy-touch3')?.addEventListener('click', (e) => {
      if (seq) {
        navigator.clipboard.writeText(`Subject: ${activeSubject}\n\n${seq.touch3_email_body}`);
        const btn = e.currentTarget as HTMLButtonElement;
        btn.innerText = '✓ Copied!';
        setTimeout(() => (btn.innerText = 'Copy'), 2000);
      }
    });

    // Touch 4 Copy
    wrapper.querySelector('#copy-touch4')?.addEventListener('click', (e) => {
      if (seq) {
        navigator.clipboard.writeText(seq.touch4_email_followup);
        const btn = e.currentTarget as HTMLButtonElement;
        btn.innerText = '✓ Copied!';
        setTimeout(() => (btn.innerText = 'Copy'), 2000);
      }
    });

    // Copy hook buttons
    wrapper.querySelectorAll('.copy-hook-btn').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        const target = e.currentTarget as HTMLButtonElement;
        const text = decodeURIComponent(target.getAttribute('data-hook') || '');
        if (text) {
          navigator.clipboard.writeText(text);
          insertIntoLinkedInInput(text);
          target.innerText = '✓ Inserted!';
          setTimeout(() => (target.innerText = 'Copy & Insert'), 2000);
        }
      });
    });
  }

  function insertIntoLinkedInInput(text: string) {
    const input = document.querySelector<HTMLElement>(
      'div.msg-form__contenteditable, textarea[name="message"], div[role="textbox"], textarea#custom-message'
    );
    if (input) {
      if (input.tagName.toLowerCase() === 'textarea') {
        (input as HTMLTextAreaElement).value = text;
      } else {
        input.focus();
        document.execCommand('insertText', false, text);
      }
    }
  }

  /**
   * Scrapes visible post update on LinkedIn feed to help user comment quickly
   */
  function scrapeVisibleLinkedInPostText(): string {
    const selectors = [
      '.feed-shared-update-v2__description-wrapper .update-components-text',
      '.feed-shared-update-v2 .feed-shared-text',
      '.feed-shared-update-v2 .break-words',
      'div[data-ad-preview="feed-update"] .feed-shared-text',
      'main article .feed-shared-text',
    ];

    for (const sel of selectors) {
      const el = document.querySelector(sel);
      const text = el?.textContent?.trim();
      if (text && text.length > 20) {
        return text.slice(0, 450);
      }
    }
    return '';
  }

  /**
   * Inserts text into LinkedIn's Post Composer modal
   */
  function insertIntoLinkedInPostEditor(text: string): boolean {
    const selectors = [
      'div.share-creation-state__text-editor div.ql-editor',
      'div.editor-content div.ql-editor',
      'div[data-placeholder*="talk about"]',
      'div.ql-editor[role="textbox"]',
    ];

    for (const sel of selectors) {
      const editor = document.querySelector<HTMLElement>(sel);
      if (editor) {
        editor.focus();
        document.execCommand('selectAll', false);
        document.execCommand('insertText', false, text);
        editor.dispatchEvent(new Event('input', { bubbles: true }));
        return true;
      }
    }
    return false;
  }

  /**
   * Inserts text into LinkedIn's active Comment editor
   */
  function insertIntoLinkedInCommentEditor(text: string): boolean {
    const selectors = [
      'div.comments-comment-box__editor div.ql-editor',
      'form.comments-comment-box div.ql-editor',
      'div.comments-comment-texteditor div.ql-editor',
      'div[data-placeholder="Add a comment…"]',
    ];

    for (const sel of selectors) {
      const editor = document.querySelector<HTMLElement>(sel);
      if (editor) {
        editor.focus();
        document.execCommand('selectAll', false);
        document.execCommand('insertText', false, text);
        editor.dispatchEvent(new Event('input', { bubbles: true }));
        return true;
      }
    }
    return false;
  }

  // Pure URL check with zero automated clicking
  async function scanPageOnce() {
    const rawUrl = window.location.href.split('?')[0];
    const normalizedUrl = rawUrl.replace(/\/overlay\/.*$/, '').replace(/\/$/, '');

    if (normalizedUrl === lastScannedUrl && activeProfile) {
      return;
    }
    lastScannedUrl = normalizedUrl;

    const parsed = parseLinkedInProfile();
    if (parsed) {
      activeProfile = parsed;
      currentSequence = null;
      currentHooks = [];
      selectedSubjectIndex = 0;
      // Clean pattern enrichment: zero automated clicks
      currentContact = await enrichContactInfo(parsed, settings, false);
    } else {
      activeProfile = null;
      currentContact = null;
    }
  }

  // Append host to DOM once
  function mount() {
    if (!document.body) {
      setTimeout(mount, 50);
      return;
    }
    document.body.appendChild(host);
    renderLauncher();

    // Check only on genuine URL changes, ignoring overlay modals
    let lastNormalizedPath = normalizeLinkedInProfilePath(window.location.pathname);
    setInterval(() => {
      const currentNormalizedPath = normalizeLinkedInProfilePath(window.location.pathname);
      if (currentNormalizedPath !== lastNormalizedPath) {
        lastNormalizedPath = currentNormalizedPath;
        scanPageOnce();
        if (isOpen) renderDrawer();
      }
    }, 1500);

    console.log('⚡ LinkedIn Outreach Copilot + Not-Ai Humanizer ready.');
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', mount);
  } else {
    mount();
  }
})();
