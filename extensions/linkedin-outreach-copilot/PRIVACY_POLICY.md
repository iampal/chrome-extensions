# Privacy Policy for LinkedIn Outreach Copilot

*Last updated: November 19, 2026*

**LinkedIn Outreach Copilot - AI & OSINT Lead Finder** ("the Extension", "we", "us", or "our") is committed to protecting your privacy. This Privacy Policy describes how the Extension handles information when you install and use it.

---

### 1. Single Purpose & Core Functionality

The sole purpose of the Extension is to assist professionals with cold outreach productivity:
* Extracting publicly visible LinkedIn profile information on the active tab (name, headline, company).
* Estimating corporate email patterns and verifying domain MX records via public DNS-over-HTTPS.
* Providing 1-click Google OSINT search dorks for publicly indexed business contact information.
* Generating humanized, non-robotic outreach sequences, connection notes, posts, and comments.

---

### 2. Information We Collect and How We Use It

#### A. Data Kept 100% Local on Your Device
* **Saved Leads Pipeline**: Leads that you explicitly choose to save (Name, Company, Predicted Email, Notes) are stored exclusively in your browser's private `chrome.storage.local`.
* **API Keys & User Settings**: If you choose to configure a Google Gemini or OpenAI API key, or customize your pitch notes, these credentials remain on your local device in encrypted browser storage. They are never transmitted to our servers or any third-party analytics service.

#### B. Active Tab Interaction
* When you open the Extension on a LinkedIn profile page, it reads the public profile DOM (name, headline, company, avatar) solely to populate the outreach sequence and contact card.
* The Extension does not scrape private messages, passwords, or feeds in the background.

#### C. Free Public DNS Verification
* To verify corporate email deliverability without requiring paid third-party data broker subscriptions, the Extension sends standard DNS lookup requests to Google Public DNS (`https://dns.google/resolve`) to verify domain MX records. No personal profile data or user identity is included in DNS queries.

---

### 3. Third-Party Services

* **Google DNS-over-HTTPS (`dns.google`)**: Used solely for domain MX record queries. Governed by Google's Privacy Policy.
* **AI Providers (Google Gemini / OpenAI)**: If you provide your own API key, sequence generation requests are transmitted directly from your browser to your chosen provider via HTTPS.

---

### 4. What We DO NOT Do

* ❌ **We DO NOT sell, rent, or monetize your personal data.**
* ❌ **We DO NOT track your browsing history across other websites.**
* ❌ **We DO NOT transmit your saved leads to central database servers.**
* ❌ **We DO NOT collect payment information or credit cards within the extension.**

---

### 5. Data Retention and Deletion

All saved leads and extension configurations are stored locally in your browser. You can permanently delete any lead at any time by clicking the trash icon in the extension popup, or remove all data immediately by uninstalling the extension or clearing extension storage in `chrome://extensions`.

---

### 6. Compliance with Chrome Web Store Policies

This Extension complies fully with the **Google Chrome Web Store Developer Program Policies**, including the **Limited Use Requirements** and **User Data FAQ**.

---

### 7. Contact & Support

If you have questions regarding this Privacy Policy or extension permissions, please contact:
* **Developer**: Ankush Pal
* **GitHub Repository**: [https://github.com/iampal/chrome-extensions](https://github.com/iampal/chrome-extensions)
* **Issues / Support**: [https://github.com/iampal/chrome-extensions/issues](https://github.com/iampal/chrome-extensions/issues)
