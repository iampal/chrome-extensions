import { parseLinkedInProfile, isLinkedInProfileUrl } from '../utils/linkedinParser';
import { generateIcebreakers, generateOutreachSequence } from '../utils/aiGenerator';
import { getSettings, saveLead } from '../utils/storage';
import { enrichContactInfo, ContactEnrichmentResult } from '../utils/emailPredictor';
import { openDorkSearch } from '../utils/osintSearch';
import { GeneratedIcebreaker, LinkedInProfile, OutreachSequence, UserSettings } from '../types';

(function () {
  console.log('⚡ LinkedIn Outreach Copilot initializing...');

  const CONTAINER_ID = 'outreach-copilot-root-host';
  if (document.getElementById(CONTAINER_ID)) {
    return;
  }

  // State
  let isOpen = false;
  let activeTab: 'sequence' | 'osint' | 'icebreakers' = 'sequence';
  let activeProfile: LinkedInProfile | null = null;
  let lastScannedUrl = '';
  let currentSequence: OutreachSequence | null = null;
  let currentHooks: GeneratedIcebreaker[] = [];
  let currentContact: ContactEnrichmentResult | null = null;
  let settings: UserSettings | null = null;
  let isGenerating = false;
  let isExtractingContact = false;

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

  // Add styles inside Shadow DOM
  const style = document.createElement('style');
  style.textContent = `
    * {
      box-sizing: border-box;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
    }

    /* Stable Floating Launcher Button */
    .copilot-launcher {
      position: fixed;
      bottom: 24px;
      right: 24px;
      display: flex;
      align-items: center;
      gap: 8px;
      background: linear-gradient(135deg, #0a66c2 0%, #004182 100%);
      color: #ffffff;
      padding: 12px 20px;
      border-radius: 9999px;
      border: 2px solid rgba(255, 255, 255, 0.3);
      box-shadow: 0 10px 25px -3px rgba(10, 102, 194, 0.6), 0 4px 6px -4px rgba(0, 0, 0, 0.2);
      cursor: pointer;
      font-weight: 700;
      font-size: 14px;
      user-select: none;
      z-index: 2147483647;
      transition: transform 0.15s ease;
    }
    .copilot-launcher:hover {
      transform: scale(1.05);
    }
    .copilot-badge-dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: #4ade80;
      box-shadow: 0 0 6px #4ade80;
    }

    /* Apollo-style Docked Drawer */
    .copilot-drawer {
      position: fixed;
      top: 64px;
      right: 24px;
      width: 420px;
      max-height: calc(100vh - 84px);
      background: #ffffff;
      border-radius: 16px;
      box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.28), 0 0 0 1px rgba(0,0,0,0.08);
      display: flex;
      flex-direction: column;
      overflow: hidden;
      z-index: 2147483647;
      animation: copilotFadeIn 0.15s ease-out;
    }

    @keyframes copilotFadeIn {
      from { opacity: 0; transform: translateY(-6px); }
      to { opacity: 1; transform: translateY(0); }
    }

    .copilot-header {
      padding: 14px 18px;
      background: linear-gradient(135deg, #0a66c2 0%, #004182 100%);
      color: #ffffff;
      display: flex;
      align-items: center;
      justify-content: space-between;
    }
    .copilot-title {
      font-weight: 700;
      font-size: 15px;
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .copilot-close-btn {
      background: none;
      border: none;
      color: #ffffff;
      font-size: 18px;
      cursor: pointer;
      padding: 4px;
      opacity: 0.85;
      line-height: 1;
    }
    .copilot-close-btn:hover {
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
      background: #0a66c2;
      color: #ffffff;
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: 700;
      font-size: 18px;
      object-fit: cover;
      flex-shrink: 0;
    }
    .copilot-profile-info {
      flex: 1;
      min-width: 0;
    }
    .copilot-prospect-name {
      font-weight: 700;
      font-size: 15px;
      color: #0f172a;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .copilot-prospect-role {
      font-size: 12px;
      color: #64748b;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      margin-top: 2px;
    }
    .copilot-prospect-company {
      font-size: 11px;
      color: #0a66c2;
      font-weight: 600;
      margin-top: 2px;
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
      margin-bottom: 6px;
    }
    .copilot-contact-title {
      font-size: 11px;
      font-weight: 700;
      color: #334155;
      text-transform: uppercase;
      letter-spacing: 0.04em;
    }
    .copilot-badge-verified {
      font-size: 10px;
      padding: 2px 6px;
      border-radius: 4px;
      font-weight: 700;
      background: #dcfce7;
      color: #15803d;
    }
    .copilot-badge-mx {
      font-size: 10px;
      padding: 2px 6px;
      border-radius: 4px;
      font-weight: 700;
      background: #eff6ff;
      color: #1d4ed8;
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
      padding-bottom: 0;
    }
    .copilot-contact-val {
      font-weight: 600;
      color: #0f172a;
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
      color: #475569;
      padding: 3px 6px;
      border-radius: 4px;
      font-size: 11px;
      font-weight: 600;
      cursor: pointer;
      flex-shrink: 0;
      margin-left: 8px;
    }
    .copilot-contact-copy-btn:hover {
      background: #f1f5f9;
    }

    .copilot-extract-btn {
      width: 100%;
      margin-top: 8px;
      padding: 7px;
      background: #ffffff;
      border: 1px solid #0a66c2;
      color: #0a66c2;
      border-radius: 6px;
      font-size: 11px;
      font-weight: 700;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 4px;
    }
    .copilot-extract-btn:hover {
      background: #eff6ff;
    }

    /* Tabs */
    .copilot-tabs {
      display: flex;
      background: #f1f5f9;
      border-bottom: 1px solid #e2e8f0;
      margin-top: 10px;
    }
    .copilot-tab {
      flex: 1;
      padding: 9px 8px;
      background: none;
      border: none;
      font-size: 11px;
      font-weight: 600;
      color: #64748b;
      cursor: pointer;
      text-align: center;
      border-bottom: 2px solid transparent;
    }
    .copilot-tab.active {
      color: #0a66c2;
      border-bottom: 2px solid #0a66c2;
      background: #ffffff;
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
      background: #0a66c2;
      color: #ffffff;
      border: none;
      padding: 9px 14px;
      border-radius: 8px;
      font-weight: 600;
      font-size: 13px;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 6px;
    }
    .copilot-btn-primary:hover {
      background: #004182;
    }
    .copilot-btn-secondary {
      background: #f1f5f9;
      color: #334155;
      border: 1px solid #e2e8f0;
      padding: 9px 14px;
      border-radius: 8px;
      font-weight: 600;
      font-size: 13px;
      cursor: pointer;
      display: flex;
      align-items: center;
      gap: 6px;
    }
    .copilot-btn-secondary:hover {
      background: #e2e8f0;
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
      color: #0a66c2;
      background: #eff6ff;
      padding: 2px 6px;
      border-radius: 4px;
    }
    .copilot-step-btns {
      display: flex;
      gap: 6px;
    }
    .copilot-step-btn {
      background: #f8fafc;
      border: 1px solid #cbd5e1;
      color: #334155;
      padding: 3px 6px;
      border-radius: 4px;
      font-size: 11px;
      font-weight: 600;
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

    /* OSINT Dork Card */
    .copilot-dork-card {
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      padding: 10px 12px;
      margin-bottom: 8px;
      background: #ffffff;
    }
    .copilot-dork-title {
      font-weight: 700;
      font-size: 12px;
      color: #0f172a;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .copilot-dork-desc {
      font-size: 11px;
      color: #64748b;
      margin: 4px 0 8px;
    }
    .copilot-dork-btn {
      background: #0a66c2;
      color: #ffffff;
      border: none;
      padding: 5px 10px;
      border-radius: 4px;
      font-size: 11px;
      font-weight: 600;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      gap: 4px;
    }
    .copilot-dork-btn:hover {
      background: #004182;
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

  function renderLauncher() {
    wrapper.innerHTML = `
      <div class="copilot-launcher" id="copilot-launch-btn">
        <span>⚡</span>
        <span>Outreach Copilot</span>
        ${activeProfile ? '<div class="copilot-badge-dot"></div>' : ''}
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
            </div>
            <button class="copilot-close-btn" id="copilot-close-btn">✕</button>
          </div>
          <div style="padding: 24px; text-align: center; color: #475569;">
            <div style="font-size: 32px; margin-bottom: 8px;">👤</div>
            <div style="font-weight: 700; font-size: 15px; margin-bottom: 6px; color: #0f172a;">No Profile Detected</div>
            <p style="font-size: 13px; color: #64748b; line-height: 1.5; margin: 0;">
              Please open any LinkedIn profile page (e.g. <code>https://www.linkedin.com/in/...</code>) to verify contact info and generate sequences.
            </p>
          </div>
          <div class="copilot-footer">
            <span>Ready for LinkedIn profiles</span>
            <span style="font-weight: 600; color: #0a66c2;">Copilot v2.1</span>
          </div>
        </div>
      `;
      wrapper.querySelector('#copilot-close-btn')?.addEventListener('click', () => {
        isOpen = false;
        renderLauncher();
      });
      return;
    }

    const contact = currentContact;
    const seq = currentSequence;

    wrapper.innerHTML = `
      <div class="copilot-drawer">
        <!-- Header -->
        <div class="copilot-header">
          <div class="copilot-title">
            <span>⚡</span>
            <span>Outreach Copilot (Free Engine)</span>
          </div>
          <button class="copilot-close-btn" id="copilot-close-btn">✕</button>
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

        <!-- Contact Intelligence (Method A: DNS MX Verification) -->
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

          <div class="copilot-contact-row">
            <div class="copilot-contact-val">
              <span>📧</span>
              ${
                contact?.email
                  ? `<span id="contact-email-val">${contact.email}</span>`
                  : `<span class="copilot-contact-empty">Click reveal below</span>`
              }
            </div>
            ${contact?.email ? '<button class="copilot-contact-copy-btn" id="copy-email-btn">Copy</button>' : ''}
          </div>

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

          <!-- Safe Manual Button: Only runs when user clicks it -->
          <button class="copilot-extract-btn" id="extract-modal-btn">
            ${isExtractingContact ? '⏳ Checking Contact Info...' : '🔍 Reveal Public Contact Info (Manual)'}
          </button>
        </div>

        <!-- Navigation Tabs -->
        <div class="copilot-tabs">
          <button class="copilot-tab ${activeTab === 'sequence' ? 'active' : ''}" id="tab-sequence">
            🚀 4-Step Sequence
          </button>
          <button class="copilot-tab ${activeTab === 'osint' ? 'active' : ''}" id="tab-osint">
            🔎 Google OSINT (Free)
          </button>
          <button class="copilot-tab ${activeTab === 'icebreakers' ? 'active' : ''}" id="tab-icebreakers">
            ✨ Hooks
          </button>
        </div>

        <!-- Action Bar -->
        <div class="copilot-actions">
          <button class="copilot-btn-primary" id="copilot-generate-btn">
            ${isGenerating ? '<span>⏳</span> Crafting...' : '<span>⚡</span> Generate Sequence'}
          </button>
          <button class="copilot-btn-secondary" id="copilot-save-btn">
            <span>💾</span> Save Lead
          </button>
        </div>

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
                    <div class="copilot-step-btns">
                      <button class="copilot-step-btn" id="copy-touch1">Copy & Insert</button>
                    </div>
                  </div>
                  <p class="copilot-step-text">${seq.touch1_linkedin_connect}</p>
                </div>

                <!-- Touch 2: LinkedIn Followup -->
                <div class="copilot-sequence-step">
                  <div class="copilot-step-header">
                    <span class="copilot-step-tag">Step 2: LinkedIn Follow-Up (+2 Days)</span>
                    <div class="copilot-step-btns">
                      <button class="copilot-step-btn" id="copy-touch2">Copy</button>
                    </div>
                  </div>
                  <p class="copilot-step-text">${seq.touch2_linkedin_followup}</p>
                </div>

                <!-- Touch 3: Cold Email Pitch -->
                <div class="copilot-sequence-step">
                  <div class="copilot-step-header">
                    <span class="copilot-step-tag">Step 3: Direct Email (+4 Days)</span>
                    <div class="copilot-step-btns">
                      <button class="copilot-step-btn copilot-gmail-btn" id="gmail-touch3">✉️ Open in Gmail</button>
                      <button class="copilot-step-btn" id="copy-touch3">Copy</button>
                    </div>
                  </div>
                  <div style="font-weight: 700; font-size: 11px; color: #1e293b; margin-bottom: 4px;">Subject: ${seq.touch3_email_subject}</div>
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
                  <div style="font-size: 30px; margin-bottom: 6px;">🚀</div>
                  <div style="font-weight: 700; font-size: 14px; color: #1e293b; margin-bottom: 4px;">Multi-Channel Sequence</div>
                  <p style="margin: 0; font-size: 12px; color: #64748b;">
                    Click <b>"Generate Sequence"</b> to create an automated 4-step LinkedIn & Cold Email sequence tailored to <b>${p.name}</b>.
                  </p>
                </div>
              `
              : activeTab === 'osint'
              ? `
                <div style="margin-bottom: 10px; font-size: 12px; color: #475569;">
                  <b>Method B: Public Web Search Dorking</b><br/>
                  Find publicly indexed emails, PDFs, and direct contact details without paying any data broker:
                </div>
                ${(contact?.osintDorks || [])
                  .map(
                    (dork) => `
                  <div class="copilot-dork-card">
                    <div class="copilot-dork-title">
                      <span>${dork.title}</span>
                      <button class="copilot-dork-btn" data-url="${encodeURIComponent(dork.url)}">
                        🔍 Search
                      </button>
                    </div>
                    <div class="copilot-dork-desc">${dork.description}</div>
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
                    Click <b>"Generate Sequence"</b> to populate icebreakers and multi-touch angles.
                  </p>
                </div>
              `
          }
        </div>

        <!-- Footer -->
        <div class="copilot-footer">
          <span>Method A: DNS MX Verified • Method B: OSINT</span>
          <span style="font-weight: 600; color: #0a66c2;">Copilot v2.1</span>
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

    wrapper.querySelector('#tab-osint')?.addEventListener('click', () => {
      activeTab = 'osint';
      renderDrawer();
    });

    wrapper.querySelector('#tab-icebreakers')?.addEventListener('click', () => {
      activeTab = 'icebreakers';
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

    // Manual Contact Info click (ONLY runs when explicitly clicked by user)
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
          btn.style.color = '#475569';
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
          btn.style.color = '#475569';
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
        console.error('Error generating:', err);
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
        sequence: currentSequence || undefined,
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
        const su = encodeURIComponent(seq.touch3_email_subject);
        const body = encodeURIComponent(seq.touch3_email_body);
        const gmailUrl = `https://mail.google.com/mail/?view=cm&fs=1&to=${to}&su=${su}&body=${body}`;
        window.open(gmailUrl, '_blank');
      }
    });

    // Touch 3 Copy
    wrapper.querySelector('#copy-touch3')?.addEventListener('click', (e) => {
      if (seq) {
        navigator.clipboard.writeText(`Subject: ${seq.touch3_email_subject}\n\n${seq.touch3_email_body}`);
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

  // Pure URL check with zero automated clicking
  async function scanPageOnce() {
    const currentUrl = window.location.href.split('?')[0];
    if (currentUrl === lastScannedUrl && activeProfile) {
      return;
    }
    lastScannedUrl = currentUrl;

    const parsed = parseLinkedInProfile();
    if (parsed) {
      activeProfile = parsed;
      currentSequence = null;
      currentHooks = [];
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

    // Check only on URL changes (every 2s), without touching the DOM or clicking anything
    let lastPath = window.location.pathname;
    setInterval(() => {
      if (window.location.pathname !== lastPath) {
        lastPath = window.location.pathname;
        scanPageOnce();
        if (isOpen) renderDrawer();
      }
    }, 1500);

    console.log('⚡ LinkedIn Outreach Copilot stable mount ready.');
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', mount);
  } else {
    mount();
  }
})();
