# CARMA — Digital Vehicle Identity & 3D Intelligence

CARMA is an automotive digital twin and vehicle intelligence platform that transforms fragmented paper invoices, service bills, and compliance certificates into an interactive, component-level 3D documented history. Instead of digging through glovebox folders or deciphering vague spreadsheets, vehicle owners and prospective buyers interact directly with the 3D car to inspect what was serviced, when, by whom, and at what cost.

Try CARMA

To test CARMA's document extraction workflow, use the sample PDFs provided in the "test pdfs" folder in this repository.

Open the live demo, complete vehicle onboarding, and select Add Service Record. Upload one of the sample invoices from "test pdfs". CARMA will use Gemini to extract the relevant information, which you can review before adding it to the vehicle's documented service history.

You can then select the relevant component on the 3D vehicle to view its history and supporting document.

For the complete workflow, refer to the demo video included in the repository.

---

1. Short Product Overview

CARMA bridges the physical vehicle and its maintenance paper trail. By linking every documented service record, replacement part, and statutory certificate directly to physical components on an interactive 3D model, CARMA reduces fragmented information and provides clarity across vehicle ownership and resale.

Every inspection begins with the car: clicking a tyre, headlight, tail lamp, steering column, or rear glass swings the camera into a focused inspection view, revealing the exact documented history, garage details, and invoice costs for that specific part.

---

2. The Problem

The Glovebox Paper Fog: Maintenance records are almost universally trapped in fading paper receipts, illegible garage invoices, or scattered PDF scans across email threads.

Disconnected Information: Even when invoices exist, there is no spatial connection between a bill and the actual tyre, light, glass, or body assembly that was worked on.

Unverifiable Resale Claims: Used car transactions frequently rely on ungrounded verbal claims (*"regularly serviced"*, *"recently replaced tyres"*). Buyers cannot easily verify what was actually documented versus what is merely claimed.

Compliance Blindspots: Statutory compliance documents (Motor Vehicle Insurance policies and PUC certificates) frequently lapse because policy numbers, issuers, and validity dates are buried in files rather than actively tracked.

---

3. The Solution

CARMA replaces scattered physical paper with an evidence-backed digital vehicle identity:

- 3D Spatial Navigation: The car itself is the navigation system. Select any visible component in 3D to immediately surface its documented maintenance timeline.
- AI-Powered Document Ingestion: Upload photos or PDF scans of garage invoices and compliance documents. Google Gemini extracts workshop details, dates, line-item costs, labor, and categorizes the work to the corresponding vehicle component.
- Grounded Vehicle Intelligence ("Ask CARMA"): A conversational assistant that answers ownership and maintenance queries strictly using verified records—reporting what is documented and avoiding assumptions about unrecorded events.
- Comprehensive Compliance Cockpit: Real-time tracking of statutory documents (Insurance and PUC) with issuer details, certificate numbers, validity windows, and expiry indicators.

---

4. Key Features

🚗 Interactive 3D Digital Twin
- High-fidelity 3D model (Hyundai Eon with 111 Object3D nodes) featuring interactive 360° Orbit, Pan, and Zoom controls.
- Runtime logical mesh splitting: Merged front wheels are automatically partitioned into independent left and right assemblies (`tyre-front-left`, `tyre-front-right`, `rim-front-left`, `rim-front-right`) for individual component inspection.
- Real-time hover tooltips and dynamic emissive highlighting reflecting the active theme.

🔍 Component Inspection Mode
- Cinematic camera transitions powered by GSAP that calculate component bounding boxes and smoothly frame the selected part (tyres, wheels, headlights, taillights, rear glass, steering, seats, body panels).
- Dedicated Inspection Panel displaying documented maintenance records, total component expenditure, and last-serviced dates.
- One-click navigation back to full vehicle view.

📄 AI Document Ingestion (Google Gemini)
- Unified ingestion for **Service Invoices & Job Cards** and **Statutory Compliance Documents (Insurance / PUC)**.
- Powered by `gemini-2.5-flash` via serverless API endpoints to extract:
  - Workshop / Service Centre name and location
  - Invoice date and vehicle odometer reading
  - Itemized costs (parts, labor, taxes, total amount)
  - Work performed and recommended future work
  - Auto-mapped target vehicle component
- Intelligent regex and heuristic fallback parser for reliable offline operation.

🛡️ Statutory Compliance Management (Insurance & PUC)
- Dedicated tracking for **Motor Vehicle Insurance** policies and **Pollution Under Control (PUC)** certificates.
- Automatically extracts and displays:
  - Policy / Certificate Number
  - Issuing Provider / Authorized Testing Centre
  - Validity start and expiry dates with days-remaining status.

