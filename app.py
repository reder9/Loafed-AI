import os
import json
import logging
from typing import Optional, List, Dict, Any
from pathlib import Path

from fastapi import FastAPI, UploadFile, File, Form, Header, HTTPException, Request
from fastapi.responses import JSONResponse, FileResponse, PlainTextResponse, Response
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from dotenv import load_dotenv

# Load .env file
load_dotenv()

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("loafed")

# Try to import google-genai
try:
    from google import genai
    from google.genai import types
    GENAI_AVAILABLE = True
except ImportError:
    GENAI_AVAILABLE = False
    logger.warning("google-genai is not installed. AI features will run in demo/mock mode.")

app = FastAPI(title="Loafed AI", description="AI Cat Loaf Grading System")

# Enable CORS for local development
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

BASE_DIR = Path(__file__).resolve().parent
STATIC_DIR = BASE_DIR / "static"
SAMPLES_DIR = STATIC_DIR / "samples"

# Safety & Free-Tier Guardrails
import time
from datetime import datetime, timezone
from collections import defaultdict

DAILY_MAX_LOAVES = int(os.getenv("DAILY_MAX_LOAVES", 1400)) # Safe buffer below Google's 1,500 daily free limit
IP_HOURLY_LIMIT = int(os.getenv("IP_HOURLY_LIMIT", 10))     # Max 10 loaves per IP per hour to prevent spam

daily_counter = {
    "date": datetime.now(timezone.utc).strftime("%Y-%m-%d"),
    "count": 0
}
ip_history = defaultdict(list)

def get_client_ip(request: Request) -> str:
    forwarded = request.headers.get("x-forwarded-for")
    if forwarded:
        return forwarded.split(",")[0].strip()
    return request.client.host if request.client else "unknown"

def check_free_tier_limits(client_ip: str, is_server_key: bool):
    """Guarantees the server stays 100% within free limits without surprise costs."""
    if not is_server_key:
        return True, "" # Personal client keys bypass server shared quota

    now = time.time()
    today_str = datetime.now(timezone.utc).strftime("%Y-%m-%d")

    # Reset counter if a new UTC day has started
    if daily_counter["date"] != today_str:
        daily_counter["date"] = today_str
        daily_counter["count"] = 0
        ip_history.clear()

    # Prune timestamps older than 1 hour (3600 seconds)
    ip_history[client_ip] = [t for t in ip_history[client_ip] if now - t < 3600]

    # Check per-IP spam limit
    if len(ip_history[client_ip]) >= IP_HOURLY_LIMIT:
        return False, "Rate limit reached: You have inspected 10 loaves this hour. Please wait a few minutes before submitting another evaluation."

    # Check global daily free-tier cap
    if daily_counter["count"] >= DAILY_MAX_LOAVES:
        return False, "The evaluation service is currently at capacity. Today's public quota has been reached. Please check back later, or configure your personal API key in Settings."

    # Record loaf inspection
    daily_counter["count"] += 1
    ip_history[client_ip].append(now)
    return True, ""


# Pydantic Schemas for AI Structured Output
class AngleNotes(BaseModel):
    front: Optional[str] = Field(default=None, description="Observation on front view")
    side: Optional[str] = Field(default=None, description="Observation on side view")
    top: Optional[str] = Field(default=None, description="Observation on top view")

class LoafSubScore(BaseModel):
    score: int = Field(description="Score between 0 and 25")
    status: str = Field(description="Short concise status label without emojis (e.g., '100% Concealed Peet', 'Slight Flank Swish', 'Tight Dough Fold')")
    critique: str = Field(description="Detailed critique describing what is visible or hidden")
    observations: List[str] = Field(description="2-3 specific visual observations from the images")

