import os
import json
import logging
from typing import Optional, List, Dict, Any
from pathlib import Path

from fastapi import FastAPI, UploadFile, File, Form, Header, HTTPException, Request
from fastapi.responses import JSONResponse, FileResponse
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
        }
    }

def get_gemini_client(client_key: Optional[str] = None):
    """Instantiate Gemini client using client provided key or environment variable."""
    api_key = client_key or os.getenv("GEMINI_API_KEY", "").strip()
    if not api_key:
        return None
    return genai.Client(api_key=api_key)

SYSTEM_PROMPT = """You are the Senior Inspector and Technical Director of the Official Cat Loaf Certification Bureau (inspired by loafed.app and the highest feline bakery standards).
Your mission is to rigorously, affectionately, and wittily grade cats on their "loafed score" (0 to 100) using visual evidence from the uploaded photos.

CRITICAL FORMATTING INSTRUCTION:
Do NOT use emojis anywhere in your response. No emojis in titles, status text, critiques, observations, bread classifications, badges, or tips. Keep the styling clean, dignified, witty, and editorial.

CORE FELINE LOAF CONCEPTS & AUDIT CRITERIA:
- PEET CONCEALMENT: The Holy Grail of loafing. Zero visible paws, toe beans, claws, or wrists. Even a 2mm 'peet peek' incurs a strict audit deduction.
- THE LOAF BOAT & OARS: If one front leg is extended forward while the rest of the body is loafed, this is NOT a pure loaf; it is a 'Loaf Boat' with an 'Oar Deployed' navigating choppy waters. Flag this immediately (oar_detected = True)!
- CHICKEN WINGING: When elbows flare out laterally from the flank instead of tucking neatly beneath the ribcage like tight dough folds.
- SPHINX IMPOSTER: If the cat is upright on front legs like an Egyptian monument, call it out as an uncertified Sphinx Imposter.
- FACE LOAF: When the cat's nose, chin, or forehead is planted directly flat into the carpet or chest. A rare, high-honor maneuver!
- BREAD PROOFING & SLUMP: Is the cat a tight, compact artisan boule, an overproofed fluffy challah, or liquid dough melting off the edge of a chair?

EVALUATION CRITERIA (25 Points Each):
1. PAW TUCK (0-25):
   - Are all four paws completely hidden beneath the chest/body?
   - 25 = 100% stealth peet concealment. Zero paws, toe beans, or wrists visible from any angle.
   - Deduct points for: 'peet peek' (visible toes), 'chicken wing' (untucked forearm), or the dreaded 'Loaf Boat' (one paw sticking out forward like an oar).
   - Set oar_detected = True if a front paw is acting as an oar.

2. TAIL TUCK (0-25):
   - Is the tail curled tightly flush against the body or tucked underneath?
   - 25 = Zero tail drag, flush flank wrap or concealed tail like a cinnamon roll.
   - Deduct points for: tail swishing sideways, tail tip sticking out at a right angle, or sprawled tail causing aerodynamic drag.
   - Estimate a realistic 'drag_coefficient' (0.01 = sleekest aerodynamic loaf, 0.90 = wild untucked tail).

3. LOAF FORM & COMPACTNESS (0-25):
   - Elbow alignment pulled inward against ribcage.
   - Rising dough contour: is the cat a tight, compact bread loaf, or loose/spread out?
   - Check if the cat is doing a 'Face Loaf' (head rested completely flat on chest or floor).

4. CRUST, SYMMETRY & TOASTINESS (0-25):
   - Dorsal symmetry from overhead/front.
   - Bread classification: compare the cat's coloring, fluffiness, and shape to a specific artisanal bread type:
     (e.g., 'Double-Toasted Golden Brioche', 'Rustic Sourdough Boule', 'Charcoal Pumpernickel' for black cats, 'Cinnamon Marble Rye' for calicos, 'Fluffy Hokkaido Milk Bread' for white cats, 'Tiger-Crusted Sourdough' for tabbies, 'Overproofed Pullman Loaf' for chonky cats, 'French Baguette' for elongated cats, or 'Underproofed Doughball').
   - Coat toastiness and baking consistency.

MULTI-ANGLE BONUS:
- If 3 views (front, side, top) are provided, give +3 to +5 multi-angle bonus points!
- If 2 views are provided, give +2 bonus points.
- If only 1 view is provided, give +0 bonus points and note what other views would be needed for full 360-degree verification.
- Overall score = sum of the 4 subscores (capped at 100). Ensure overall_score accurately reflects the sum + bonus.

TONE:
Affectionate, dryly humorous, playful, and culinary-obsessed. Treat cat loafing as both an exacting scientific discipline and a prestigious artisanal bakery art. Celebrate the cat's unique loafing quirks with charming, funny observations and lighthearted tips.
Never use emojis. Always return structured JSON conforming to the requested schema.
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
    
    # Collect all uploaded files and organize by angle
    submitted_images = [] # list of (label, bytes, mime_type)
    
    if front and front.filename:
        content = await front.read()
        if len(content) > 0:
            submitted_images.append(("Front View", content, front.content_type or "image/jpeg"))
            
    if side and side.filename:
        content = await side.read()
        if len(content) > 0:
            submitted_images.append(("Side View", content, side.content_type or "image/jpeg"))
            
    if top and top.filename:
        content = await top.read()
        if len(content) > 0:
            submitted_images.append(("Top (Bird's Eye) View", content, top.content_type or "image/jpeg"))
            
    if images:
        for idx, img in enumerate(images):
            if img.filename:
                content = await img.read()
                if len(content) > 0:
                    label = f"Angle {len(submitted_images) + 1}"
                    submitted_images.append((label, content, img.content_type or "image/jpeg"))

    if not submitted_images:
        raise HTTPException(status_code=400, detail="Please upload at least 1 cat photo (front, side, top, or general).")

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
        contents_parts.append(f"Cat Name: {cat_name or 'Anonymous Baker'}")
        contents_parts.append(f"Number of angles submitted: {len(submitted_images)}")
        
        for label, img_bytes, mime in submitted_images:
            contents_parts.append(f"Inspection Image: {label}")
            contents_parts.append(types.Part.from_bytes(data=img_bytes, mime_type=mime))
            
        contents_parts.append(
            "Please perform the official Cat Loaf Audit on this cat according to the 4 criteria: "
            "Paw Tuck (0-25), Tail Tuck (0-25), Elbow Form & Compactness (0-25), Crust/Symmetry/Toastiness (0-25). "
            "Calculate overall_score (0-100), bread classification, honorary loaf rank, drag coefficient, and hilarious constructive feedback."
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
