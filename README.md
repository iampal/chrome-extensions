# 🚀 Chrome Extensions Monorepo

> A structured monorepo for building, analyzing, and scaling high-cashflow Chrome extensions and micro-SaaS utilities.

---

## 📂 Repository Structure

```
chrome-extensions/
├── extensions/
│   └── linkedin-outreach-copilot/  # LinkedIn AI outreach, icebreaker generator & lead exporter
├── tools/
│   └── rea/                        # REA (Reverse Engineer Anything) analysis engine
└── README.md
```

---

## 📦 Extensions Directory

Each extension is self-contained with its own build pipeline, manifest, and dependencies:

### 1. `extensions/linkedin-outreach-copilot`
* **Features**:
  * Real LinkedIn Contact Info extraction (Email & Phone).
  * 3 AI-personalized outreach angles (Casual compliment, Value pitch, Curiosity hook).
  * In-profile `Save Lead` action button + bottom-right floating badge.
  * Local lead pipeline with 1-click CSV export.
* **Tech Stack**: Manifest V3, TypeScript, React 19 (Popup), Vanilla TS (Content Script).
* **Build**:
  ```bash
  cd extensions/linkedin-outreach-copilot
  npm install
  npm run build
  ```
  Load unpacked from `extensions/linkedin-outreach-copilot/dist`.

---

## 🛠️ Tools Directory

### 1. `tools/rea` ([morluto/rea](https://github.com/morluto/rea))
* Reverse engineering and architectural inspection framework for analyzing application behaviors, network flows, and API interactions.
* Use REA to inspect public API contracts, message serialization, and data flows of client extensions.