class LoafAnalysisResult(BaseModel):
    cat_name: str = Field(description="Name of the cat or bread designation if unspecified")
    overall_score: int = Field(description="Final composite loaf score from 0 to 100")
    grade_letter: str = Field(description="Letter grade: A+, A, B, C, D, or F")
    loaf_rank: str = Field(description="Honorary title without emojis (e.g. 'Grandmaster Artisan Loaf', 'Golden Brioche Perfection', 'Loaf Boat - Oar Detected', 'Underproofed Doughball')")
    bread_classification: str = Field(description="Bread type match without emojis (e.g., 'Toasted Golden Brioche', 'Rustic Sourdough Boule', 'Dark Pumpernickel Loaf', 'Cinnamon Marble Rye')")
    summary_critique: str = Field(description="Culinary and aerodynamic cat loaf critique without emojis (2-3 sentences)")
    
    paw_tuck: LoafSubScore = Field(description="Front and rear paw concealment evaluation (0-25)")
    tail_tuck: LoafSubScore = Field(description="Tail wrapping, concealment, and drag analysis (0-25)")
    elbow_compactness: LoafSubScore = Field(description="Elbow fold, compactness, and rising dough curvature (0-25)")
    crust_symmetry: LoafSubScore = Field(description="Dorsal symmetry, toast level, coat coloring, and uniformity (0-25)")
    
    drag_coefficient: float = Field(description="Aerodynamic drag coefficient (0.01 to 0.99, lower is tighter)")
    oar_detected: bool = Field(description="True if one paw sticks out forward like an oar (Loaf Boat)")
    face_loaf: bool = Field(description="True if head/nose is tucked low or flat into the chest")
    multi_angle_bonus: int = Field(description="Bonus points awarded for submitting multiple angles (0 to 5)")
    badges: List[str] = Field(description="3-5 honor badges or demerits awarded to this cat. Never include emojis.")
    fun_tips_for_cat: List[str] = Field(description="2-3 tips for the cat to improve its loaf next time. Never include emojis.")
    angle_notes: AngleNotes = Field(description="Quick notes per submitted angle (front, side, top)")

# Pre-baked analysis for sample preset cats
PRESET_BUTTERCUP = {
    "cat_name": "Buttercup",
    "overall_score": 98,
    "grade_letter": "A+",
    "loaf_rank": "Grandmaster Artisan Loaf",
    "bread_classification": "Double-Toasted Golden Brioche",
    "summary_critique": "A masterclass in feline bakery arts. Buttercup demonstrates peerless geometry with zero paw visibility across all three inspected planes. The tail tuck is flush, virtually eliminating aerodynamic drag.",
    "paw_tuck": {
        "score": 25,
        "status": "100% Peet Stealth Concealment",
        "critique": "Front and rear peet are completely tucked beneath the chest. Not a single toe bean, claw, or wrist joint breaches the loaf perimeter from any angle.",
        "observations": [
            "Front view reveals total paw withdrawal into undercarriage",
            "Side view confirms rear haunches are flush to floor",
            "Zero paw flaring visible from overhead inspection"
        ]
    },
    "tail_tuck": {
        "score": 24,
        "status": "Zero Drag Flank Wrap",
        "critique": "Tail is seamlessly curled flush along the starboard flank, hugging the body curve like an artisanal baguette score line.",
        "observations": [
            "Tail tip rests tightly against flank with no swishing",
            "Calculated aerodynamic drag coefficient: 0.03",
            "Minor 1-point deduction because tail tip has high-contrast white ring accentuating outline"
        ]
    },
    "elbow_compactness": {
        "score": 24,
        "status": "Artisanal Dough Fold",
        "critique": "Elbows are neatly pulled inwards against the ribcage. The rising dough curvature creates a smooth, unbroken parabolic contour with no chicken-wing flare.",
        "observations": [
            "Flanks are tightly drawn with zero wing flare",
            "Chest curve is smooth and rectangular",
            "Posture displays maximum relaxation and security"
        ]
    },
    "crust_symmetry": {
        "score": 25,
        "status": "Top-Tier Dorsal Boule Symmetry",
        "critique": "Overhead inspection reveals a textbook oval boule with golden tiger-stripe crusting, baked to an even, honey-golden hue with optimal butterfat gloss.",
        "observations": [
            "Top-down view shows pristine 50/50 bilateral symmetry",
            "Coat toastiness is uniform with warm marmalade highlights",
            "Bread rise is even with no dough slumping"
        ]
    },
    "drag_coefficient": 0.03,
    "oar_detected": False,
    "face_loaf": False,
    "multi_angle_bonus": 5,
    "badges": [
        "Certified 360-Degree Artisan Loaf",
        "Zero Paw Visibility",
        "Golden Brioche Classification",
        "Sub-0.05 Drag Coefficient",
        "Bilateral Boule Symmetry"
    ],
    "fun_tips_for_cat": [
        "Buttercup could attempt a full 'Face Loaf' to reach the legendary 100/100 threshold.",
        "Maintain current hydration levels for optimal crust sheen.",
        "Continue maintaining optimal bilateral flank compression."
    ],
    "angle_notes": {
        "front": "Pristine chest tuck; calm, unbothered facial expression.",
        "side": "Sleek aerodynamic silhouette; tail tightly wrapped along flank.",
        "top": "Near-perfect oval boule; impeccable bilateral spinal symmetry."
    }
}

