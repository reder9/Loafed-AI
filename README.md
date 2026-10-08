# Loafed AI — The Official Cat Loaf Certification Bureau

An AI-powered cat loaf grading web application inspired by [loafed.app](https://loafed.app/).

Upload **1 to 3 pictures** (Front, Side, and Top/Bird's-Eye view) of your cat to receive a forensic evaluation of their **Loafed Score** (0–100), aerodynamic drag coefficient, bread classification, and feline posture critique.

Powered by **Google Gemini 3.8 Flash Vision** using structured output schemas.

---

## Technical Features

- **Multi-Angle Loaf Inspection (1 to 3 Photos)**:
  - **Front View**: Audits front paw concealment ("peet stealth"), chin tuck, and chest width.
  - **Side Profile**: Analyzes elbow fold, flank curvature, and tight tail wrapping.
  - **Top-Down (Bird's Eye)**: Evaluates dorsal boule symmetry, spine alignment, and zero limb flare.
  - **Multi-Angle Bonus**: Awards up to **+5 bonus points** when all 3 angles are provided.
- **Scientific 100-Point Scoring System**:
  - **Paw Tuck** (0–25 pts): 100% hidden paws vs chicken wings vs protruding oars.
  - **Tail Aerodynamics & Drag** (0–25 pts): Tail tucked under vs wrapped flush vs dragging.
  - **Flank Compression & Form** (0–25 pts): Tight rising dough silhouette.
  - **Crust & Bilateral Symmetry** (0–25 pts): Coat pattern to bread match (Brioche, Sourdough, Pumpernickel, Marble Rye, etc.).
- **Special Loaf Anomalies & Detection**:
  - **Loaf Boat Detection**: Flags if a cat has one paw sticking forward like an oar.
  - **Chicken Wing Flare**: Detects untucked protruding elbows.
  - **Face Loaf Recognition**: Identifies when a cat tucks its nose flat to the floor.
- **Modern User Experience**:
  - Precision editorial layout with warm neutral tones and Lucide vector iconography (zero emojis).
  - Modern non-blocking toast notifications for errors, capacity status, and clipboard actions (zero native alert popups).
  - Animated score dial and grade stamps (A+, B, etc.).
  - Drag and drop on every slot, plus global **Ctrl+V clipboard image paste**.
  - **1-Click "Buttercup" Preset**: Pre-loaded 3-angle master loaf demo to test immediately.
  - **Downloadable Loaf Certificate (PNG)**: Automatically generates a shareable inspection certificate with the cat's photo and score card.
  - **Copy Technical Summary**: Quick formatted text summary for Reddit, Discord, or documentation.
  - Synthesized web audio feedback (toggleable).

---

## Quick Start

### 1. Requirements
- Python 3.10+ (Python 3.11 / 3.12 recommended)
- A modern web browser

### 2. Run the App
Double-click `start.bat` on Windows, or run:

```bash
# If using the virtual environment:
.\.venv\Scripts\python.exe run.py

# Or standard python:
python run.py
```

The application will start immediately at:
**[http://localhost:8000](http://localhost:8000)**

### Logging and troubleshooting

The backend emits structured, correlation-friendly logs. Every request receives an `X-Request-ID`; successful requests are logged at `DEBUG`, client failures at `WARNING`, and server failures or unhandled exceptions at `ERROR` with a stack trace. Set `LOG_LEVEL=DEBUG` temporarily when investigating request flow or provider failover, then return it to `INFO` to avoid noisy production logs. Application code avoids intentionally logging credentials, passwords, raw tokens, email addresses, raw IP addresses, full Cognito event bodies, or complete image hashes. Third-party SDK exceptions and stack traces can still include provider response details, so review and redact retained production logs according to your incident and privacy procedures.

### Required security configuration

Set `SIGNATURE_SECRET` and `ADMIN_SECRET` to separate, randomly generated values of at least 32 characters in the local environment and the deployed backend. The app deliberately refuses to sign grade tokens or authorize admin removal if either required secret is missing or too short; it does not fall back to a public default or reuse the signing key. Generate each value independently (for example, with `python -c "import secrets; print(secrets.token_urlsafe(48))"`). Keep `TRUST_PROXY_HEADERS=false` unless the backend is reachable only through a trusted proxy that appends the actual client IP to `X-Forwarded-For`.

Server-funded Gemini grading requests use conditional DynamoDB counters shared across workers: an hourly per-network limit and a UTC-day global limit. Quota counters and one-year report-deduplication markers write an `expires_at` attribute; enable DynamoDB TTL on that attribute in the deployed table to clean up expired records. The public-report flow uses `TransactWriteItems` to atomically store one report per signed-in account (or anonymous network identifier) per entry and increment all leaderboard copies. The Lambda execution role therefore needs `dynamodb:TransactWriteItems` on the configured leaderboard table in addition to its existing read/write permissions. These application limits are abuse controls, not a substitute for Google Cloud billing budgets or provider-side quotas.

### Gemini API provider requirements

Loafed does not display an age gate or verify age. Its Terms state that Gemini-powered scoring is intended for adults 18 and older. Google's current Gemini API terms also prohibit API clients directed to or likely accessed by under-18s and describe API use as for professional or business purposes, not consumer use. Loafed is presented as a recreational consumer app, so confirm this use with Google or change providers before representing the integration as compliant. Google's data handling also differs between paid and unpaid services; a user-provided API key may have an unknown billing status. See the standalone [Terms of Service](static/terms.html), [Privacy Policy](static/privacy.html), and [Google's current API terms](https://ai.google.dev/gemini-api/terms).

---

## Gemini API Key Setup

1. Get a free API key from [Google AI Studio](https://aistudio.google.com/).
2. You can provide your key in **either** of two easy ways:
   - **In the Web App**: Click **"API Settings"** in the top navigation bar and paste your key. It is saved in your browser's local storage.
   - **In `.env` file**: Open `.env` and add:
     ```env
     GEMINI_API_KEY=your_gemini_api_key_here
     ```

> **Note on Demo Mode**: If you don't have an API key right away, you can click **"Load Buttercup Dataset"** to immediately test the application with a pre-analyzed 3-angle master loaf.

---

## The Cat Loaf Grading Scale

| Score | Grade | Honorary Title | Description |
|---|---|---|---|
| **95–100** | A+ | Grandmaster Artisan Loaf | Flawless 360 degree peet concealment, zero tail drag, pristine boule symmetry. |
| **85–94** | A | Golden Brioche Perfection | Minor tail tip accent or slight coat fold, but stellar form. |
| **70–84** | B | Soft Milk Bread | Solid loaf, minor peet peek or slight elbow flare. |
| **55–69** | C | The Loaf Boat (Oar Detected) | One paw sticking out forward like an oar; partial loaf. |
| **40–54** | D | Underproofed Doughball | Splayed elbows, tail sprawl, or loose kitten loaf. |
| **0–39** | F | Melting Croissant | Complete structural collapse; cat is liquid. |

---

## Project Structure

```
Loafed/
├── app.py              # FastAPI server & Gemini 3.8 Flash Vision integration
├── run.py              # Application launcher script
├── start.bat           # Windows 1-click batch launcher
├── amplify.yml         # AWS Amplify build configuration
├── requirements.txt    # Python dependencies (FastAPI, uvicorn, google-genai, mangum, pillow)
├── .env.example        # Environment variable template
├── .env                # Local environment config
└── static/
    ├── index.html      # Responsive web app UI (Tailwind CSS + Lucide Icons)
    ├── app.js          # Interactive controller, toast notification engine, certificate generator
    ├── style.css       # Custom styles, animations, and toast card transitions
    └── samples/        # Pre-packaged 3-angle sample cat photos (Buttercup)
```
