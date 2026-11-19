# Chrome Web Store Listing & Submission Guide

Use the exact details below when filling out your submission on the [Chrome Web Store Developer Dashboard](https://chrome.google.com/webstore/devconsole).

---

## 1. Store Metadata

### Extension Name (Max 45 chars)
```text
LinkedIn Outreach Copilot - AI & OSINT Lead
```
*(Current `manifest.json`: "LinkedIn Outreach Copilot - AI & OSINT Lead Finder")*

### Short Description / Summary (Max 132 chars)
```text
AI LinkedIn outreach, free DNS/MX email verification, Google OSINT dorking, humanized post drafter & smart commenter.
```
*(Length: 119 characters - Complies with Google's 132-char ceiling)*

### Category
* **Primary**: `Productivity`
* **Secondary**: `Social & Communication`

### Language
* `English (United States)`

---

## 2. Detailed Description (Paste into Chrome Web Store Listing)

```markdown
🚀 Supercharge your LinkedIn networking, cold outreach, and lead generation without paying hundreds of dollars every month for Apollo.io or RocketReach!

LinkedIn Outreach Copilot is a 100% free, enterprise-grade Chrome extension engineered for founders, SDRs, recruiters, and consultants. It combines real-time DNS MX email deliverability verification, Google OSINT public dorking, and the research-backed Not-Ai natural writing engine for humanized posts and comments.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✨ CORE CAPABILITIES
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

1. 🎯 Contact Intelligence & Free Email Verification (Method A)
• Predicts verified corporate email addresses based on real company domain patterns.
• Queries Google DNS-over-HTTPS (DoH) to check live MX records in real time (Google Workspace, Microsoft 365, Proofpoint, Mimecast).
• Provides a real deliverability grade (e.g., "95% Deliverable - Microsoft 365 MX Verified") without requiring paid API credits.

2. 🔎 1-Click Google OSINT Search Dorks (Method B)
• 1-Click Google search dorks that uncover publicly indexed work emails, company PDFs, staff directories, and verified X/Twitter profiles.
• Access directly from the in-page drawer or use the standalone OSINT tool in the Chrome toolbar popup.

3. 🚀 High-Converting 4-Step Outreach Sequences
• Automatically generates a multi-channel sequence tailored to the prospect's real functional role (Sales, Engineering, Product, Founder/Executive):
  - Step 1: LinkedIn Connection Note (under 280 characters, natural peer hook).
  - Step 2: LinkedIn Follow-Up (+2 Days).
  - Step 3: Direct Cold Email with dynamic role-targeted subject line + 1-Click "Open in Gmail" draft launcher.
  - Step 4: Final Follow-Up Bump (+4 Days).
• Subject Quick Selector: switch between Executive, Direct, and Collaborative subject angles with one click.

4. ✍️ Not-Ai Humanized LinkedIn Post Drafter
• Turn raw thoughts or bullet points into 3 distinct, high-impact post archetypes:
  - 📖 Story & Lesson
  - ⚡ Actionable Playbook
  - 💡 Contrarian Truth
• Applies Not-Ai 4.0 natural-writing rules: zero robotic buzzwords ("in today's fast-paced world", "delve", "leverage", "game-changer"), natural contractions, and no em dashes.
• 1-Click "Insert into Post" automatically populates LinkedIn's post composer.

5. 💬 Not-Ai Smart Commenter
• Overcome awkward generic comments ("Great post!").
• Click "Grab Post on Screen" to automatically read whatever post you are viewing and generate 3 thoughtful responses:
  - 💡 Peer Value-Add
  - ❓ Thoughtful Question
  - ⚖️ Nuanced Perspective
• 1-Click "Insert Comment" injects directly into the active comment box.

6. 💾 Local Pipeline & One-Click CSV Export
• Save promising leads into your private local pipeline with one click.
• Export cleanly formatted CSVs ready for HubSpot, Salesforce, Instantly, or Smartlead.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🔒 PRIVACY-FIRST & ZERO TRACKING
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
• 100% Client-Side: Your saved leads and custom pitches remain stored strictly on your local computer via chrome.storage.local.
• No External Data Brokers: We never sell your data, monetize your browsing activity, or inject third-party trackers.
• Works with zero API keys required, or connect your own free Gemini / OpenAI key for unlimited generative flexibility.

Take your outbound pipeline to the next level. Install LinkedIn Outreach Copilot today!
```

---

## 3. Privacy Practices Tab (Developer Dashboard)

### Single Purpose Declaration
```text
This extension assists professionals with LinkedIn outreach productivity by verifying corporate domain MX records, generating contextual outreach messages and posts, and providing OSINT search shortcuts.
```

### Permission Justifications (Mandatory for Review)

1. **`storage`**:
   * *Justification*: Required to save user pipeline leads and custom preferences locally on their device in `chrome.storage.local`.

2. **`activeTab`**:
   * *Justification*: Required to inspect the current LinkedIn prospect's public profile headline and company to generate tailored outreach copy.

3. **`clipboardWrite`**:
   * *Justification*: Required to let users copy generated sequences, cold email drafts, and Google OSINT search queries in a single click.

4. **Host Permission: `*://*.linkedin.com/*`**:
   * *Justification*: Required for the in-page outreach drawer to render on LinkedIn profile pages and assist users with drafting messages, posts, and comments.

5. **Host Permission: `https://dns.google/*` and `https://cloudflare-dns.com/*`**:
   * *Justification*: Used exclusively to perform DNS-over-HTTPS queries to verify whether a prospect's company domain has active MX mail records.

6. **Host Permission: `https://generativelanguage.googleapis.com/*` and `https://api.openai.com/*`**:
   * *Justification*: Allows optional user-supplied API keys to connect directly to Gemini or OpenAI for sequence generation.

### Data Usage Disclosures
* **Personally Identifiable Information**: Mark as `Yes` (User-saved name/company for leads), with note: *"All lead data is stored exclusively in the user's local browser storage. No data is collected on external servers."*
* **Website Content**: Mark as `Yes`, with note: *"The extension reads public profile text on LinkedIn to generate personalized outreach templates."*
* Check the box: *"I do not sell or transfer user data to third parties."*
* Check the box: *"I do not use or transfer user data for purposes unrelated to the item's core functionality."*
* Check the box: *"I do not use or transfer user data to determine creditworthiness or for lending purposes."*

### Privacy Policy URL
```text
https://github.com/iampal/chrome-extensions/blob/main/extensions/linkedin-outreach-copilot/PRIVACY_POLICY.md
```

---

## 4. Visual Assets Checklist

All assets are generated in `extensions/linkedin-outreach-copilot/assets/store/`:
* [x] **Store Icon**: `icons/icon128.png` (128x128)
* [x] **Small Promo Tile**: `assets/store/promo_small_440x280.png` (440x280)
* [x] **Marquee Promo Banner**: `assets/store/promo_marquee_1400x560.png` (1400x560)
* [x] **Screenshots (1280x800)**:
  - `screenshot_1_dns_verification_1280x800.png`
  - `screenshot_2_role_sequences_1280x800.png`
  - `screenshot_3_google_osint_1280x800.png`
  - `screenshot_4_notai_humanizer_1280x800.png`

---

## 5. Reviewer Notes (For Google Chrome Web Store Reviewers)

```text
To test the extension:
1. Install the extension zip.
2. Navigate to any public LinkedIn profile (e.g., https://www.linkedin.com/in/williamhgates or any public user profile).
3. Click the floating "Outreach Copilot" button in the bottom-right corner.
4. The drawer opens showing the prospect's headline, DNS/MX email verification score, and 4-step outreach sequence.
5. Click "✍️ Post Drafter" to test post generation, or click "🔎 OSINT" to test 1-click Google search dorks.
6. Click the extension toolbar icon to open the popup showing saved leads and the standalone OSINT lookup tool.
All features operate entirely locally in the browser with zero external server dependencies.
```