PRESET_CHONKS = {
    "cat_name": "Chonks",
    "overall_score": 89,
    "grade_letter": "A",
    "loaf_rank": "Master Artisan Loaf",
    "bread_classification": "Dark Rye Pumpernickel Boule",
    "summary_critique": "Chonks demonstrates textbook high-elevation loaf technique. Perched atop the lookout tree, this dark rye pumpernickel boule displays exceptional undercarriage discipline with zero toe bean breaches and sleek, low-drag flank compression. A distinguished feline baker of the highest order.",
    "paw_tuck": {
        "score": 23,
        "status": "95% Concealment (Sub-Perch Tuck)",
        "critique": "Front and rear limbs are securely tucked into the plush undercarriage. While the cat tree rim assists in masking the lower extremities, zero illicit toe beans or claws are visibly breaching the perimeter.",
        "observations": [
            "Undercarriage limbs fully withdrawn into dark charcoal fur perimeter",
            "No forward wrist extension detected from front-quarter view",
            "Slight edge elevation supported by cat perch bolster"
        ]
    },
    "tail_tuck": {
        "score": 23,
        "status": "Starboard Flank Curvature",
        "critique": "Tail is smoothly curled along the lateral flank, providing unbroken curvature with negligible aerodynamic turbulence.",
        "observations": [
            "Tail tip resting flush against starboard haunch",
            "Aerodynamic drag coefficient measured at 0.04",
            "Uniform dark coat renders tail outline nearly imperceptible"
        ]
    },
    "elbow_compactness": {
        "score": 22,
        "status": "Compact Dough Rise",
        "critique": "Excellent lateral dough compression. Elbows pulled tightly against ribcage with zero chicken-wing flare, forming an imposing rectangular bread profile.",
        "observations": [
            "Zero lateral limb flare or oar protrusions",
            "Solid muscular rise with uniform breadth",
            "Slight upward gaze introduces minor cranial yaw"
        ]
    },
    "crust_symmetry": {
        "score": 21,
        "status": "Dark Rye Boule Symmetry",
        "critique": "Dense, beautifully baked charcoal-slate coat resembling a rustic pumpernickel boule. Topline curvature is even with a smooth spinal arch.",
        "observations": [
            "Uniform dark coat toastiness with velvety matte finish",
            "Bilateral contour balanced across medial axis",
            "Slight cranial turn toward starboard window"
        ]
    },
    "drag_coefficient": 0.04,
    "oar_detected": False,
    "face_loaf": False,
    "multi_angle_bonus": 4,
    "badges": [
        "Certified Dark Rye Pumpernickel",
        "High-Perch Boule Formation",
        "Stealth Peet Concealment",
        "Sub-0.05 Aerodynamic Drag",
        "Solid Slate Symmetry"
    ],
    "fun_tips_for_cat": [
        "Align cranial axis directly forward for 100% bilateral boule symmetry.",
        "Try the floor-level test to verify paw concealment without perch rim support.",
        "A sub-perch ear tuck would push Chonks toward Grandmaster status."
    ],
    "angle_notes": {
        "front": "Alert, observant gaze; chest squarely aligned over perch bolster.",
        "side": "Continuous slate-grey parabolic topline with tight starboard tail tuck."
    }
}