💬 "Ask CARMA" Vehicle Intelligence
- Conversational natural language interface grounded directly in the vehicle's documented history.
- Answers ownership queries such as:
  - *"When was the front right tyre last replaced and where?"*
  - *"How much have I spent on tyre and wheel maintenance in total?"*
  - *"Is my PUC certificate still valid?"*
- **Strict Grounding Boundary**: Transparently reports what is documented and does not infer that an undocumented event never happened (*"CARMA does not have a documented record for..."*).
- **Jump-to-Component Chips**: Direct links in AI answers that automatically focus the 3D camera on the relevant component.

🎨 Distinctive Two-Mode Brand Identity
- **Light Mode**: Warm Cream / Ivory (`#f7f3ec`) + Deep Maroon (`#6b1f2a`) + Dark Charcoal (`#1c1c1e`).
- **Dark Mode**: Graphite / Near-Black (`#111113`) + Restrained Burgundy (`#a33b4a`) + Silver Off-White (`#ededed`).
- Built with strict WCAG AAA contrast compliance across all surfaces, typography, and 3D highlights.

⚡ Resilient WebGL Context Lifecycle
- Explicit WebGL2 context configuration (`powerPreference: 'default'`, `failIfMajorPerformanceCaveat: false`) ensuring compatibility across mobile, integrated, and discrete GPUs.
- Graceful 3-state loading system (`Loading` with asset download notice, `Loaded` interactive viewport, and `Failed` fallback card with 1-click retry).
- Immediate synchronous WebGL context release on login transition (`forceContextLoss()`), preventing context leaks and GPU exhaustion.

---

## 5. How CARMA Works

```
  [ Paper Invoice / PUC / Insurance ]
                  │
                  ▼
      [ Document Ingestion Modal ]
                  │
                  ▼  (Multipart upload / Base64)
      [ /api/extract-document ]
                  │
                  ▼  (Google Gemini 2.5 Flash)
    ┌─────────────────────────────────────────┐
    │  • Workshop: Express Auto Care          │
    │  • Cost: ₹4,200                         │
    │  • Work: Front right tyre replacement   │
    │  • Target: Front Right Tyre             │
    └─────────────────────────────────────────┘
                  │
                  ▼  (User Review & Confirm)
        [ Vehicle Workspace ] ◄────────────────────────┐
                  │                                    │
                  ▼                                    │
        [ Interactive 3D Model ]                       │
        • Click Front Right Tyre                       │
        • Camera zooms to wheel assembly               │
        • Emissive highlight illuminates part          │
        • Inspection Panel reveals invoice & timeline  │
                  ▲                                    │
                  │ (Clickable component link)         │
                  └────── [ "Ask CARMA" Intelligence ] ┘
```

1. Explore the Car: Rotate, pan, and zoom around the vehicle. Click any component to inspect its maintenance records.
2. Ingest a Document: Upload a service invoice or PUC certificate. Gemini extracts all fields in seconds.
3. Verify & Save: Review the extracted workshop, cost, date, and assigned component, then confirm into the vehicle's permanent timeline.
4. Query Your Records: Ask natural language questions in "Ask CARMA" and click referenced component chips to jump directly to that part in 3D.

---

6. AI Capabilities

Document Extraction
Uses Google Gemini gemini-2.5-flash to extract structured information such as dates, costs, service details, parts, and other relevant fields from uploaded service documents, Insurance policies, and PUC certificates.

Service Record Mapping
Maps extracted service information to the relevant vehicle component, allowing the information to appear directly within that component's history.

Vehicle Q&A
Ask CARMA uses Gemini with the vehicle's documented records and context to answer questions about service history, components, spending, and vehicle documents. It distinguishes between information that is documented and information that is simply not present in the available records.

Local Fallback Extraction
A custom regex and pattern-matching layer provides basic extraction of recognizable fields such as dates and amounts when AI extraction is unavailable.

---

7. Technology Stack

- Frontend Framework: React 18 (`react`, `react-dom`)
- Build Tool & Bundler: Vite 6 (`vite`, `@vitejs/plugin-react`)
- 3D Graphics & WebGL: Three.js (`three` r170), React Three Fiber (`@react-three/fiber`), Drei (`@react-three/drei`)
- Camera Animation: GSAP (`gsap`)
- AI & Multimodal SDK: Google GenAI SDK (`@google/genai`)
- Serverless & API Layer: Vercel Serverless Functions (`api/extract-document.js`, `api/vehicle-intelligence.js`) + Vite Server Middleware
- Icons: Lucide React (`lucide-react`)
- Design System: Custom CSS Variable tokens with responsive CSS Grid & Flexbox (zero heavy UI framework overhead)
- State & Storage: React Hooks (`useState`, `useCallback`, `useMemo`, `useRef`) with persistent `localStorage` cache

