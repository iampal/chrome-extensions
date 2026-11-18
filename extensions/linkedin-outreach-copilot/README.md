# ⚡ LinkedIn Outreach Copilot

> AI-powered hyper-personalized connection icebreakers & 1-click lead exporter for LinkedIn. Built for agency owners, recruiters, SDRs, and consultants.

---

## 🎯 Features

1. **LinkedIn Profile DOM Scraper (`src/utils/linkedinParser.ts`)**
   - Automatically detects prospect name, headline, current company, location, and about section without rate limits or bot-detection risks.
2. **AI Hyper-Personalized Icebreaker Generator (`src/utils/aiGenerator.ts`)**
   - Generates 3 distinct outreach angles:
     - **Casual Compliment**: Human milestone and role appreciation.
     - **Problem / Value Pitch**: Tailored offer connecting their role to your custom value pitch.
     - **Curiosity Hook**: Peer-to-peer inquiry with high reply rates.
   - Supports **Google Gemini 1.5 Flash**, **OpenAI GPT-4o-mini**, or the **Built-in Smart Contextual Engine** (works zero-config).
3. **Shadow DOM Injection (`src/content/CopilotWidget.tsx`)**
   - Completely encapsulates CSS so LinkedIn styles never break the extension, and extension styles never disrupt LinkedIn.
   - Includes **"Copy & Insert"** to automatically populate LinkedIn's active message box.
4. **Lead Pipeline & CSV Export (`src/popup/App.tsx`)**
   - 1-click save leads to your local pipeline.
   - Export captured leads with generated hooks directly to CSV for CRM import.
5. **Built-in Monetization & Paywall Engine (`src/utils/storage.ts`)**
   - Enforces a 5 free generations/day limit.
   - Pro subscription upgrade modal (\$19/mo) with simulated toggle for testing.

---

## 🚀 How to Load & Test in Chrome (30 Seconds)

1. Open Google Chrome.
2. Navigate to: `chrome://extensions`
3. Toggle on **Developer mode** (top right corner).
4. Click **Load unpacked** (top left).
5. Select the `dist` directory inside:
   ```
   /Users/ankushpal/.gemini/antigravity/scratch/linkedin-outreach-copilot/dist
   ```
6. Open any LinkedIn profile (e.g. `https://www.linkedin.com/in/...`). You will see the floating **Outreach Copilot** button at the bottom-right!

---

## 💰 How to Turn This Into \$1,000+ MRR

### 1. Hooking up Real Payments
To accept real subscription payments without managing backend servers:
- Sign up at **[ExtensionPay.com](https://extensionpay.com/)** (Stripe wrapper made for Chrome extensions).
- Run `npm install extensionpay`.
- Replace the local quota check in `src/utils/storage.ts` with `extpay.getUser()`.

### 2. Chrome Web Store Listing
- Create a developer account at the **Chrome Web Store Developer Dashboard** (\$5 one-time fee).
- Compress the `dist` directory into a `.zip` file.
- Key search tags to include: *LinkedIn Outreach, Sales Navigator Scraper, AI Icebreaker, B2B Lead Generator, Cold Message Copilot*.

### 3. Acquiring Your First 20 Paying Users
- Search Reddit communities: `r/sales`, `r/leadgeneration`, `r/agency`.
- Post a short demo video showing how it generates 3 tailored connection messages in 2 seconds and saves them to CSV.
- Offer early access for \$14/mo or \$99/lifetime to get your initial 20 customers.