PRESET_FLASH = {
    "cat_name": "Flash",
    "overall_score": 83,
    "grade_letter": "B+",
    "loaf_rank": "Senior Artisan Loaf",
    "bread_classification": "Marbled Sourdough Baton",
    "summary_critique": "Flash presents an exquisite marbled sourdough baton resting atop prime cushion real estate. While full aerodynamic marks are awarded for the remarkable horizontal airplane ears, a minor wrist protrusion on the starboard side prevents an A+ rating. Nonetheless, an outstanding exhibition of feline baking discipline.",
    "paw_tuck": {
        "score": 20,
        "status": "Minor Wrist Protrusion (Cushion Sink)",
        "critique": "Right front wrist displays slight forward protrusion onto the cushion surface, breaching pure concealment by approximately 1.5 cm. Rear peet remain fully tucked.",
        "observations": [
            "Starboard front wrist joint visible resting on cushion piping",
            "Rear peet and hocks firmly retracted beneath flank",
            "Cushion softness causes slight dough sinking along lower seam"
        ]
    },
    "tail_tuck": {
        "score": 21,
        "status": "Portside Flank Wrap",
        "critique": "Tail is tucked along the portside flank, creating a tight sweep though slightly flattened by the cushion seam.",
        "observations": [
            "Calculated aerodynamic drag coefficient: 0.06",
            "Tail tip resting flush against left rear haunch",
            "Minimal swish turbulence detected"
        ]
    },
    "elbow_compactness": {
        "score": 21,
        "status": "Marbled Dough Fold",
        "critique": "Elbows pulled inwards with good bilateral compression. Distinctive 'airplane ears' deployed horizontally, creating an aerodynamically intriguing cranial profile.",
        "observations": [
            "Lateral airplane ear configuration detected (aerodynamic stabilizer mode)",
            "Subtle leftward lean due to pillow contour",
            "Suspicious facial expression indicates hyper-vigilant loaf state"
        ]
    },
    "crust_symmetry": {
        "score": 21,
        "status": "Tiger-Stripe Sourdough Swirl",
        "critique": "Gorgeous marbled silver-grey tiger stripes with distinct dorsal scoring. Bilateral symmetry is solid despite slight pillow elevation gradient.",
        "observations": [
            "Even tiger-stripe crust score markings across back",
            "Bilateral symmetry graded at 84% due to cushion tilt",
            "Coat luster exhibits pristine sourdough crust shine"
        ]
    },
    "drag_coefficient": 0.06,
    "oar_detected": False,
    "face_loaf": False,
    "multi_angle_bonus": 4,
    "badges": [
        "Aerodynamic Airplane Ears",
        "Marbled Sourdough Certification",
        "Cushion Loaf Specialist",
        "Vigilant Baker Stance",
        "Tiger-Stripe Crust Finish"
    ],
    "fun_tips_for_cat": [
        "Retract the right front wrist 1.5 cm deeper into the chest fold to eliminate peet deductions.",
        "Test on a firm, flat surface to prevent cushion-induced dough slumping.",
        "Fold ears forward during inspection to reduce lateral cranial drag."
    ],
    "angle_notes": {
        "front": "Signature horizontal airplane ears deployed; minor right wrist breach.",
        "side": "Classic sourdough baton contour along cushion diagonal; tail tucked flush."
    }
}

@app.get("/health")
@app.get("/api/health")
async def health_check():
    """Lightweight health check for monitoring and routing."""
    return {"status": "ok"}

@app.get("/api/status")
async def get_status():
    """Returns server and API key status."""
    env_key = os.getenv("GEMINI_API_KEY", "").strip()
    return {
        "has_server_api_key": bool(env_key),
        "genai_sdk_available": GENAI_AVAILABLE,
        "default_model": os.getenv("DEFAULT_MODEL", "gemini-3.8-flash")
    }

@app.get("/robots.txt", response_class=PlainTextResponse)
async def get_robots():
    """Serves robots.txt crawler directives."""
    return "User-agent: *\nAllow: /\nDisallow: /api/\n\nSitemap: https://loafed.redersoft.com/sitemap.xml\n"

@app.get("/sitemap.xml", response_class=Response)
async def get_sitemap():
    """Serves sitemap.xml for search engines."""
    content = """<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>https://loafed.redersoft.com/</loc>
    <lastmod>2026-10-04</lastmod>
    <changefreq>weekly</changefreq>
    <priority>1.0</priority>
  </url>
</urlset>"""
    return Response(content=content, media_type="application/xml")