---

8. Architecture Overview

```
CARMA/
├── api/                                # Production Vercel Serverless Functions
│   ├── extract-document.js             # Document extraction endpoint (Gemini)
│   └── vehicle-intelligence.js         # Ask CARMA conversational endpoint
├── public/
│   └── models/
│       └── eon.glb                     # 24.4 MB Hyundai Eon 3D asset (111 nodes)
├── src/
│   ├── components/                     # React UI & 3D Components
│   │   ├── CarViewer.jsx               # R3F Canvas, lighting, WebGL context boundary
│   │   ├── CarModel.jsx                # 3D GLTF loader, mesh splitting, interaction
│   │   ├── InspectionPanel.jsx         # Focused component maintenance timeline
│   │   ├── AskCarma.jsx                # Grounded conversational AI drawer
│   │   ├── DocumentImportModal.jsx     # Document upload & Gemini extraction review
│   │   ├── VehicleWorkspace.jsx        # Component cards, document compliance, records
│   │   ├── VehicleOverview.jsx         # Mileage, expenditure summary, quick stats
│   │   ├── Onboarding.jsx              # Welcome flow, login, vehicle profile setup
│   │   └── LoginCarHero.jsx            # Studio lighting 3D stage for login
│   ├── server/                         # Shared extraction & intelligence logic
│   │   ├── documentExtraction.js       # Core Gemini prompt & regex extraction engine
│   │   └── vehicleIntelligence.js      # Grounded Q&A prompt & context assembly
│   ├── services/                       # Client-side service bridges
│   │   ├── aiExtractionService.js      # API dispatcher with local fallback
│   │   └── vehicleIntelligenceService.js# Intelligence dispatcher with local fallback
│   ├── data/
│   │   ├── serviceHistoryData.js       # Component definitions & maintenance records
│   │   └── vehicleData.js              # Vehicle profiles & compliance documents
│   ├── utils/
│   │   └── geometrySplitter.js         # Runtime logical mesh splitting utility
│   ├── App.jsx                         # Main layout, 3-state 3D loader, state orchestration
│   ├── index.css                       # Complete two-mode design system
│   └── main.jsx                        # React root entry point with crash boundary
├── vite.config.js                      # Vite config with development API middleware
└── package.json
```

---

9. Future Scope

1. Live OBD-II Telemetry: Potential integration with real-time Bluetooth/Wi-Fi OBD-II dongles to project active Diagnostic Trouble Codes (DTCs) directly onto affected 3D components in real-time.
2. Cryptographic / Blockchain Service Passports: Future potential for tamper-evident digital service passports where authorized workshops digitally sign maintenance records, helping protect against odometer rollback and unrecorded service discrepancies.
3. Multi-Vehicle Garage Support: Expanding beyond single-vehicle profiles to manage multi-car family or fleet garages with model-specific 3D assets.
4. Predictive Maintenance Forecasting: Machine learning models predicting component wear and estimated remaining lifespan based on driving conditions, odometer progression, and OEM service intervals.

---
10. Demo & Live Application

- Live Application: https://carma-bay.vercel.app/
- Demo Video: In the file
- GitHub Repository: [https://github.com/vashisthhh/Carma](https://github.com/vashisthhh/Carma)

---

11. Running Locally

Prerequisites
- Node.js: v18.0 or higher (v20+ recommended)
- npm: v9.0 or higher
- Gemini API Key: (Optional for local testing; deterministic regex fallbacks are built in)

### Step 1: Clone the Repository
```bash
git clone https://github.com/vashisthhh/Carma.git
cd Carma
```

### Step 2: Install Dependencies
```bash
npm install
```

### Step 3: Configure Environment Variables (Optional)
Create a `.env` file in the project root:
```env
GEMINI_API_KEY=your_google_gemini_api_key_here
```
*(If omitted, CARMA automatically uses its built-in heuristic and regex extraction engine.)*

### Step 4: Start the Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

### Step 5: Test the Production Build Locally
```bash
npm run build
npm run preview
```
Open [http://localhost:4173](http://localhost:4173) to verify the production bundle.
