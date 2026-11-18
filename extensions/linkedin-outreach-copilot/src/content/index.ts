import { parseLinkedInProfile, isLinkedInProfileUrl } from '../utils/linkedinParser';
import { generateIcebreakers } from '../utils/aiGenerator';
import { getSettings, saveLead, checkAndIncrementQuota } from '../utils/storage';
import { enrichContactInfo, ContactEnrichmentResult } from '../utils/emailPredictor';
import { GeneratedIcebreaker, LinkedInProfile, UserSettings } from '../types';

(function () {
  console.log('⚡ LinkedIn Outreach Copilot initializing...');

  const CONTAINER_ID = 'outreach-copilot-root-host';
  if (document.getElementById(CONTAINER_ID)) {
    return;
  }

  // State
  let isOpen = false;
  let activeProfile: LinkedInProfile | null = null;
  let currentHooks: GeneratedIcebreaker[] = [];
  let currentContact: ContactEnrichmentResult | null = null;
  let settings: UserSettings | null = null;
  let isGenerating = false;
  let isExtractingContact = false;

  // Load settings
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

    /* Floating Launcher Button */
    .copilot-launcher {
      position: fixed;
      bottom: 24px;
      right: 24px;
      display: flex;
      align-items: center;
      gap: 8px;
      background: #0a66c2;
      color: #ffffff;
      padding: 12px 20px;
      border-radius: 9999px;
      border: 2px solid rgba(255, 255, 255, 0.3);
      box-shadow: 0 10px 25px -3px rgba(10, 102, 194, 0.6), 0 4px 6px -4px rgba(0, 0, 0, 0.2);
      cursor: pointer;
      font-weight: 700;
      font-size: 14px;
      transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
      user-select: none;
      z-index: 2147483647;
    }
    .copilot-launcher:hover {
      transform: scale(1.06);
      background: #004182;
      box-shadow: 0 14px 28px -3px rgba(10, 102, 194, 0.7);
    }
    .copilot-badge-dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: #4ade80;
      box-shadow: 0 0 6px #4ade80;
    }

    /* Drawer */
    .copilot-drawer {
      position: fixed;
      top: 68px;
      right: 24px;
      width: 410px;
      max-height: calc(100vh - 90px);
      background: #ffffff;
      border-radius: 16px;
      box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25), 0 0 0 1px rgba(0,0,0,0.08);
      display: flex;
      flex-direction: column;
      overflow: hidden;
      z-index: 2147483647;
      animation: copilotSlideIn 0.25s cubic-bezier(0.16, 1, 0.3, 1);
    }

    @keyframes copilotSlideIn {
      from { opacity: 0; transform: translateY(-10px) scale(0.98); }
      to { opacity: 1; transform: translateY(0) scale(1); }
    }

    .copilot-header {
      padding: 14px 18px;
      background: #0a66c2;
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
      padding: 14px 18px;
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

    /* Contact Enrichment Section (Real Extraction) */
    .copilot-contact-card {
      margin: 12px 18px 0;
      padding: 12px 14px;
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
      font-weight: 700;
      color: #334155;
      text-transform: uppercase;
      letter-spacing: 0.04em;
      display: flex;
      align-items: center;
      gap: 4px;
    }
    .copilot-contact-badge-verified {
      font-size: 10px;
      padding: 2px 6px;
      border-radius: 4px;
      font-weight: 700;
      background: #dcfce7;
      color: #15803d;
    }
    .copilot-contact-badge-pattern {
      font-size: 10px;
      padding: 2px 6px;
      border-radius: 4px;
      font-weight: 700;
      background: #eff6ff;
      color: #1d4ed8;
    }
    .copilot-contact-badge-none {
      font-size: 10px;
      padding: 2px 6px;
      border-radius: 4px;
      font-weight: 700;
      background: #f1f5f9;
      color: #64748b;
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
    .copilot-contact-val-empty {
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
      transition: all 0.15s;
    }
    .copilot-extract-btn:hover {
      background: #eff6ff;
    }

    .copilot-source-note {
      font-size: 10px;
      color: #64748b;
      margin-top: 6px;
      display: block;
    }

    .copilot-actions {
      padding: 12px 18px;
      display: flex;
      gap: 8px;
      border-bottom: 1px solid #f1f5f9;
    }
    .copilot-btn-primary {
      flex: 1;
      background: #0a66c2;
      color: #ffffff;
      border: none;
      padding: 10px 14px;
      border-radius: 8px;
      font-weight: 600;
      font-size: 13px;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 6px;
      transition: background 0.15s;
    }
    .copilot-btn-primary:hover {
      background: #004182;
    }
    .copilot-btn-secondary {
      background: #f1f5f9;
      color: #334155;
      border: 1px solid #e2e8f0;
      padding: 10px 14px;
      border-radius: 8px;
      font-weight: 600;
      font-size: 13px;
      cursor: pointer;
      display: flex;
      align-items: center;
      gap: 6px;
      transition: all 0.15s;
    }
    .copilot-btn-secondary:hover {
      background: #e2e8f0;
    }
    .copilot-btn-saved {
      background: #16a34a !important;
      color: #ffffff !important;
      border-color: #16a34a !important;
    }

    .copilot-body {
      padding: 14px 18px;
      flex: 1;
      overflow-y: auto;
      max-height: 320px;
    }
    .copilot-hook-card {
      border: 1px solid #e2e8f0;
      border-radius: 10px;
      padding: 12px;
      margin-bottom: 12px;
      background: #ffffff;
      box-shadow: 0 1px 3px rgba(0,0,0,0.04);
    }
    .copilot-hook-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 8px;
    }
    .copilot-hook-label {
      font-size: 11px;
      font-weight: 700;
      color: #0a66c2;
      text-transform: uppercase;
    }
    .copilot-hook-copy-btn {
      background: #f8fafc;
      color: #475569;
      border: 1px solid #e2e8f0;
      padding: 4px 8px;
      border-radius: 6px;
      font-size: 11px;
      font-weight: 600;
      cursor: pointer;
      display: flex;
      align-items: center;
      gap: 4px;
    }
    .copilot-hook-copy-btn:hover {
      background: #e2e8f0;
    }
    .copilot-hook-copied {
      background: #dcfce7 !important;
      color: #15803d !important;
      border-color: #86efac !important;
    }
    .copilot-hook-text {
      margin: 0;
      font-size: 13px;
      color: #334155;
      line-height: 1.45;
    }

    .copilot-footer {
      padding: 10px 18px;
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

  // Root wrapper inside shadow
  const wrapper = document.createElement('div');
  wrapper.id = 'copilot-shadow-wrapper';
  shadow.appendChild(wrapper);

  // Render Launcher Button
  function renderLauncher() {
    wrapper.innerHTML = `
      <div class="copilot-launcher" id="copilot-launch-btn">
        <span>⚡</span>
        <span>Outreach Copilot</span>
        ${activeProfile ? '<div class="copilot-badge-dot"></div>' : ''}
      </div>
    `;

    wrapper.querySelector('#copilot-launch-btn')?.addEventListener('click', async () => {
      isOpen = true;
      await detectProfile();
      renderDrawer();
    });
  }

  // Render Slide-out Drawer
  function renderDrawer() {
    if (!activeProfile) {
      detectProfile();
    }

    const p = activeProfile;

    // If not viewing any profile page
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
            <div style="font-weight: 700; font-size: 15px; margin-bottom: 6px; color: #0f172a;">No LinkedIn Profile Detected</div>
            <p style="font-size: 13px; color: #64748b; line-height: 1.5; margin: 0 0 16px;">
              Please open any LinkedIn profile page (e.g. <code>https://www.linkedin.com/in/...</code>) to extract real contact info and generate personalized outreach hooks.
            </p>
          </div>
          <div class="copilot-footer">
            <span>Ready for LinkedIn profiles</span>
            <span style="font-weight: 600; color: #0a66c2;">Copilot v1.0</span>
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

    wrapper.innerHTML = `
      <div class="copilot-drawer">
        <div class="copilot-header">
          <div class="copilot-title">
            <span>⚡</span>
            <span>Outreach Copilot</span>
          </div>
          <button class="copilot-close-btn" id="copilot-close-btn">✕</button>
        </div>

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

        <!-- Contact Intelligence Box (Real Extraction + Clean Fallbacks) -->
        <div class="copilot-contact-card">
          <div class="copilot-contact-header">
            <div class="copilot-contact-title">
              <span>🎯</span> Contact Details
            </div>
            ${
              contact?.confidence === 'verified_linkedin'
                ? '<span class="copilot-contact-badge-verified">✓ LINKEDIN VERIFIED</span>'
                : contact?.confidence === 'verified_api'
                ? '<span class="copilot-contact-badge-verified">✓ API VERIFIED</span>'
                : contact?.confidence === 'pattern_guess'
                ? '<span class="copilot-contact-badge-pattern">⚡ CORPORATE PATTERN</span>'
                : '<span class="copilot-contact-badge-none">UNVERIFIED</span>'
            }
          </div>

          <!-- Email Row -->
          <div class="copilot-contact-row">
            <div class="copilot-contact-val">
              <span>📧</span>
              ${
                contact?.email
                  ? `<span id="contact-email-val">${contact.email}</span>`
                  : `<span class="copilot-contact-val-empty">Not publicly displayed</span>`
              }
            </div>
            ${
              contact?.email
                ? '<button class="copilot-contact-copy-btn" id="copy-email-btn">Copy</button>'
                : ''
            }
          </div>

          <!-- Phone Row -->
          <div class="copilot-contact-row">
            <div class="copilot-contact-val">
              <span>📞</span>
              ${
                contact?.phone
                  ? `<span id="contact-phone-val">${contact.phone}</span>`
                  : `<span class="copilot-contact-val-empty">Not publicly listed</span>`
              }
            </div>
            ${
              contact?.phone
                ? '<button class="copilot-contact-copy-btn" id="copy-phone-btn">Copy</button>'
                : ''
            }
          </div>

          <!-- Button to trigger deep modal extraction -->
          <button class="copilot-extract-btn" id="extract-modal-btn">
            ${isExtractingContact ? '⏳ Extracting LinkedIn Contact Info...' : '⚡ Extract Direct from LinkedIn Contact Info'}
          </button>

          <span class="copilot-source-note">
            ${contact?.sourceNote || 'Click above to scan the native LinkedIn Contact Info modal'}
          </span>
        </div>

        <div class="copilot-actions">
          <button class="copilot-btn-primary" id="copilot-generate-btn">
            ${isGenerating ? '<span>⏳</span> Crafting Hooks...' : '<span>⚡</span> Generate Hooks'}
          </button>
          <button class="copilot-btn-secondary" id="copilot-save-btn">
            <span>💾</span> Save Lead
          </button>
        </div>

        <div class="copilot-body" id="copilot-hooks-body">
          ${
            currentHooks.length > 0
              ? currentHooks
                  .map(
                    (hook) => `
                <div class="copilot-hook-card">
                  <div class="copilot-hook-header">
                    <span class="copilot-hook-label">${hook.label}</span>
                    <button class="copilot-hook-copy-btn" data-hook-id="${hook.id}">
                      📋 Copy & Insert
                    </button>
                  </div>
                  <p class="copilot-hook-text">${hook.message}</p>
                </div>
              `
                  )
                  .join('')
              : `
                <div style="text-align: center; padding: 20px 12px; color: #94a3b8;">
                  <div style="font-size: 28px; margin-bottom: 6px;">✨</div>
                  <p style="margin: 0; font-size: 13px; color: #475569;">
                    Click <b>"Generate Hooks"</b> to create 3 hyper-personalized messages tailored to <b>${p.name}</b>.
                  </p>
                </div>
              `
          }
        </div>

        <div class="copilot-footer">
          <span>Auto-injects into connection note</span>
          <span style="font-weight: 600; color: #0a66c2;">Copilot v1.0</span>
        </div>
      </div>
    `;

    // Event listeners inside drawer
    wrapper.querySelector('#copilot-close-btn')?.addEventListener('click', () => {
      isOpen = false;
      renderLauncher();
    });

    // Deep LinkedIn Modal Extraction
    wrapper.querySelector('#extract-modal-btn')?.addEventListener('click', async () => {
      if (isExtractingContact) return;
      isExtractingContact = true;
      renderDrawer();

      try {
        currentContact = await enrichContactInfo(p, settings, true);
      } catch (err) {
        console.error('Failed to extract modal contact info:', err);
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

    wrapper.querySelector('#copilot-generate-btn')?.addEventListener('click', async () => {
      if (isGenerating) return;
      isGenerating = true;
      renderDrawer();

      try {
        const s = await getSettings();
        settings = s;
        const hooks = await generateIcebreakers(p, s);
        currentHooks = hooks;
      } catch (err) {
        console.error('Error generating:', err);
      } finally {
        isGenerating = false;
        renderDrawer();
      }
    });

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
        profileUrl: p.profileUrl,
        selectedIcebreaker: currentHooks[0]?.message,
      });
      btn.classList.add('copilot-btn-saved');
      btn.innerHTML = '<span>✓</span> Saved!';
      setTimeout(() => {
        btn.classList.remove('copilot-btn-saved');
        btn.innerHTML = '<span>💾</span> Save Lead';
      }, 2500);
    });

    // Copy & Insert buttons
    wrapper.querySelectorAll('.copilot-hook-copy-btn').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        const target = e.currentTarget as HTMLButtonElement;
        const hookId = target.getAttribute('data-hook-id');
        const hook = currentHooks.find((h) => h.id === hookId);
        if (hook) {
          navigator.clipboard.writeText(hook.message);
          target.classList.add('copilot-hook-copied');
          target.innerHTML = '<span>✓</span> Copied!';
          setTimeout(() => {
            target.classList.remove('copilot-hook-copied');
            target.innerHTML = '📋 Copy & Insert';
          }, 2000);

          insertIntoLinkedInInput(hook.message);
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

  // Detect profile from page
  async function detectProfile() {
    const parsed = parseLinkedInProfile();
    if (parsed) {
      if (parsed.profileUrl !== activeProfile?.profileUrl) {
        activeProfile = parsed;
        currentHooks = [];
        currentContact = await enrichContactInfo(parsed, settings, false);
      }
    } else {
      activeProfile = null;
      currentContact = null;
    }
  }

  // Inject a native "Save Lead" button directly into LinkedIn profile's action row!
  function injectNativeProfileButton() {
    if (!isLinkedInProfileUrl()) return;

    const BUTTON_ID = 'linkedin-copilot-injected-save-btn';
    if (document.getElementById(BUTTON_ID)) return;

    // Look for LinkedIn's action button row
    const targetRow = document.querySelector(
      '.pvs-profile-actions, .pv-top-card-v2-ctas, div.ph5 .display-flex.align-items-center.mt2, main section .display-flex:has(button.artdeco-button)'
    );

    if (targetRow) {
      const btn = document.createElement('button');
      btn.id = BUTTON_ID;
      btn.type = 'button';
      btn.innerHTML = '⚡ <b>Save Lead & Copilot</b>';
      btn.style.cssText = `
        background-color: #0a66c2;
        color: #ffffff;
        border: none;
        border-radius: 16px;
        padding: 6px 14px;
        font-size: 14px;
        font-weight: 600;
        cursor: pointer;
        display: inline-flex;
        align-items: center;
        gap: 6px;
        margin-left: 8px;
        box-shadow: 0 2px 4px rgba(10, 102, 194, 0.2);
        z-index: 100;
      `;

      btn.addEventListener('mouseenter', () => (btn.style.backgroundColor = '#004182'));
      btn.addEventListener('mouseleave', () => (btn.style.backgroundColor = '#0a66c2'));
      btn.addEventListener('click', async () => {
        isOpen = true;
        await detectProfile();
        renderDrawer();
      });

      targetRow.appendChild(btn);
    }
  }

  // Append host to DOM
  function mount() {
    if (!document.body) {
      setTimeout(mount, 50);
      return;
    }
    document.body.appendChild(host);
    renderLauncher();

    // Check periodically & on mutations
    setInterval(() => {
      detectProfile();
      injectNativeProfileButton();
    }, 1500);

    const observer = new MutationObserver(() => {
      detectProfile();
      injectNativeProfileButton();
    });
    observer.observe(document.body, { childList: true, subtree: true });

    console.log('⚡ LinkedIn Outreach Copilot successfully attached to DOM.');
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', mount);
  } else {
    mount();
  }
})();