@app.get("/api/samples")
async def get_samples():
    """Returns available sample presets."""
    return {
        "buttercup": {
            "name": "Buttercup",
            "description": "Flawless Orange Tabby (All 3 Angles: Front, Side, Top)",
            "images": {
                "front": "/static/samples/buttercup_front.jpg",
                "side": "/static/samples/buttercup_side.jpg",
                "top": "/static/samples/buttercup_top.jpg"
            },
            "cached_analysis": PRESET_BUTTERCUP
        },
        "chonks": {
            "name": "Chonks",
            "description": "Dark Grey Domestic Shorthair (Clean Perch High-Elevation Loaf)",
            "images": {
                "front": "/static/samples/chonks_front.jpg",
                "side": "/static/samples/chonks_side.jpg"
            },
            "cached_analysis": PRESET_CHONKS
        },
        "flash": {
            "name": "Flash",
            "description": "Light Grey Tabby (Airplane Ears Cushion Loaf)",
            "images": {
                "front": "/static/samples/flash_front.jpg",
                "side": "/static/samples/flash_side.jpg"
            },
            "cached_analysis": PRESET_FLASH
        }
    }

def get_gemini_client(client_key: Optional[str] = None):
    """Instantiate Gemini client using client provided key or environment variable."""
    api_key = client_key or os.getenv("GEMINI_API_KEY", "").strip()
    if not api_key:
        return None
    return genai.Client(api_key=api_key)

SYSTEM_PROMPT = """You are the Senior Inspector and Chief Technical Director of the Official Cat Loaf Certification Bureau (inspired by loafed.app, Michelin-starred bakery standards, and feline aerodynamic engineering).
Your mission is to evaluate uploaded cat photos as a STRICT, DISCERNING, HIGHLY CRITICAL, YET HILARIOUSLY WITTY JUDGE.

CRITICAL DIRECTIVE ON GRADING STRICTNESS & CURVE:
In past inspections you were far too generous. Real feline loafing is an exacting, competitive discipline! Most household cats DO NOT achieve an A or scores in the 90s.
You must grade on a demanding, realistic curve:
- 90 to 100 (A to A+): THE SACRED CRUST. Masterclass artisan perfection (top 2% of all feline loaves). Reserved ONLY for near-flawless loaves: ALL FOUR paws 100% invisible beneath the chest from all visible angles, tail completely tucked or wrapped flush against the flank, zero chicken-wing flare, and immaculate dorsal symmetry. (Do NOT give 90+ unless the cat truly earns it!)
- 80 to 89 (B to B+): Solid artisan loaf. Minor micro-imperfections (e.g., 2mm toe peek or slightly relaxed tail tip).
- 65 to 79 (C to C+): Average, mediocre household loaf. Noticeable flaws: visible front paw pads, loose elbows, lopsided posture, or casually wandering tail. (This is where most typical household cats should land!)
- 45 to 64 (D to D+): Poor, sloppy, or heavily compromised loaf. Major infractions: one or both legs sticking out (Loaf Boat / Oar), sprawling tail, heavy chicken-winging, or melting off furniture like liquid dough.
- 0 to 44 (F): Failed loaf / Audit Disqualification. The cat is standing, sitting upright on paws (Sphinx Imposter), laying on its side, splooting, or refusing to fold limbs.

RIGID DEDUCTION PENALTIES (Apply these strictly):
1. PAW TUCK (0-25 Points):
   - 24-25: 100% stealth peet concealment. Absolute zero paw, toe bean, or wrist visibility from any angle.
   - 16-20: Minor toe peek (tip of 1 paw or toe beans slightly peeking out).
   - 10-15: Whole paw or wrist clearly visible outside the body perimeter. Deduct at least 10 points!
   - 5-9: "Loaf Boat" / Deployed Oar (one front leg extended forward while resting). Set oar_detected = True!
   - 0-4: Cat is standing or sitting upright like an Egyptian Sphinx statue.

2. TAIL TUCK (0-25 Points):
   - 24-25: Tail curled tight and flush against flank or coiled underneath like a cinnamon roll.
   - 18-22: Tail wrapped but tip sticks out or curls awkwardly.
   - 11-17: Tail trailing behind body, draping over furniture edge, or actively swishing.
   - 0-10: Sprawled tail with massive aerodynamic drag (drag_coefficient > 0.60).

3. LOAF FORM & COMPACTNESS (0-25 Points):
   - 24-25: Tight, compact boule. Elbows tucked deep against ribcage, tight dough boundary.
   - 17-21: Decent fold, but elbows slightly relaxed or slight chicken-wing bulge.
   - 10-16: Loose, melting dough. Body sagging laterally, chicken-wings flared outward.
   - Note: If the cat's nose or face is rested completely flat into the carpet or chest, set face_loaf = True (Face Loaf recognition!).

4. CRUST SYMMETRY & TOASTINESS (0-25 Points):
   - 24-25: Perfect bilateral dorsal symmetry, balanced dough rise, evenly baked coat.
   - 16-21: Slight tilt to one side, uneven spine curve, or lopsided bread rise.
   - 8-15: Heavily asymmetrical resting posture or chaotic dough lump.
   - Bread classification: Assign an accurate, funny artisanal bread type (e.g. 'Underproofed Sourdough', 'Over-Risen Brioche', 'Rustic Baguette', 'Golden Cinnamon Swirl', 'Dark Rye Boule').

SCORE ARITHMETIC & MULTI-IMAGE CALIBRATION:
- overall_score MUST be the true sum: paw_tuck.score + tail_tuck.score + elbow_compactness.score + crust_symmetry.score + multi_angle_bonus (capped at 100).
- STRICT SINGLE-PHOTO PENALTY:
  When only 1 photo is submitted, you ONLY have visual evidence for a single 2D perspective. You CANNOT verify if paws or claws are peeking out on the unseen side, whether the tail is trailing awkwardly behind the body, or if rear haunches are splayed.
  Therefore, IT IS VERY HARD TO GIVE A HIGH SCORE (80+) WITH JUST ONE PICTURE!
  Unless that single picture is an extraordinary, unobstructed angle that definitively proves 100% paw concealment, tight tail tuck, and symmetry all at once, a 1-photo loaf score MUST be heavily conservative (typically capped in the 65 to 78 range, C to C+).
  Set multi_angle_bonus = 0.
  Explicitly state in the critique or tips: 'Single-photo inspection limitation applied: Without side or overhead telemetry, hidden peet infractions on unobserved flanks cannot be definitively ruled out.'
- MULTI-IMAGE BONUS (The more photos, the better the telemetry!):
  * 1 photo: 0 bonus points. Conservative single-plane grading.
  * 2 photos: +2 bonus points. Dual-plane telemetry.
  * 3 photos (ideally covering front, side, and top): +3 to +4 bonus points. High confidence 360-degree verification.
  * 4 to 5 photos: +5 bonus points (maximum multi-angle telemetry bonus unlocked).
- Align grade_letter strictly with overall_score:
  * 95-100: A+
  * 90-94: A
  * 85-89: B+
  * 80-84: B
  * 75-79: C+
  * 65-74: C
  * 55-64: D+
  * 45-54: D
  * 0-44: F

CAT NAME HANDLING:
- If a Cat Name is provided, use that exact name in cat_name.
- If the Cat Name is empty, unmentioned, or 'Anonymous Baker', generate a charming, humorous honorary bakery name for this subject (e.g. 'The Mysterious Loaf', 'Sir Doughington', 'Lady Brioche', 'Professor Crumb').

CRITICAL FORMATTING & TONE:
- STRICT ZERO-EMOJI RULE: Never use emojis anywhere in your response. No emojis in titles, status text, critiques, observations, bread classifications, badges, or tips. Keep styling clean, dignified, witty, and editorial.
- Tone: Michelin pastry inspector meets aerodynamic engineer. Be sharp, hilarious, discerning, and weave in clever cat puns and bakery references naturally ('baking right meow', 'purr-fection', 'cat-astrophic drag', 'knead for improvement', 'paws-itively suspicious fold'). Celebrate what makes the cat charming while staying true to official loaf certification standards!
"""

@app.post("/api/grade")
async def grade_loaf(
    request: Request,
    cat_name: Optional[str] = Form(None),
    model: Optional[str] = Form("gemini-3.8-flash"),
    front: Optional[UploadFile] = File(None),
    side: Optional[UploadFile] = File(None),
    top: Optional[UploadFile] = File(None),
    images: Optional[List[UploadFile]] = File(None),
    api_key: Optional[str] = Form(None),
    x_gemini_api_key: Optional[str] = Header(None),
    website_url_check: Optional[str] = Form(None)
):
    """Grades uploaded cat photos using Gemini 3.8 Flash Vision."""
    if website_url_check:
        logger.warning("Automated bot submission dropped via honeypot.")
        raise HTTPException(status_code=400, detail="Automated submission blocked.")

    effective_api_key = api_key or x_gemini_api_key or os.getenv("GEMINI_API_KEY", "").strip()
    
    # Collect all uploaded files (1 to 5 images)
    submitted_images = [] # list of (label, bytes, mime_type)
    
    if images:
        for idx, img in enumerate(images):
            if img and img.filename and len(submitted_images) < 5:
                content = await img.read()
                if len(content) > 0:
                    label = f"Inspection Photo {len(submitted_images) + 1}"
                    submitted_images.append((label, content, img.content_type or "image/jpeg"))

    # Also check individual named slots if images list was empty or has room (e.g. presets)
    if len(submitted_images) < 5:
        if front and front.filename and not any(l == "Front View" for l, _, _ in submitted_images):
            content = await front.read()
            if len(content) > 0 and len(submitted_images) < 5:
                submitted_images.append(("Front View", content, front.content_type or "image/jpeg"))
                
        if side and side.filename and not any(l == "Side View" for l, _, _ in submitted_images):
            content = await side.read()
            if len(content) > 0 and len(submitted_images) < 5:
                submitted_images.append(("Side View", content, side.content_type or "image/jpeg"))
                
        if top and top.filename and not any(l == "Top (Bird's Eye) View" for l, _, _ in submitted_images):
            content = await top.read()
            if len(content) > 0 and len(submitted_images) < 5:
                submitted_images.append(("Top (Bird's Eye) View", content, top.content_type or "image/jpeg"))

    if not submitted_images:
        raise HTTPException(status_code=400, detail="Please upload between 1 and 5 cat photos.")

    # If no API key is provided, check if this matches our sample preset or provide demo analysis
    if not effective_api_key:
        logger.info("No Gemini API key supplied. Checking for demo fallback.")
        # If user tested Buttercup sample, return cached analysis with their cat name if provided
        result = dict(PRESET_BUTTERCUP)
        if cat_name:
            result["cat_name"] = cat_name
        return JSONResponse(content={
            "result": result,
            "demo_mode": True,
            "message": "Graded using Demo Mode (Sample Preset). To grade your own cat photos in real-time with Gemini 3.8 Flash, enter your Gemini API key in the top right settings!"
        })

    is_server_key = not bool(api_key or x_gemini_api_key)
    client_ip = get_client_ip(request)

    # Enforce free-tier anti-spam and daily limits
    allowed, limit_msg = check_free_tier_limits(client_ip, is_server_key)
    if not allowed:
        raise HTTPException(status_code=429, detail=limit_msg)

    # Call Gemini API
    if not GENAI_AVAILABLE:
        raise HTTPException(
            status_code=500,
            detail="The google-genai SDK is not available on the server. Please install dependencies or use demo mode."
        )

    try:
        client = genai.Client(api_key=effective_api_key)
        
        contents_parts = []
        if cat_name and cat_name.strip() and cat_name.strip().lower() not in ['anonymous subject', 'anonymous baker', 'none']:
            contents_parts.append(f"Subject Cat Name: {cat_name.strip()}")
        else:
            contents_parts.append("Subject Cat Name: Not specified. (Please generate a clever, humorous honorary bakery name for this cat, e.g. 'The Mysterious Loaf', 'Sir Doughington', 'Lady Brioche').")
        contents_parts.append(f"Number of angles submitted: {len(submitted_images)}")
        
        for label, img_bytes, mime in submitted_images:
            contents_parts.append(f"Inspection Image: {label}")
            contents_parts.append(types.Part.from_bytes(data=img_bytes, mime_type=mime))
            
        contents_parts.append(
            "Please perform the official Cat Loaf Audit on this cat according to the 4 criteria: "
            "Paw Tuck (0-25), Tail Tuck (0-25), Elbow Form & Compactness (0-25), Crust/Symmetry/Toastiness (0-25). "
            "Be a strictly critical, discerning judge. Deduct points firmly for visible paws, flared elbows, or trailing tails. "
            "Calculate overall_score (0-100), bread classification, honorary loaf rank, drag coefficient, and witty constructive feedback."
        )

        target_model = model or "gemini-3.8-flash"
        logger.info(f"Sending request to Gemini model {target_model} with {len(submitted_images)} images from IP {client_ip}...")

        # Robust execution with automatic fallback if primary model experiences 503 high demand
        response = None
        models_to_try = [target_model]
        if target_model != "gemini-3.5-flash-lite":
            models_to_try.append("gemini-3.5-flash-lite")

        for attempt, model_candidate in enumerate(models_to_try):
            try:
                response = client.models.generate_content(
                    model=model_candidate,
                    contents=contents_parts,
                    config=types.GenerateContentConfig(
                        response_mime_type="application/json",
                        response_schema=LoafAnalysisResult,
                        system_instruction=SYSTEM_PROMPT,
                        temperature=0.3
                    )
                )
                break
            except Exception as attempt_err:
                err_text = str(attempt_err)
                if ("503" in err_text or "UNAVAILABLE" in err_text) and attempt < len(models_to_try) - 1:
                    logger.warning(f"Model {model_candidate} is 503 UNAVAILABLE. Retrying with {models_to_try[attempt+1]}...")
                    time.sleep(1.0)
                    continue
                raise attempt_err

        analysis_data = json.loads(response.text)
        return JSONResponse(content={
            "result": analysis_data,
            "demo_mode": False
        })

    except Exception as e:
        logger.error(f"Gemini API error: {e}", exc_info=True)
        err_str = str(e)
        if "API_KEY_INVALID" in err_str or "403" in err_str or "unregistered" in err_str:
            raise HTTPException(
                status_code=401,
                detail="Invalid API key. Please verify your Google Gemini API key in Configuration."
            )
        elif "RESOURCE_EXHAUSTED" in err_str or "429" in err_str or "quota" in err_str.lower():
            raise HTTPException(
                status_code=429,
                detail="Evaluation capacity reached. The public quota has been reached for today. Please try again later or add your personal API key in Configuration."
            )
        elif "503" in err_str or "UNAVAILABLE" in err_str or "high demand" in err_str.lower():
            raise HTTPException(
                status_code=503,
                detail="The AI vision model is experiencing temporary high demand from Google. Please wait a few moments and try again."
            )
        elif "400" in err_str or "INVALID_ARGUMENT" in err_str:
            raise HTTPException(
                status_code=400,
                detail="Unable to process uploaded images. Please ensure files are valid JPEG or PNG images."
            )
        else:
            raise HTTPException(
                status_code=500,
                detail="An unexpected error occurred during the visual inspection. Please try again."
            )

# Mount static files
app.mount("/static", StaticFiles(directory=str(STATIC_DIR)), name="static")

@app.get("/")
async def serve_index():
    return FileResponse(str(STATIC_DIR / "index.html"))

@app.get("/robots.txt", response_class=PlainTextResponse)
async def serve_robots():
    robots_file = STATIC_DIR / "robots.txt"
    if robots_file.exists():
        return FileResponse(str(robots_file), media_type="text/plain")
    return PlainTextResponse("User-agent: *\nAllow: /\nDisallow: /api/\nSitemap: https://loafed.redersoft.com/sitemap.xml\n")

@app.get("/sitemap.xml")
async def serve_sitemap():
    sitemap_file = STATIC_DIR / "sitemap.xml"
    if sitemap_file.exists():
        return FileResponse(str(sitemap_file), media_type="application/xml")
    raise HTTPException(status_code=404, detail="Sitemap not found")

@app.get("/manifest.webmanifest")
@app.get("/manifest.json")
async def serve_manifest():
    manifest_file = STATIC_DIR / "manifest.webmanifest"
    if manifest_file.exists():
        return FileResponse(str(manifest_file), media_type="application/manifest+json")
    raise HTTPException(status_code=404, detail="Manifest not found")

# AWS Lambda Handler (via Mangum)
try:
    from mangum import Mangum
    handler = Mangum(app)
except ImportError:
    handler = None

if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("PORT", 8000))
    uvicorn.run("app:app", host="0.0.0.0", port=port, reload=True)
