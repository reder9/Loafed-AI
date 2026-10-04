import os
import re
import io
import json
import logging
import hmac
import hashlib
import base64
import uuid
import subprocess
import urllib.request
import urllib.parse
from typing import Optional, List, Dict, Any
from pathlib import Path
from decimal import Decimal

from PIL import Image, UnidentifiedImageError
import boto3
from boto3.dynamodb.conditions import Key, Attr
from botocore.exceptions import ClientError
import jwt
from jwt.algorithms import RSAAlgorithm

from fastapi import FastAPI, UploadFile, File, Form, Header, HTTPException, Request, BackgroundTasks
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

# Enable CORS for production and development
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "https://loafed.redersoft.com",
        "https://main.d14utztk41y058.amplifyapp.com",
        "http://localhost:8000",
        "http://127.0.0.1:8000",
        "http://localhost:3000",
        "http://localhost:5173",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.middleware("http")
async def add_security_headers(request: Request, call_next):
    response = await call_next(request)
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "SAMEORIGIN"
    response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
    response.headers["Permissions-Policy"] = "camera=(), microphone=(), geolocation=()"
    return response

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
        return False, "The bakery ovens are currently at maximum capacity for today. Daily public evaluation slots have been filled. Please check back tomorrow when fresh slots open up, or explore Buttercup's baseline dataset below!"

    # Record loaf inspection
    daily_counter["count"] += 1
    ip_history[client_ip].append(now)
    return True, ""


# Upload validation limits
MAX_IMAGES = 5
MAX_IMAGE_BYTES = 8 * 1024 * 1024        # 8 MB per image
MAX_IMAGE_DIMENSION = 12000              # px per side
ALLOWED_IMAGE_FORMATS = {"JPEG": "image/jpeg", "PNG": "image/png", "WEBP": "image/webp"}
MAX_CAT_NAME_LENGTH = 40
Image.MAX_IMAGE_PIXELS = 100_000_000     # decompression-bomb guard (Pillow errors above 2x this)


# Comprehensive Profanity and Offensive Language Filter Patterns
LEET_MAP = str.maketrans({
    '@': 'a', '4': 'a',
    '3': 'e',
    '1': 'i', '!': 'i', '|': 'i',
    '0': 'o',
    '5': 's', '$': 's',
    '7': 't', '+': 't',
    '8': 'b',
    '9': 'g',
})

PROFANITY_WORD_PATTERNS = [
    # Fuck and variants (including f*ck, f@ck, fuk, fck)
    r'\bf+[u*@a0_]+c*k+(?:er|ing|ed|s|head)?\b',
    r'\bf+u+k+s?\b',
    r'\bf+c+k+s?\b',
    r'\bf+\*+k+s?\b',
    r'\bm+o+t+h+e+r+f+[u*@a0_]+c*k+(?:er)?\b',
    # Shit and variants (including sh*t, s**t)
    r'\bs+[h*]*[i*1!]+t+(?:ty|ted|ting|s|head)?\b',
    r'\bb+u+l+l+s+h+[i*1!]+t+\b',
    # Bitch and variants (including b*tch, b!tch)
    r'\bb+[i*1!]+t+c+h+(?:es|ing)?\b',
    r'\bb+\*+t+c+h+\b',
    # Ass / Asshole
    r'\ba+s+s+h+o+l+e+s?\b',
    r'\ba+r+s+e+h+o+l+e+s?\b',
    r'\bd+u+m+b+a+s+s+e?s?\b',
    r'\bj+a+c+k+a+s+s+e?s?\b',
    # Bastard
    r'\bb+a+s+t+a+r+d+s?\b',
    # Cunt, Twat, Wanker
    r'\bc+[u*@a0_]+n+t+s?\b',
    r'\bt+w+a+t+s?\b',
    r'\bw+a+n+k+e+r+s?\b',
    # Dick, Cock, Penis, Pussy, Vagina
    r'\bd+[i*1!]+c+k+(?:head|s)?\b',
    r'\bc+[o*0]+c+k+(?:sucker|s)?\b',
    r'\bp+[u*@a0_]+s+s+y+(?:es)?\b',
    r'\bv+a+g+[i*1!]+n+a+s?\b',
    r'\bp+e+n+[i*1!]+s+e?s?\b',
    r'\bc+l+[i*1!]+t+s?\b',
    r'\bd+[i*1!]+l+d+o+s?\b',
    # Whore, Slut
    r'\bw+h+[o*0]+r+e+s?\b',
    r'\bs+l+[u*@a0_]+t+s?\b',
    # Hate speech / Slurs
    r'\bf+a+g+(?:g+o+t+)?s?\b',
    r'\bd+y+k+e+s?\b',
    r'\bt+r+a+n+n+y+\b',
    r'\bk+[i*1!]+k+e+s?\b',
    r'\bc+h+[i*1!]+n+k+s?\b',
    r'\bg+[o*0]{2}k+s?\b',
    r'\bs+p+[i*1!]+c+s?\b',
    r'\bw+e+t+b+a+c+k+s?\b',
    r'\br+e+t+a+r+d+(?:ed)?\b',
    r'\bn+a+z+[i*1!]+s?\b',
    r'\bh+[i*1!]+t+l+e+r\b',
    r'\bk+k+k+\b',
    # Explicit sexual
    r'\bp+[o*0]+r+n+(?:o|ography)?s?\b',
    r'\bh+e+n+t+a+[i*1!]+\b',
    r'\bb+l+[o*0]+w+j+[o*0]+b+s?\b',
    r'\bh+a+n+d+j+[o*0]+b+s?\b',
    r'\bc+[u*@a0_]+m+(?:shot)?s?\b',
    r'\bj+[i*1!]+z+z+\b',
    # Violence / harassment
    r'\bk+[i*1!]+l+l+\s*y+[o*0]+u+r+s+e+l+f+\b',
    r'\bk+y+s+\b',
    r'\bp+e+d+[o*0]+(?:phile)?s?\b',
    r'\br+a+p+e+s?\b',
    r'\br+a+p+[i*1!]+s+t+s?\b',
]

SEVERE_SUBSTRINGS = [
    r'n+[i*1!|]+g+g+[ae*]+r?',
    r'n+[i*1!|]+g+g+a',
    r'f+a+g+g+[o*0]+t',
    r'k+[i*1!]+k+e',
    r'c+h+[i*1!]+n+k',
    r'w+e+t+b+a+c+k',
    r's+w+a+s+t+[i*1!]+k+a',
    r'h+e+[i*1!]+l+h+[i*1!]+t+l+e+r',
]

COMPILED_WORD_PATTERNS = [re.compile(p, re.IGNORECASE) for p in PROFANITY_WORD_PATTERNS]
COMPILED_SEVERE_PATTERNS = [re.compile(p, re.IGNORECASE) for p in SEVERE_SUBSTRINGS]


def is_profane(text: str) -> bool:
    """Checks if text contains offensive words, slurs, or harassment phrases."""
    if not text:
        return False

    # 1. Direct word check
    for cp in COMPILED_WORD_PATTERNS:
        if cp.search(text):
            return True

    # 2. Severe substring check
    for sp in COMPILED_SEVERE_PATTERNS:
        if sp.search(text):
            return True

    # 3. Leet-normalized check
    normalized = text.lower().translate(LEET_MAP)
    for cp in COMPILED_WORD_PATTERNS:
        if cp.search(normalized):
            return True
    for sp in COMPILED_SEVERE_PATTERNS:
        if sp.search(normalized):
            return True

    # 4. Separator-stripped check (for "f.u.c.k", "s-h-i-t", etc.)
    stripped = re.sub(r'[^a-z0-9]', '', normalized)
    for sp in COMPILED_SEVERE_PATTERNS:
        if sp.search(stripped):
            return True

    if len(stripped) < len(normalized):
        collapsed_test = re.sub(r'(.)\1+', r'\1', stripped)
        for cp in COMPILED_WORD_PATTERNS:
            pattern_raw = cp.pattern.replace(r'\b', '')
            clean_pat = re.sub(r'\++', '', pattern_raw)
            if re.search(clean_pat, collapsed_test, re.IGNORECASE):
                return True

    return False


ALLOWED_NAME_REGEX = re.compile(r"^[a-zA-Z0-9\u00C0-\u017F\s\-'.&_]+$")
PLACEHOLDER_NAMES = {
    "anonymous loaf", "anonymous", "unknown", "untitled",
    "n/a", "na", "none", "null", "undefined", "placeholder", "test", "user", "username"
}
RESERVED_NAMES = {
    "admin", "administrator", "system", "moderator", "mod", "loafed", 
    "loafedai", "loafed-ai", "loafed_ai", "redersoft", "staff", "official", 
    "support", "root", "security", "bureau", "master", "owner"
}

def validate_and_sanitize_name(name: Optional[str], field_label: str = "Name", min_len: int = 2, max_len: int = 30) -> str:
    """Strictly validates, sanitizes, and filters user-supplied public names for the leaderboard and profile."""
    if not name or not str(name).strip():
        raise HTTPException(
            status_code=400,
            detail=f"{field_label} is required to submit a loaf to the leaderboard."
        )

    raw = str(name).strip()

    # Reject HTML tags, script brackets, or injection characters outright
    if re.search(r'[<>{}\[\];\\/`~=+^%$*"]', raw):
        raise HTTPException(
            status_code=400,
            detail=f"{field_label} contains invalid characters. Please use letters, numbers, spaces, and basic punctuation (- ' . & _)."
        )

    # Clean non-printable characters
    cleaned = "".join(ch for ch in raw if ch.isprintable())
    # Normalize internal whitespace
    cleaned = re.sub(r'\s+', ' ', cleaned).strip()

    if len(cleaned) < min_len:
        raise HTTPException(
            status_code=400,
            detail=f"{field_label} must be at least {min_len} characters long."
        )

    if len(cleaned) > max_len:
        raise HTTPException(
            status_code=400,
            detail=f"{field_label} cannot exceed {max_len} characters."
        )

    # Must match allowed characters whitelist (no emojis, no symbols)
    if not ALLOWED_NAME_REGEX.match(cleaned):
        raise HTTPException(
            status_code=400,
            detail=f"{field_label} contains unsupported characters. Please use standard letters, numbers, spaces, and basic punctuation (- ' . & _)."
        )

    # Must contain at least one letter or number
    if not re.search(r'[a-zA-Z0-9\u00C0-\u017F]', cleaned):
        raise HTTPException(
            status_code=400,
            detail=f"{field_label} must contain at least one letter or number."
        )

    # Reject generic placeholders
    if cleaned.lower() in PLACEHOLDER_NAMES:
        raise HTTPException(
            status_code=400,
            detail=f"Please provide an actual name for your {field_label.lower()} instead of a generic placeholder."
        )

    # Reject reserved administrative or impersonation titles
    normalized_alphanumeric = re.sub(r'[^a-z0-9]', '', cleaned.lower())
    if cleaned.lower() in RESERVED_NAMES or normalized_alphanumeric in RESERVED_NAMES:
        raise HTTPException(
            status_code=400,
            detail=f"'{cleaned}' is a reserved title. Please choose a personalized baker display name."
        )

    # Check profanity / inappropriate terms
    if is_profane(cleaned):
        raise HTTPException(
            status_code=400,
            detail=f"{field_label} contains inappropriate or offensive language. Please choose a family-friendly bakery name."
        )

    return cleaned

# Backward-compatible alias for profile updates
validate_name = validate_and_sanitize_name


def sanitize_cat_name(name: Optional[str]) -> Optional[str]:
    """Lightweight sanitization for initial grading requests (allows None)."""
    if not name:
        return None
    cleaned = "".join(ch for ch in name if ch.isprintable()).strip()[:MAX_CAT_NAME_LENGTH]
    return cleaned or None


async def read_and_validate_image(upload: UploadFile):
    """Reads an upload with a hard size cap and verifies it is genuinely a JPEG/PNG/WebP.

    Returns (bytes, detected_mime) or (b"", "") for an empty file. Never trusts the
    client supplied filename or Content-Type.
    """
    content = await upload.read(MAX_IMAGE_BYTES + 1)
    if len(content) > MAX_IMAGE_BYTES:
        raise HTTPException(status_code=413, detail=f"Each photo must be {MAX_IMAGE_BYTES // (1024 * 1024)} MB or smaller.")
    if not content:
        return b"", ""
    try:
        with Image.open(io.BytesIO(content)) as probe:
            fmt = probe.format
            width, height = probe.size
            probe.verify()
    except (UnidentifiedImageError, Image.DecompressionBombError, OSError, SyntaxError, ValueError):
        raise HTTPException(status_code=400, detail="One of the uploaded files is not a valid JPEG, PNG or WebP image.")
    if fmt not in ALLOWED_IMAGE_FORMATS:
        raise HTTPException(status_code=400, detail="Only JPEG, PNG and WebP photos are supported.")
    if width > MAX_IMAGE_DIMENSION or height > MAX_IMAGE_DIMENSION:
        raise HTTPException(status_code=400, detail=f"Photos may be at most {MAX_IMAGE_DIMENSION} pixels per side.")
    return content, ALLOWED_IMAGE_FORMATS[fmt]


# AWS & Auth Configuration (Unified RederSoft Auth Pattern)
COGNITO_USER_POOL_ID = os.getenv("COGNITO_USER_POOL_ID", "us-east-1_WNuiA3Tyg")
COGNITO_CLIENT_ID = os.getenv("COGNITO_CLIENT_ID", "9qibinq77f26bat64unru8q77")
COGNITO_DOMAIN = os.getenv("COGNITO_DOMAIN", "auth.redersoft.com")
AWS_REGION = os.getenv("AWS_REGION", "us-east-1")
DYNAMODB_TABLE_NAME = os.getenv("DYNAMODB_TABLE", "Loafed-Leaderboard")
S3_BUCKET_NAME = os.getenv("S3_THUMBNAILS_BUCKET", "loafed-thumbnails-686255947626")
SIGNATURE_SECRET = os.getenv("SIGNATURE_SECRET", "c0afed7a89b4e5f61234567890abcdefc0afed7a89b4e5f61234567890abcdef")


def get_boto3_session():
    """Returns a working boto3 Session, prioritizing Lambda IAM execution role,
    standard environment variables, or local profile fallback."""
    if os.getenv("AWS_LAMBDA_FUNCTION_NAME"):
        return boto3.Session(region_name=AWS_REGION)

    # For local development or non-Lambda environments, try exported profile credentials
    profile = os.getenv("AWS_PROFILE", "antigravity")
    try:
        proc = subprocess.run(
            ["aws", "configure", "export-credentials", "--profile", profile],
            capture_output=True,
            text=True,
            timeout=5
        )
        if proc.returncode == 0 and proc.stdout:
            creds = json.loads(proc.stdout)
            return boto3.Session(
                aws_access_key_id=creds.get("AccessKeyId"),
                aws_secret_access_key=creds.get("SecretAccessKey"),
                aws_session_token=creds.get("SessionToken"),
                region_name=AWS_REGION
            )
    except Exception as err:
        logger.debug(f"Local aws export-credentials note: {err}")

    return boto3.Session(region_name=AWS_REGION)


COGNITO_JWKS_CACHE: Dict[str, Any] = {"keys": None, "fetched_at": 0.0}


def get_cognito_jwks() -> dict:
    now = time.time()
    if COGNITO_JWKS_CACHE["keys"] and (now - COGNITO_JWKS_CACHE["fetched_at"] < 3600):
        return COGNITO_JWKS_CACHE["keys"]

    url = f"https://cognito-idp.{AWS_REGION}.amazonaws.com/{COGNITO_USER_POOL_ID}/.well-known/jwks.json"
    req = urllib.request.Request(url, headers={"User-Agent": "Loafed-Backend/1.0"})
    try:
        with urllib.request.urlopen(req, timeout=5) as resp:
            data = json.loads(resp.read().decode("utf-8"))
            COGNITO_JWKS_CACHE["keys"] = data
            COGNITO_JWKS_CACHE["fetched_at"] = now
            return data
    except Exception as e:
        logger.error(f"Failed to fetch Cognito JWKS: {e}")
        if COGNITO_JWKS_CACHE["keys"]:
            return COGNITO_JWKS_CACHE["keys"]
        raise HTTPException(status_code=500, detail="Authentication provider key retrieval failed.")


def verify_cognito_token(auth_header: Optional[str]) -> dict:
    if not auth_header or not auth_header.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Authentication required. Please sign in.")
    token = auth_header.split(" ", 1)[1].strip()
    try:
        header = jwt.get_unverified_header(token)
        kid = header.get("kid")
        if not kid:
            raise HTTPException(status_code=401, detail="Invalid token header.")

        jwks = get_cognito_jwks()
        key_data = next((k for k in jwks.get("keys", []) if k.get("kid") == kid), None)
        if not key_data:
            COGNITO_JWKS_CACHE["fetched_at"] = 0.0
            jwks = get_cognito_jwks()
            key_data = next((k for k in jwks.get("keys", []) if k.get("kid") == kid), None)
            if not key_data:
                raise HTTPException(status_code=401, detail="Invalid token key signature.")

        public_key = RSAAlgorithm.from_jwk(key_data)
        claims = jwt.decode(
            token,
            public_key,
            algorithms=["RS256"],
            options={"verify_aud": False}
        )

        expected_issuer = f"https://cognito-idp.{AWS_REGION}.amazonaws.com/{COGNITO_USER_POOL_ID}"
        if claims.get("iss") != expected_issuer:
            raise HTTPException(status_code=401, detail="Invalid token issuer.")

        user_id = claims.get("sub")
        if not user_id:
            raise HTTPException(status_code=401, detail="Missing user identifier in token claims.")

        token_client_id = claims.get("aud") or claims.get("client_id")
        if COGNITO_CLIENT_ID and token_client_id and token_client_id != COGNITO_CLIENT_ID:
            raise HTTPException(status_code=401, detail="Token not issued for Loafed application client.")

        return claims
    except HTTPException:
        raise
    except Exception as e:
        logger.warning(f"Cognito token validation failed: {e}")
        raise HTTPException(status_code=401, detail="Session expired or invalid authentication token.")


def generate_grade_token(
    result_data: dict,
    image_hash: Optional[str] = None,
    image_hashes: Optional[List[str]] = None,
    best_thumbnail_index: Optional[int] = 0
) -> str:
    hashes_list = image_hashes or ([image_hash] if image_hash else [])
    payload = {
        "cat_name": result_data.get("cat_name", "Anonymous Loaf"),
        "overall_score": int(result_data.get("overall_score", 0)),
        "grade_letter": str(result_data.get("grade_letter", "")),
        "loaf_rank": str(result_data.get("loaf_rank", "")),
        "bread_classification": str(result_data.get("bread_classification", "")),
        "summary_critique": str(result_data.get("summary_critique", "")),
        "paw_tuck": result_data.get("paw_tuck", {}),
        "tail_tuck": result_data.get("tail_tuck", {}),
        "elbow_compactness": result_data.get("elbow_compactness", {}),
        "crust_symmetry": result_data.get("crust_symmetry", {}),
        "drag_coefficient": float(result_data.get("drag_coefficient", 0.15)) if result_data.get("drag_coefficient") is not None else 0.15,
        "badges": result_data.get("badges", []),
        "fun_tips_for_cat": result_data.get("fun_tips_for_cat", []),
        "angle_notes": result_data.get("angle_notes", {}),
        "oar_detected": bool(result_data.get("oar_detected", False)),
        "face_loaf": bool(result_data.get("face_loaf", False)),
        "multi_angle_bonus": int(result_data.get("multi_angle_bonus", 0)),
        "image_sha256": image_hash,
        "image_hashes": hashes_list,
        "best_thumbnail_index": int(best_thumbnail_index if best_thumbnail_index is not None else 0),
        "ts": int(time.time()),
        "salt": uuid.uuid4().hex[:12]
    }
    encoded = base64.urlsafe_b64encode(json.dumps(payload, sort_keys=True).encode()).decode()
    signature = hmac.new(SIGNATURE_SECRET.encode(), encoded.encode(), hashlib.sha256).hexdigest()
    return f"{encoded}.{signature}"


def verify_grade_token(grade_token: str) -> dict:
    if not grade_token or "." not in grade_token:
        raise HTTPException(status_code=400, detail="Invalid grade evaluation token.")
    parts = grade_token.rsplit(".", 1)
    if len(parts) != 2:
        raise HTTPException(status_code=400, detail="Malformed grade token structure.")
    encoded, signature = parts
    expected_sig = hmac.new(SIGNATURE_SECRET.encode(), encoded.encode(), hashlib.sha256).hexdigest()
    if not hmac.compare_digest(signature, expected_sig):
        raise HTTPException(status_code=400, detail="Tampered or invalid evaluation token.")
    try:
        data = json.loads(base64.urlsafe_b64decode(encoded.encode()).decode())
        if time.time() - data.get("ts", 0) > 86400:
            raise HTTPException(status_code=400, detail="Grade token has expired. Please run a new loaf inspection.")
        return data
    except Exception as e:
        if isinstance(e, HTTPException):
            raise
        raise HTTPException(status_code=400, detail="Failed to parse grade token payload.")


def create_leaderboard_thumbnail(image_bytes: bytes) -> bytes:
    with Image.open(io.BytesIO(image_bytes)) as img:
        if img.mode in ("RGBA", "LA", "P"):
            rgb_img = Image.new("RGB", img.size, (255, 255, 255))
            if img.mode == "P":
                img = img.convert("RGBA")
            rgb_img.paste(img, mask=img.split()[-1] if "A" in img.mode else None)
            img = rgb_img
        elif img.mode != "RGB":
            img = img.convert("RGB")

        img.thumbnail((600, 600), Image.Resampling.LANCZOS)
        out = io.BytesIO()
        img.save(out, format="WEBP", quality=82, method=6)
        return out.getvalue()


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
    is_cat: bool = Field(default=True, description="True if the subject in the photo is genuinely a real domestic cat or feline. False if the image depicts another animal, a human, food, an inanimate object, a vehicle, or contains inappropriate content.")
    rejection_reason: Optional[str] = Field(default=None, description="If is_cat is False, a witty, polite inspection rejection reason explaining why this subject cannot be certified as a feline loaf. Zero emojis.")
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
    best_thumbnail_index: Optional[int] = Field(default=0, description="0-based index of the best front or side photo for the primary leaderboard portrait. Avoid overhead/top-down views.")
    angle_classifications: Optional[List[str]] = Field(default_factory=list, description="Classifications for each submitted photo index ('front', 'side', 'top', or 'other').")

# Pre-baked analysis for sample preset cats
PRESET_BUTTERCUP = {
    "is_cat": True,
    "rejection_reason": None,
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
    },
    "best_thumbnail_index": 0,
    "thumbnail_url": "/samples/buttercup_front.jpg",
    "angles": [
        {"label": "Front View", "url": "/samples/buttercup_front.jpg"},
        {"label": "Side View", "url": "/samples/buttercup_side.jpg"},
        {"label": "Overhead (Top) View", "url": "/samples/buttercup_top.jpg"}
    ],
    "photo_urls": [
        "/samples/buttercup_front.jpg",
        "/samples/buttercup_side.jpg",
        "/samples/buttercup_top.jpg"
    ]
}

PRESET_CHONKS = {
    "is_cat": True,
    "rejection_reason": None,
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
    },
    "best_thumbnail_index": 0,
    "thumbnail_url": "/samples/chonks_front.jpg",
    "angles": [
        {"label": "Front View", "url": "/samples/chonks_front.jpg"},
        {"label": "Side View", "url": "/samples/chonks_side.jpg"},
        {"label": "Semi-Front View", "url": "/samples/chonks_semi_front.jpg"}
    ],
    "photo_urls": [
        "/samples/chonks_front.jpg",
        "/samples/chonks_side.jpg",
        "/samples/chonks_semi_front.jpg"
    ]
}

PRESET_FLASH = {
    "is_cat": True,
    "rejection_reason": None,
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
    },
    "best_thumbnail_index": 0,
    "thumbnail_url": "/samples/flash_front.jpg",
    "angles": [
        {"label": "Front View", "url": "/samples/flash_front.jpg"},
        {"label": "Side View", "url": "/samples/flash_side.jpg"}
    ],
    "photo_urls": [
        "/samples/flash_front.jpg",
        "/samples/flash_side.jpg"
    ]
}

@app.get("/health")
@app.get("/api/health")
async def health_check():
    """Lightweight health check for monitoring and routing."""
    return {"status": "ok"}

@app.get("/api/status")
async def get_status():
    """Returns server and API key status."""
    keys = get_server_api_keys()
    return {
        "has_server_api_key": len(keys) > 0,
        "key_pool_size": len(keys),
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

# Multi-Key Pool & Health Tracking
key_exhaustion_tracker: Dict[str, float] = {}

def get_server_api_keys() -> List[str]:
    """Retrieves all configured Gemini API keys from environment variables.
    Checks GEMINI_API_KEYS (comma-separated or JSON array) and GEMINI_API_KEY.
    Returns a deduplicated list of non-empty keys.
    """
    keys: List[str] = []

    # 1. Check GEMINI_API_KEYS (supports comma-separated list or JSON array)
    env_multi = os.getenv("GEMINI_API_KEYS", "").strip()
    if env_multi:
        if env_multi.startswith("[") and env_multi.endswith("]"):
            try:
                parsed = json.loads(env_multi)
                if isinstance(parsed, list):
                    for k in parsed:
                        k_str = str(k).strip()
                        if k_str and k_str not in keys:
                            keys.append(k_str)
            except Exception:
                pass
        if not keys:
            for k in env_multi.split(","):
                k_clean = k.strip()
                if k_clean and k_clean not in keys:
                    keys.append(k_clean)

    # 2. Check GEMINI_API_KEY (supports single key or comma-separated list)
    env_single = os.getenv("GEMINI_API_KEY", "").strip()
    if env_single:
        for k in env_single.split(","):
            k_clean = k.strip()
            if k_clean and k_clean not in keys:
                keys.append(k_clean)

    return keys

def get_ordered_api_keys(custom_key: Optional[str] = None) -> List[str]:
    """Returns an ordered list of keys to attempt.
    If custom_key is passed, it takes top precedence.
    Healthy keys (not currently in 429 cooldown) are prioritized first.
    """
    if custom_key:
        return [custom_key]

    server_keys = get_server_api_keys()
    if not server_keys:
        return []

    now = time.time()
    healthy: List[str] = []
    cooldown: List[str] = []

    for k in server_keys:
        kid = k[-8:] if len(k) >= 8 else k
        cooldown_until = key_exhaustion_tracker.get(kid, 0)
        if now < cooldown_until:
            cooldown.append(k)
        else:
            healthy.append(k)

    return healthy + cooldown

def get_gemini_client(client_key: Optional[str] = None):
    """Instantiate Gemini client using client provided key or environment variable."""
    ordered = get_ordered_api_keys(client_key)
    if not ordered:
        return None
    return genai.Client(api_key=ordered[0])

SYSTEM_PROMPT = """You are the Senior Inspector and Chief Technical Director of the Official Cat Loaf Certification Bureau (inspired by loafed.app, Michelin-starred bakery standards, and feline aerodynamic engineering).
Your mission is to evaluate uploaded cat photos as a STRICT, DISCERNING, HIGHLY CRITICAL, YET HILARIOUSLY WITTY JUDGE.

CRITICAL DIRECTIVE ON FELINE SUBJECT VERIFICATION & SAFETY:
Your very first duty before any grading is to verify that the photo genuinely depicts a real domestic feline / cat.
- Non-Feline Animals, Humans, or Objects:
  If the photo depicts any other animal (dog, puppy, ferret, rabbit, bird, etc.), a human, food, vehicle, meme, or inanimate object:
  Set is_cat = False.
  Set overall_score = 0, grade_letter = "F", loaf_rank = "Audit Disqualification: Non-Feline Subject", bread_classification = "Non-Feline Imposter".
  Set paw_tuck.score = 0, tail_tuck.score = 0, elbow_compactness.score = 0, crust_symmetry.score = 0, multi_angle_bonus = 0.
  Set rejection_reason to a witty, polite inspection refusal (e.g. 'Disqualification: Inspector sensors detected a canine imposter rather than an authentic feline loaf!' or 'Disqualification: Subject appears to be a sandwich, not an authentic feline.').
  Set summary_critique to match this refusal.
- Inappropriate or Policy-Breaching Content:
  If the photo contains inappropriate, offensive, explicit, or non-family-friendly content:
  Set is_cat = False, overall_score = 0, grade_letter = "F", loaf_rank = "Audit Disqualification: Policy Infraction", bread_classification = "Rejected".
  Set rejection_reason = 'Disqualification: Uploaded image breaches family-friendly certification guidelines.'
  Set summary_critique = 'Disqualification: Uploaded image breaches family-friendly certification guidelines.'
- Authentic Feline:
  Only if the subject is genuinely a real domestic cat or kitten, set is_cat = True, rejection_reason = None, and proceed with full loaf certification.

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

BEST THUMBNAIL / HERO PORTRAIT SELECTION:
- From all submitted inspection photos, choose the single most photogenic, representative picture to serve as the default Leaderboard Thumbnail.
- Select the clearest, most charming FRONT view or SIDE profile of the cat where facial expression or loaf curvature is highlighted.
- STRICT EXCLUSION: NEVER select a top-down, bird's-eye, or overhead perspective for the default thumbnail (overhead angles lack facial personality and do not make for appealing primary portraits).
- Set best_thumbnail_index to the 0-based index of your selected front or side photo.
- Set angle_classifications to an array of lowercase strings corresponding to each submitted image index ('front', 'side', 'top', or 'other').

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
    angle_types: Optional[str] = Form(None),
    api_key: Optional[str] = Form(None),
    x_gemini_api_key: Optional[str] = Header(None),
    website_url_check: Optional[str] = Form(None)
):
    """Grades uploaded cat photos using Gemini 3.8 Flash Vision."""
    if website_url_check:
        logger.warning("Automated bot submission dropped via honeypot.")
        raise HTTPException(status_code=400, detail="Automated submission blocked.")

    # Resolve available keys to try from request header, form field, or server key pool
    client_supplied_key = api_key or x_gemini_api_key
    keys_to_try = get_ordered_api_keys(custom_key=client_supplied_key)
    
    cat_name = sanitize_cat_name(cat_name)

    # Collect all uploaded files (1 to 5 images), each validated server-side
    submitted_images = [] # list of (label, bytes, mime_type)

    async def add_upload(upload, label):
        if len(submitted_images) >= MAX_IMAGES or not (upload and upload.filename):
            return
        content, mime = await read_and_validate_image(upload)
        if content:
            submitted_images.append((label, content, mime))

    parsed_angles = []
    if angle_types:
        try:
            parsed = json.loads(angle_types)
            if isinstance(parsed, list):
                parsed_angles = [str(a).strip().lower() for a in parsed]
        except Exception:
            pass

    if images:
        for idx, img in enumerate(images):
            ang = parsed_angles[idx] if idx < len(parsed_angles) else "other"
            if ang == "front":
                lbl = "Front View"
            elif ang == "side":
                lbl = "Side View"
            elif ang == "top":
                lbl = "Top (Bird's Eye) View"
            else:
                lbl = f"Inspection Photo {len(submitted_images) + 1}"
            await add_upload(img, lbl)
    else:
        # Fallback for individual named slots if images list was not provided (e.g. presets or legacy)
        if front:
            await add_upload(front, "Front View")
        if side:
            await add_upload(side, "Side View")
        if top:
            await add_upload(top, "Top (Bird's Eye) View")

    if not submitted_images:
        raise HTTPException(status_code=400, detail="Please upload between 1 and 5 cat photos.")

    # If no API key is provided, check if this matches our sample preset or provide demo analysis
    if not keys_to_try:
        logger.info("No Gemini API key supplied. Checking for demo fallback.")
        # If user tested Buttercup sample, return cached analysis with their cat name if provided
        result = dict(PRESET_BUTTERCUP)
        if cat_name:
            result["cat_name"] = cat_name
        demo_hashes = [hashlib.sha256(img[1]).hexdigest() for img in submitted_images]
        demo_image_hash = demo_hashes[0] if demo_hashes else None
        grade_token = generate_grade_token(
            result,
            image_hash=demo_image_hash,
            image_hashes=demo_hashes,
            best_thumbnail_index=0
        )
        return JSONResponse(content={
            "result": result,
            "grade_token": grade_token,
            "best_thumbnail_index": 0,
            "can_submit": True,
            "demo_mode": True,
            "message": "Graded using Demo Calibration Mode. Sample loaf benchmarks are pre-inspected to demonstrate our aerodynamic loaf scoring engine."
        })

    is_server_key = not bool(client_supplied_key)
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
        logger.info(f"Preparing Gemini evaluation for model {target_model} with {len(submitted_images)} images from IP {client_ip} across {len(keys_to_try)} candidate key(s)...")

        safety_settings = [
            types.SafetySetting(
                category=types.HarmCategory.HARM_CATEGORY_HARASSMENT,
                threshold=types.HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
            ),
            types.SafetySetting(
                category=types.HarmCategory.HARM_CATEGORY_HATE_SPEECH,
                threshold=types.HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
            ),
            types.SafetySetting(
                category=types.HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT,
                threshold=types.HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
            ),
            types.SafetySetting(
                category=types.HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
                threshold=types.HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
            ),
        ]

        response = None
        last_api_error = None
        models_to_try = [target_model]
        if target_model != "gemini-3.5-flash-lite":
            models_to_try.append("gemini-3.5-flash-lite")

        # Multi-Key Failover Loop: iterate through available keys in pool
        for key_idx, active_key in enumerate(keys_to_try):
            key_id = active_key[-8:] if len(active_key) >= 8 else "key"
            client = genai.Client(api_key=active_key)
            success_for_key = False

            for attempt, model_candidate in enumerate(models_to_try):
                try:
                    logger.info(f"Attempting Gemini generation using key ...{key_id} (key {key_idx + 1}/{len(keys_to_try)}) on model {model_candidate}...")
                    response = client.models.generate_content(
                        model=model_candidate,
                        contents=contents_parts,
                        config=types.GenerateContentConfig(
                            response_mime_type="application/json",
                            response_schema=LoafAnalysisResult,
                            system_instruction=SYSTEM_PROMPT,
                            safety_settings=safety_settings,
                            temperature=0.3
                        )
                    )
                    success_for_key = True
                    # Clear cooldown entry on success
                    key_exhaustion_tracker.pop(key_id, None)
                    break
                except Exception as attempt_err:
                    err_text = str(attempt_err)
                    last_api_error = attempt_err

                    # 1. 503 UNAVAILABLE on Google side -> retry secondary model on same key
                    if ("503" in err_text or "UNAVAILABLE" in err_text) and attempt < len(models_to_try) - 1:
                        logger.warning(f"Model {model_candidate} is 503 UNAVAILABLE on key ...{key_id}. Retrying model {models_to_try[attempt+1]}...")
                        time.sleep(1.0)
                        continue

                    # 2. 429 Quota Exceeded -> put key on 15-minute cooldown and break to fail over to next key
                    if "RESOURCE_EXHAUSTED" in err_text or "429" in err_text or "quota" in err_text.lower():
                        key_exhaustion_tracker[key_id] = time.time() + 900
                        logger.warning(f"Key ...{key_id} exhausted quota (429). Triggering key pool failover...")
                        break

                    # 3. 403 / Invalid key -> break to fail over to next key
                    if "API_KEY_INVALID" in err_text or "403" in err_text or "unregistered" in err_text:
                        logger.warning(f"Key ...{key_id} rejected (403/invalid).")
                        break

                    # 4. Content policy or 400 Bad Request
                    if "SAFETY" in err_text or "harm" in err_text.lower() or "blocked" in err_text.lower() or "400" in err_text:
                        raise attempt_err

            if success_for_key:
                logger.info(f"Loaf evaluation succeeded with key ...{key_id}.")
                break
            elif key_idx < len(keys_to_try) - 1:
                next_kid = keys_to_try[key_idx + 1][-8:] if len(keys_to_try[key_idx + 1]) >= 8 else "next_key"
                logger.info(f"Failing over from key ...{key_id} to next key ...{next_kid} in pool...")
                continue

        if not response or not response.text:
            if last_api_error:
                raise last_api_error
            raise HTTPException(
                status_code=400,
                detail="The uploaded photo could not be evaluated due to content safety guidelines. Please ensure your photos are family-friendly cat pictures."
            )

        analysis_data = json.loads(response.text)
        is_cat = bool(analysis_data.get("is_cat", True))

        if not is_cat:
            logger.info(f"Loaf inspection disqualified (non-feline or policy). Reason: {analysis_data.get('rejection_reason')}")
            return JSONResponse(content={
                "result": analysis_data,
                "grade_token": None,
                "can_submit": False,
                "demo_mode": False
            })

        all_image_hashes = [hashlib.sha256(img[1]).hexdigest() for img in submitted_images]
        best_idx = analysis_data.get("best_thumbnail_index")
        angle_classes = analysis_data.get("angle_classifications") or []
        
        # Verify best_idx is valid and not an overhead/top view
        if best_idx is not None and 0 <= best_idx < len(submitted_images):
            chosen_cls = angle_classes[best_idx].lower() if best_idx < len(angle_classes) else ""
            if "top" in chosen_cls:
                front_cand = next((i for i, c in enumerate(angle_classes) if "front" in c.lower()), None)
                side_cand = next((i for i, c in enumerate(angle_classes) if "side" in c.lower()), None)
                best_idx = front_cand if front_cand is not None else (side_cand if side_cand is not None else best_idx)
        else:
            front_cand = next((i for i, c in enumerate(angle_classes) if "front" in c.lower()), None)
            side_cand = next((i for i, c in enumerate(angle_classes) if "side" in c.lower()), None)
            best_idx = front_cand if front_cand is not None else (side_cand if side_cand is not None else 0)

        primary_image_hash = all_image_hashes[best_idx] if (all_image_hashes and best_idx < len(all_image_hashes)) else (all_image_hashes[0] if all_image_hashes else None)
        grade_token = generate_grade_token(
            analysis_data,
            image_hash=primary_image_hash,
            image_hashes=all_image_hashes,
            best_thumbnail_index=best_idx
        )
        return JSONResponse(content={
            "result": analysis_data,
            "grade_token": grade_token,
            "best_thumbnail_index": best_idx,
            "can_submit": True,
            "demo_mode": False
        })

    except Exception as e:
        logger.error(f"Gemini API error: {e}", exc_info=True)
        err_str = str(e)
        if "SAFETY" in err_str or "harm" in err_str.lower() or "blocked" in err_str.lower():
            raise HTTPException(
                status_code=400,
                detail="The uploaded photo could not be processed due to content safety guidelines. Please ensure your photos are family-friendly cat pictures."
            )
        elif "API_KEY_INVALID" in err_str or "403" in err_str or "unregistered" in err_str:
            raise HTTPException(
                status_code=503,
                detail="The evaluation service is temporarily unavailable due to scheduled maintenance. Please check back shortly."
            )
        elif "RESOURCE_EXHAUSTED" in err_str or "429" in err_str or "quota" in err_str.lower():
            raise HTTPException(
                status_code=429,
                detail="The bakery ovens are currently at maximum capacity for today. Daily public evaluation slots have been filled. Please check back tomorrow when fresh slots open up, or explore Buttercup's baseline dataset below!"
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
                detail=f"An error occurred during evaluation: {err_str[:200]}"
            )


# Leaderboard & Authentication Endpoints

class TokenExchangeRequest(BaseModel):
    code: str
    redirect_uri: str
    code_verifier: Optional[str] = None


@app.get("/api/auth/config")
async def get_auth_config():
    """Returns public Cognito authentication parameters for the client."""
    return {
        "user_pool_id": COGNITO_USER_POOL_ID,
        "client_id": COGNITO_CLIENT_ID,
        "domain": COGNITO_DOMAIN,
        "region": AWS_REGION
    }


RECENT_SIGNIN_NOTIFICATIONS: Dict[str, float] = {}


def send_google_signin_notification(id_token: str):
    """Dispatches a stylized Google Sign-In security heads-up notification via AWS SES."""
    if not id_token:
        return

    try:
        claims = jwt.decode(id_token, options={"verify_signature": False})
    except Exception as e:
        logger.warning(f"Could not decode id_token for sign-in notification: {e}")
        return

    email = (claims.get("email") or "").strip().lower()
    if not email:
        return

    # Verify if authentication was performed via Google
    is_google = False
    identities = claims.get("identities", [])
    if identities:
        if isinstance(identities, str):
            try:
                identities = json.loads(identities)
            except Exception:
                pass
        if isinstance(identities, list):
            for ident in identities:
                if isinstance(ident, dict) and "google" in str(ident.get("providerName", "")).lower():
                    is_google = True
                    break

    cognito_username = str(claims.get("cognito:username") or claims.get("username", "")).lower()
    if "google" in cognito_username:
        is_google = True

    if not is_google:
        logger.info(f"Sign-in token for {email} is not Google provider; skipping Google security alert.")
        return

    # In-memory sliding window deduplication (15 minutes)
    now = time.time()
    last_notified = RECENT_SIGNIN_NOTIFICATIONS.get(email, 0.0)
    if now - last_notified < 900:
        logger.info(f"Skipping duplicate Google sign-in notification for {email} (notified {int(now - last_notified)}s ago).")
        return

    RECENT_SIGNIN_NOTIFICATIONS[email] = now

    raw_name = claims.get("name") or claims.get("cognito:username") or email.split("@")[0]
    clean_display_name = re.sub(r'[^a-zA-Z0-9\s_\-\.]', '', raw_name).strip()[:30] or "Baker"

    formatted_time = datetime.now(timezone.utc).strftime("%B %d, %Y at %I:%M %p UTC")
    logo_url = "https://loafed.redersoft.com/static/logo.png"
    website_url = "https://loafed.redersoft.com"
    subject = "Loafed AI -- Google Sign-In Security Notice"

    html_body = f"""<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <title>{subject}</title>
  <!--[if mso]>
  <style type="text/css">
    body, table, td {{ font-family: Arial, Helvetica, sans-serif !important; }}
  </style>
  <![endif]-->
  <style type="text/css">
    @media only screen and (max-width: 520px) {{
      .outer-wrapper {{
        padding: 16px 8px 32px 8px !important;
      }}
      .main-card {{
        border-radius: 16px !important;
      }}
      .card-content {{
        padding: 22px 18px 20px 18px !important;
      }}
      .header-table {{
        margin-bottom: 20px !important;
        padding-bottom: 16px !important;
      }}
      .header-left-col {{
        display: block !important;
        width: 100% !important;
      }}
      .header-badge-col {{
        display: block !important;
        width: 100% !important;
        text-align: left !important;
        padding-top: 10px !important;
      }}
      .brand-title {{
        font-size: 20px !important;
      }}
      .brand-sub {{
        font-size: 10.5px !important;
        line-height: 1.35 !important;
      }}
      .heading-title {{
        font-size: 20px !important;
      }}
      .session-table {{
        font-size: 12px !important;
      }}
      .session-label {{
        width: 40% !important;
      }}
      .footer-td {{
        padding: 18px 16px !important;
      }}
    }}
  </style>
</head>
<body style="margin: 0; padding: 0; background-color: #fffaf4; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; color: #292524; -webkit-font-smoothing: antialiased;">
  <div style="display: none; font-size: 1px; color: #fffaf4; line-height: 1px; max-height: 0px; max-width: 0px; opacity: 0; overflow: hidden;">
    Heads up: Your Loafed AI account was just accessed with Google Sign-In on {formatted_time}.
  </div>

  <table width="100%" border="0" cellspacing="0" cellpadding="0" class="outer-wrapper" style="background-color: #fffaf4; padding: 36px 16px 48px 16px;">
    <tr>
      <td align="center">
        <table width="100%" border="0" cellspacing="0" cellpadding="0" class="main-card" style="max-width: 580px; background-color: #ffffff; border: 1px solid #fed7aa; border-radius: 20px; box-shadow: 0 10px 30px -10px rgba(234, 88, 12, 0.12); overflow: hidden;">
          <tr>
            <td height="5" style="background: linear-gradient(90deg, #ea580c 0%, #f97316 50%, #d97706 100%);"></td>
          </tr>
          <tr>
            <td class="card-content" style="padding: 36px 32px 28px 32px;">
              <table width="100%" border="0" cellspacing="0" cellpadding="0" class="header-table" style="margin-bottom: 28px; border-bottom: 1px solid #ffedd5; padding-bottom: 22px;">
                <tr>
                  <td valign="middle" class="header-left-col">
                    <table border="0" cellspacing="0" cellpadding="0">
                      <tr>
                        <td width="52" valign="middle" style="padding-right: 12px;">
                          <a href="{website_url}" target="_blank" style="text-decoration: none; display: block;">
                            <img src="{logo_url}" alt="Loafed AI Mascot" width="48" height="48" class="logo-img" style="display: block; width: 48px; height: 48px; border-radius: 12px; border: 1.5px solid #fed7aa; background-color: #fff7ed; object-fit: contain;" />
                          </a>
                        </td>
                        <td valign="middle">
                          <div class="brand-title" style="font-size: 22px; font-weight: 900; letter-spacing: -0.5px; color: #1c1917; line-height: 1.2;">
                            Loafed<span style="color: #ea580c;">AI</span>
                          </div>
                          <div class="brand-sub" style="font-size: 11px; color: #9a3412; letter-spacing: 0.5px; font-weight: 700; margin-top: 3px; line-height: 1.3;">
                            Feline Posture &amp; Silhouette Certification Bureau
                          </div>
                        </td>
                      </tr>
                    </table>
                  </td>
                  <td align="right" valign="middle" class="header-badge-col">
                    <span style="display: inline-block; padding: 5px 12px; background-color: #ffedd5; border: 1px solid #fed7aa; border-radius: 999px; font-size: 10px; font-weight: 800; color: #9a3412; letter-spacing: 0.8px; text-transform: uppercase; white-space: nowrap;">
                      SECURITY NOTICE
                    </span>
                  </td>
                </tr>
              </table>

              <h1 class="heading-title" style="color: #1c1917; font-size: 22px; font-weight: 900; margin: 0 0 12px 0; line-height: 1.3; letter-spacing: -0.3px;">
                Google Sign-In Detected
              </h1>
              <p style="color: #57534e; font-size: 14px; line-height: 1.6; margin: 0 0 20px 0;">
                Hello Baker <strong>{clean_display_name}</strong>,
              </p>
              <p style="color: #57534e; font-size: 14px; line-height: 1.6; margin: 0 0 24px 0;">
                We wanted to give you a quick heads up that your Loafed AI account was just accessed using Google Sign-In.
              </p>

              <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #fff7ed; border: 1px solid #fed7aa; border-radius: 14px; margin-bottom: 24px;">
                <tr>
                  <td style="padding: 20px;">
                    <div style="font-size: 11px; font-weight: 800; letter-spacing: 1.5px; color: #9a3412; text-transform: uppercase; margin-bottom: 12px;">
                      SESSION DETAILS
                    </div>
                    <table width="100%" border="0" cellspacing="0" cellpadding="0" class="session-table" style="font-size: 13px;">
                      <tr>
                        <td class="session-label" style="color: #78716c; padding-bottom: 8px; width: 35%;">Account:</td>
                        <td style="color: #1c1917; font-weight: 700; padding-bottom: 8px; word-break: break-all;">{email}</td>
                      </tr>
                      <tr>
                        <td class="session-label" style="color: #78716c; padding-bottom: 8px; width: 35%;">Auth Provider:</td>
                        <td style="color: #1c1917; font-weight: 700; padding-bottom: 8px;">Google Single Sign-On</td>
                      </tr>
                      <tr>
                        <td class="session-label" style="color: #78716c; padding-bottom: 8px; width: 35%;">Date &amp; Time:</td>
                        <td style="color: #1c1917; font-weight: 700; padding-bottom: 8px;">{formatted_time}</td>
                      </tr>
                      <tr>
                        <td class="session-label" style="color: #78716c;">Status:</td>
                        <td style="color: #15803d; font-weight: 800;">Authenticated Successfully</td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #fafaf9; border: 1px solid #e7e5e4; border-radius: 12px; margin-bottom: 24px;">
                <tr>
                  <td style="padding: 16px 18px; font-size: 12.5px; color: #57534e; line-height: 1.6;">
                    <strong style="color: #1c1917;">Was this you?</strong> If you just signed in, you can safely disregard this message. You are all set to audit cat loaves, download official certificates, and compete on the leaderboard.<br><br>
                    <strong style="color: #b91c1c;">Did not sign in?</strong> If this was not you, please check your Google account security settings immediately and unlink unauthorized sessions.
                  </td>
                </tr>
              </table>

              <table width="100%" border="0" cellspacing="0" cellpadding="0" style="margin-top: 10px;">
                <tr>
                  <td align="center">
                    <a href="{website_url}" target="_blank" style="display: inline-block; padding: 12px 32px; background-color: #ea580c; color: #ffffff; text-decoration: none; font-size: 13px; font-weight: 800; border-radius: 12px; box-shadow: 0 4px 12px rgba(234, 88, 12, 0.25);">
                      Open Loafed AI
                    </a>
                  </td>
                </tr>
              </table>

            </td>
          </tr>

          <tr>
            <td class="footer-td" style="background-color: #fafaf9; border-top: 1px solid #f5f5f4; padding: 22px 32px; text-align: center;">
              <p style="font-size: 11px; color: #78716c; line-height: 1.6; margin: 0 0 8px 0;">
                <strong>Loafed AI</strong> &bull; An open feline posture appreciation project by <a href="https://redersoft.com" target="_blank" style="color: #ea580c; text-decoration: none; font-weight: 700;">RederSoft</a>
              </p>
              <p style="font-size: 11px; color: #a8a29e; line-height: 1.5; margin: 0;">
                <a href="{website_url}/leaderboard" target="_blank" style="color: #78716c; text-decoration: underline;">Leaderboard</a> &bull;
                <a href="{website_url}" target="_blank" style="color: #78716c; text-decoration: underline;">Audit Loaf</a> &bull;
                <a href="https://redersoft.com" target="_blank" style="color: #78716c; text-decoration: underline;">RederSoft</a>
              </p>
              <p style="font-size: 10px; color: #a8a29e; margin: 8px 0 0 0;">
                &copy; 2026 RederSoft. All rights reserved.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>"""

    text_body = f"""Loafed AI -- Google Sign-In Security Notice

Hello Baker {clean_display_name},

We wanted to give you a quick heads up that your Loafed AI account was just accessed using Google Sign-In.

SESSION DETAILS:
- Account: {email}
- Auth Provider: Google Single Sign-On
- Date & Time: {formatted_time}
- Status: Authenticated Successfully

Was this you?
If you just signed in, you can safely disregard this message. You are all set to audit cat loaves and compete on the leaderboard: {website_url}

Did not sign in?
If this was not you, please check your Google account security settings immediately and unlink unauthorized sessions.

--
Loafed AI - Feline Posture & Silhouette Certification Bureau
An open feline posture appreciation project by RederSoft
https://loafed.redersoft.com
"""

    session = get_boto3_session()
    ses_client = session.client("ses", region_name=AWS_REGION)

    try:
        resp = ses_client.send_email(
            Source="Loafed AI Security <notifications@redersoft.com>",
            Destination={"ToAddresses": [email]},
            Message={
                "Subject": {"Data": subject, "Charset": "UTF-8"},
                "Body": {
                    "Html": {"Data": html_body, "Charset": "UTF-8"},
                    "Text": {"Data": text_body, "Charset": "UTF-8"}
                }
            }
        )
        logger.info(f"Dispatched Google sign-in heads-up email to {email}. MessageId: {resp.get('MessageId')}")
    except ClientError as ce:
        err_msg = ce.response.get("Error", {}).get("Message", str(ce))
        logger.warning(f"Could not send Google sign-in notification to {email} via SES: {err_msg}")
    except Exception as ex:
        logger.warning(f"Unexpected error sending Google sign-in email to {email}: {ex}")


@app.post("/api/auth/token")
async def exchange_auth_code(req: TokenExchangeRequest, background_tasks: BackgroundTasks):
    """Securely proxies authorization code exchange with Cognito Hosted UI."""
    token_url = f"https://{COGNITO_DOMAIN}/oauth2/token"
    payload = {
        "grant_type": "authorization_code",
        "client_id": COGNITO_CLIENT_ID,
        "redirect_uri": req.redirect_uri,
        "code": req.code
    }
    if req.code_verifier:
        payload["code_verifier"] = req.code_verifier

    encoded_data = urllib.parse.urlencode(payload).encode("utf-8")
    http_req = urllib.request.Request(
        token_url,
        data=encoded_data,
        headers={
            "Content-Type": "application/x-www-form-urlencoded",
            "User-Agent": "Loafed-Backend/1.0"
        }
    )
    try:
        with urllib.request.urlopen(http_req, timeout=10) as resp:
            tokens = json.loads(resp.read().decode("utf-8"))
    except urllib.error.HTTPError as e:
        err_body = e.read().decode("utf-8", errors="ignore")
        logger.warning(f"Cognito token exchange failed: {err_body}")
        raise HTTPException(status_code=e.code, detail="Authorization code exchange failed.")
    except Exception as e:
        logger.error(f"Token exchange error: {e}")
        raise HTTPException(status_code=500, detail="Token exchange connection error.")

    # Dispatch Google Sign-In heads-up security notification in background
    id_token = tokens.get("id_token")
    if id_token:
        background_tasks.add_task(send_google_signin_notification, id_token)

    return tokens


# Direct Email / Password Authentication Endpoints (RederSoft Auth Pattern)

class EmailSignInRequest(BaseModel):
    email: str
    password: str


class EmailSignUpRequest(BaseModel):
    email: str
    password: str
    display_name: Optional[str] = None


class EmailConfirmRequest(BaseModel):
    email: str
    code: str
    password: Optional[str] = None


class EmailResendRequest(BaseModel):
    email: str


class ForgotPasswordRequest(BaseModel):
    email: str


class ConfirmForgotPasswordRequest(BaseModel):
    email: str
    code: str
    new_password: str


@app.post("/api/auth/email/signin")
async def email_signin(req: EmailSignInRequest):
    """Direct Cognito email/password authentication (RederSoft in-modal auth pattern)."""
    email = req.email.strip().lower()
    if not email or not req.password:
        raise HTTPException(status_code=400, detail="Email and password are required.")

    session = get_boto3_session()
    client = session.client("cognito-idp", region_name=AWS_REGION)
    try:
        resp = client.initiate_auth(
            ClientId=COGNITO_CLIENT_ID,
            AuthFlow="USER_PASSWORD_AUTH",
            AuthParameters={
                "USERNAME": email,
                "PASSWORD": req.password
            }
        )
        auth_res = resp.get("AuthenticationResult", {})
        return {
            "id_token": auth_res.get("IdToken"),
            "access_token": auth_res.get("AccessToken"),
            "refresh_token": auth_res.get("RefreshToken"),
            "expires_in": auth_res.get("ExpiresIn"),
            "token_type": auth_res.get("TokenType", "Bearer")
        }
    except ClientError as e:
        err_code = e.response.get("Error", {}).get("Code", "")
        err_msg = e.response.get("Error", {}).get("Message", str(e))
        if err_code == "UserNotConfirmedException":
            raise HTTPException(status_code=403, detail="USER_NOT_CONFIRMED: Please verify your email with the 6-digit code.")
        elif err_code in ("NotAuthorizedException", "UserNotFoundException"):
            raise HTTPException(status_code=401, detail="Incorrect email address or password.")
        elif err_code == "PasswordResetRequiredException":
            raise HTTPException(status_code=400, detail="Password reset required. Please use Forgot Password.")
        else:
            raise HTTPException(status_code=400, detail=err_msg)


@app.post("/api/auth/email/signup")
async def email_signup(req: EmailSignUpRequest):
    """Direct Cognito user registration with email verification code dispatch."""
    email = req.email.strip().lower()
    password = req.password

    if not email or not password:
        raise HTTPException(status_code=400, detail="Email and password are required.")
    if len(password) < 8:
        raise HTTPException(status_code=400, detail="Password must be at least 8 characters long.")

    if req.display_name and req.display_name.strip():
        display_name = validate_and_sanitize_name(req.display_name, field_label="Display Name", min_len=2, max_len=30)
    else:
        fallback = re.sub(r'[^a-zA-Z0-9]', '', email.split("@")[0])[:20]
        display_name = fallback if len(fallback) >= 2 else "Baker"

    session = get_boto3_session()
    client = session.client("cognito-idp", region_name=AWS_REGION)
    try:
        user_attrs = [
            {"Name": "email", "Value": email},
            {"Name": "name", "Value": display_name}
        ]
        resp = client.sign_up(
            ClientId=COGNITO_CLIENT_ID,
            Username=email,
            Password=password,
            UserAttributes=user_attrs
        )
        return {
            "user_confirmed": resp.get("UserConfirmed", False),
            "user_sub": resp.get("UserSub"),
            "message": "Account created! Please enter the 6-digit verification code sent to your email."
        }
    except ClientError as e:
        err_code = e.response.get("Error", {}).get("Code", "")
        err_msg = e.response.get("Error", {}).get("Message", str(e))
        if err_code == "UsernameExistsException":
            raise HTTPException(status_code=409, detail="An account with this email already exists. Please sign in.")
        elif err_code == "InvalidPasswordException":
            raise HTTPException(status_code=400, detail=f"Password does not meet requirements: {err_msg}")
        elif err_code == "InvalidParameterException":
            raise HTTPException(status_code=400, detail=err_msg)
        else:
            raise HTTPException(status_code=400, detail=err_msg)


@app.post("/api/auth/email/confirm")
async def email_confirm(req: EmailConfirmRequest):
    """Verifies a newly registered user with their 6-digit confirmation code and logs them in."""
    email = req.email.strip().lower()
    code = req.code.strip()
    if not email or not code:
        raise HTTPException(status_code=400, detail="Email and confirmation code are required.")

    session = get_boto3_session()
    client = session.client("cognito-idp", region_name=AWS_REGION)
    try:
        client.confirm_sign_up(
            ClientId=COGNITO_CLIENT_ID,
            Username=email,
            ConfirmationCode=code
        )
        # Auto sign-in if password was supplied
        if req.password:
            try:
                auth_resp = client.initiate_auth(
                    ClientId=COGNITO_CLIENT_ID,
                    AuthFlow="USER_PASSWORD_AUTH",
                    AuthParameters={
                        "USERNAME": email,
                        "PASSWORD": req.password
                    }
                )
                auth_res = auth_resp.get("AuthenticationResult", {})
                return {
                    "confirmed": True,
                    "id_token": auth_res.get("IdToken"),
                    "access_token": auth_res.get("AccessToken"),
                    "refresh_token": auth_res.get("RefreshToken"),
                    "expires_in": auth_res.get("ExpiresIn"),
                    "token_type": auth_res.get("TokenType", "Bearer")
                }
            except Exception as login_err:
                logger.warning(f"Auto-login after confirmation failed: {login_err}")

        return {"confirmed": True, "message": "Email confirmed successfully! You can now sign in."}
    except ClientError as e:
        err_code = e.response.get("Error", {}).get("Code", "")
        err_msg = e.response.get("Error", {}).get("Message", str(e))
        if err_code == "CodeMismatchException":
            raise HTTPException(status_code=400, detail="Invalid verification code. Please check your email and try again.")
        elif err_code == "ExpiredCodeException":
            raise HTTPException(status_code=400, detail="Verification code has expired. Please request a new code.")
        elif err_code == "NotAuthorizedException":
            return {"confirmed": True, "message": "User is already confirmed. Please sign in."}
        else:
            raise HTTPException(status_code=400, detail=err_msg)


@app.post("/api/auth/email/resend-code")
async def email_resend_code(req: EmailResendRequest):
    """Resends a 6-digit confirmation code to unconfirmed user."""
    email = req.email.strip().lower()
    if not email:
        raise HTTPException(status_code=400, detail="Email is required.")
    session = get_boto3_session()
    client = session.client("cognito-idp", region_name=AWS_REGION)
    try:
        client.resend_confirmation_code(
            ClientId=COGNITO_CLIENT_ID,
            Username=email
        )
        return {"status": "code_resent", "message": "A fresh 6-digit verification code has been emailed to you."}
    except ClientError as e:
        err_msg = e.response.get("Error", {}).get("Message", str(e))
        raise HTTPException(status_code=400, detail=err_msg)


@app.post("/api/auth/email/forgot-password")
async def email_forgot_password(req: ForgotPasswordRequest):
    """Initiates password reset by sending a reset code to the user's email."""
    email = req.email.strip().lower()
    if not email:
        raise HTTPException(status_code=400, detail="Email is required.")
    session = get_boto3_session()
    client = session.client("cognito-idp", region_name=AWS_REGION)
    try:
        client.forgot_password(
            ClientId=COGNITO_CLIENT_ID,
            Username=email
        )
        return {"status": "reset_code_sent", "message": "Password reset code sent to your email."}
    except ClientError as e:
        err_code = e.response.get("Error", {}).get("Code", "")
        if err_code == "UserNotFoundException":
            return {"status": "reset_code_sent", "message": "If an account exists with this email, a reset code was sent."}
        err_msg = e.response.get("Error", {}).get("Message", str(e))
        raise HTTPException(status_code=400, detail=err_msg)


@app.post("/api/auth/email/confirm-forgot-password")
async def email_confirm_forgot_password(req: ConfirmForgotPasswordRequest):
    """Confirms password reset with verification code and sets the new password."""
    email = req.email.strip().lower()
    code = req.code.strip()
    new_password = req.new_password
    if not email or not code or not new_password:
        raise HTTPException(status_code=400, detail="Email, code, and new password are required.")
    if len(new_password) < 8:
        raise HTTPException(status_code=400, detail="New password must be at least 8 characters long.")

    session = get_boto3_session()
    client = session.client("cognito-idp", region_name=AWS_REGION)
    try:
        client.confirm_forgot_password(
            ClientId=COGNITO_CLIENT_ID,
            Username=email,
            ConfirmationCode=code,
            Password=new_password
        )
        try:
            auth_resp = client.initiate_auth(
                ClientId=COGNITO_CLIENT_ID,
                AuthFlow="USER_PASSWORD_AUTH",
                AuthParameters={
                    "USERNAME": email,
                    "PASSWORD": new_password
                }
            )
            auth_res = auth_resp.get("AuthenticationResult", {})
            return {
                "reset": True,
                "id_token": auth_res.get("IdToken"),
                "access_token": auth_res.get("AccessToken"),
                "refresh_token": auth_res.get("RefreshToken"),
                "expires_in": auth_res.get("ExpiresIn"),
                "token_type": auth_res.get("TokenType", "Bearer")
            }
        except Exception:
            return {"reset": True, "message": "Password updated successfully! Please sign in."}
    except ClientError as e:
        err_code = e.response.get("Error", {}).get("Code", "")
        err_msg = e.response.get("Error", {}).get("Message", str(e))
        if err_code == "CodeMismatchException":
            raise HTTPException(status_code=400, detail="Invalid verification code. Please check your email.")
        elif err_code == "ExpiredCodeException":
            raise HTTPException(status_code=400, detail="Verification code has expired. Please request a new code.")
        else:
            raise HTTPException(status_code=400, detail=err_msg)


@app.post("/api/leaderboard/submit")
async def submit_to_leaderboard(
    authorization: Optional[str] = Header(None),
    grade_token: str = Form(...),
    cat_name: Optional[str] = Form(None),
    display_name: Optional[str] = Form(None),
    photo: Optional[UploadFile] = File(None),
    photos: Optional[List[UploadFile]] = File(None),
    photo_labels: Optional[str] = Form(None),
    primary_photo_index: Optional[int] = Form(0)
):
    """Submits a verified cat loaf evaluation to the public leaderboard with all submitted inspection angles."""
    user_claims = verify_cognito_token(authorization)
    user_id = user_claims.get("sub")
    if not user_id:
        raise HTTPException(status_code=401, detail="User identification missing.")

    # Validate HMAC score token
    score_data = verify_grade_token(grade_token)

    # Validate and sanitize required Cat's Name and Baker Display Name
    raw_cat_name = (cat_name or "").strip() or score_data.get("cat_name")
    validated_cat_name = validate_and_sanitize_name(
        raw_cat_name,
        field_label="Cat's Name",
        min_len=2,
        max_len=40
    )

    raw_display_name = (display_name or "").strip() or user_claims.get("name") or (
        user_claims.get("email", "").split("@")[0] if user_claims.get("email") else None
    )
    validated_display_name = validate_and_sanitize_name(
        raw_display_name,
        field_label="Baker Display Name",
        min_len=2,
        max_len=30
    )

    # Collect and validate uploaded photos (accepts multiple angle files or single legacy photo)
    raw_uploads = []
    if photos:
        raw_uploads = [p for p in photos if p and p.filename]
    if not raw_uploads and photo and photo.filename:
        raw_uploads = [photo]

    if not raw_uploads:
        raise HTTPException(status_code=400, detail="A valid photo is required for leaderboard submission.")

    validated_images = []
    for f in raw_uploads[:5]:
        content, mime = await read_and_validate_image(f)
        if content:
            validated_images.append((content, mime))

    if not validated_images:
        raise HTTPException(status_code=400, detail="Could not process submitted photo files. Please ensure valid JPEG, PNG, or WebP.")

    # Cryptographic Image Binding check: confirm uploaded photos match audited photo hashes
    allowed_hashes = set()
    if score_data.get("image_sha256"):
        allowed_hashes.add(score_data["image_sha256"])
    if score_data.get("image_hashes"):
        allowed_hashes.update(score_data["image_hashes"])

    uploaded_hashes = [hashlib.sha256(c).hexdigest() for c, _ in validated_images]
    if allowed_hashes and not any(h in allowed_hashes for h in uploaded_hashes):
        logger.warning(
            f"Image hash mismatch on leaderboard submission! Allowed: {allowed_hashes}, Uploaded: {uploaded_hashes}"
        )
        raise HTTPException(
            status_code=400,
            detail="The uploaded photo does not match the image certified during grading. Please submit the exact photo that was inspected."
        )

    # Parse angle labels
    labels = []
    if photo_labels:
        try:
            parsed = json.loads(photo_labels)
            if isinstance(parsed, list):
                labels = [str(lbl).strip() for lbl in parsed]
        except Exception:
            pass
    while len(labels) < len(validated_images):
        idx = len(labels)
        labels.append("Front View" if idx == 0 else ("Side View" if idx == 1 else ("Overhead (Top) View" if idx == 2 else f"Angle {idx + 1}")))

    # Select primary thumbnail index (Best front or side, NOT top)
    chosen_idx = int(primary_photo_index) if (primary_photo_index is not None and 0 <= int(primary_photo_index) < len(validated_images)) else 0
    chosen_lbl = labels[chosen_idx].lower()
    if "top" in chosen_lbl or "overhead" in chosen_lbl or "dorsal" in chosen_lbl:
        # Avoid top view for default thumbnail if a front or side view is present
        best_alt = next((i for i, lbl in enumerate(labels) if "front" in lbl.lower()), None)
        if best_alt is None:
            best_alt = next((i for i, lbl in enumerate(labels) if "side" in lbl.lower()), None)
        if best_alt is None:
            best_alt = next((i for i, lbl in enumerate(labels) if "top" not in lbl.lower() and "overhead" not in lbl.lower()), None)
        if best_alt is not None:
            chosen_idx = best_alt

    entry_id = uuid.uuid4().hex[:12]
    session = get_boto3_session()
    s3_client = session.client("s3")

    # 1. Upload primary hero thumbnail (WebP, under 40 KB)
    primary_content, _ = validated_images[chosen_idx]
    primary_thumb_bytes = create_leaderboard_thumbnail(primary_content)
    thumb_key = f"thumbnails/{entry_id}.webp"
    try:
        s3_client.put_object(
            Bucket=S3_BUCKET_NAME,
            Key=thumb_key,
            Body=primary_thumb_bytes,
            ContentType="image/webp"
        )
    except Exception as e:
        logger.error(f"S3 primary thumbnail upload error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Failed to save cat loaf photo to cloud storage.")

    thumbnail_url = f"https://{S3_BUCKET_NAME}.s3.amazonaws.com/{thumb_key}"

    # 2. Upload all individual angle photos
    angles = []
    for idx, (img_content, _) in enumerate(validated_images):
        angle_key = f"thumbnails/{entry_id}_angle_{idx}.webp"
        angle_bytes = create_leaderboard_thumbnail(img_content)
        try:
            s3_client.put_object(
                Bucket=S3_BUCKET_NAME,
                Key=angle_key,
                Body=angle_bytes,
                ContentType="image/webp"
            )
            angle_url = f"https://{S3_BUCKET_NAME}.s3.amazonaws.com/{angle_key}"
        except Exception as e:
            logger.warning(f"S3 angle upload error for {angle_key}: {e}")
            angle_url = thumbnail_url
        angles.append({
            "label": labels[idx],
            "url": angle_url
        })

    photo_urls = [a["url"] for a in angles]

    now = datetime.now(timezone.utc)
    now_iso = now.isoformat()
    month_str = now.strftime("%Y-%m")
    week_str = now.strftime("%Y-W%W")

    score = int(score_data.get("overall_score", 0))
    sk = f"SCORE#{score:03d}#{entry_id}"

    ddb = session.resource("dynamodb")
    table = ddb.Table(DYNAMODB_TABLE_NAME)

    raw_drag = score_data.get("drag_coefficient")
    try:
        drag_coeff_val = Decimal(str(round(float(raw_drag if raw_drag is not None else 0.15), 3)))
    except Exception:
        drag_coeff_val = Decimal("0.15")

    item_all = {
        "pk": "PERIOD#ALL",
        "sk": sk,
        "entry_id": entry_id,
        "user_id": user_id,
        "user_email": user_claims.get("email", ""),
        "display_name": validated_display_name,
        "cat_name": validated_cat_name,
        "overall_score": score,
        "grade_letter": score_data.get("grade_letter", ""),
        "loaf_rank": score_data.get("loaf_rank", ""),
        "bread_classification": score_data.get("bread_classification", ""),
        "thumbnail_url": thumbnail_url,
        "angles": angles,
        "photo_urls": photo_urls,
        "angle_notes": score_data.get("angle_notes", {}),
        "created_at": now_iso,
        "periods": ["ALL", month_str, week_str],
        "report_count": 0,
        "is_hidden": False,
        "summary_critique": score_data.get("summary_critique", ""),
        "paw_tuck": score_data.get("paw_tuck", {}),
        "tail_tuck": score_data.get("tail_tuck", {}),
        "elbow_compactness": score_data.get("elbow_compactness", {}),
        "crust_symmetry": score_data.get("crust_symmetry", {}),
        "drag_coefficient": drag_coeff_val,
        "badges": score_data.get("badges", []),
        "fun_tips_for_cat": score_data.get("fun_tips_for_cat", []),
        "oar_detected": bool(score_data.get("oar_detected", False)),
        "face_loaf": bool(score_data.get("face_loaf", False)),
        "multi_angle_bonus": int(score_data.get("multi_angle_bonus", 0))
    }

    item_month = dict(item_all)
    item_month["pk"] = f"PERIOD#{month_str}"
    item_month.pop("user_id", None)

    item_week = dict(item_all)
    item_week["pk"] = f"PERIOD#{week_str}"
    item_week.pop("user_id", None)

    item_entry = dict(item_all)
    item_entry["pk"] = f"ENTRY#{entry_id}"
    item_entry["sk"] = "METADATA"

    try:
        table.put_item(Item=item_all)
        table.put_item(Item=item_month)
        table.put_item(Item=item_week)
        table.put_item(Item=item_entry)
    except Exception as e:
        logger.error(f"DynamoDB write error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Failed to save leaderboard record.")

    return {
        "success": True,
        "entry_id": entry_id,
        "score": score,
        "thumbnail_url": thumbnail_url,
        "angles": angles,
        "cat_name": validated_cat_name,
        "display_name": validated_display_name,
        "message": f"Successfully added {validated_cat_name} to the Loafed Leaderboard!"
    }


@app.get("/api/leaderboard")
async def get_leaderboard(period: str = "all", limit: int = 50):
    """Retrieves leaderboard rankings sorted by overall score descending."""
    limit = min(max(1, limit), 100)
    now = datetime.now(timezone.utc)

    if period == "month":
        pk = f"PERIOD#{now.strftime('%Y-%m')}"
    elif period == "week":
        pk = f"PERIOD#{now.strftime('%Y-W%W')}"
    else:
        pk = "PERIOD#ALL"

    session = get_boto3_session()
    ddb = session.resource("dynamodb")
    table = ddb.Table(DYNAMODB_TABLE_NAME)

    try:
        response = table.query(
            KeyConditionExpression=Key("pk").eq(pk),
            FilterExpression=Attr("is_hidden").ne(True),
            ScanIndexForward=False,
            Limit=limit
        )
        raw_items = response.get("Items", [])
    except Exception as e:
        logger.error(f"DynamoDB query error: {e}", exc_info=True)
        raw_items = []

    entries = []
    for rank, it in enumerate(raw_items, start=1):
        if it.get("is_hidden") is True or int(it.get("report_count", 0)) >= 3:
            continue
        entries.append({
            "rank": rank,
            "entry_id": it.get("entry_id", ""),
            "cat_name": it.get("cat_name", "Anonymous Loaf"),
            "display_name": it.get("display_name", "Anonymous Baker"),
            "overall_score": int(it.get("overall_score", 0)),
            "grade_letter": it.get("grade_letter", ""),
            "loaf_rank": it.get("loaf_rank", ""),
            "bread_classification": it.get("bread_classification", ""),
            "thumbnail_url": it.get("thumbnail_url", ""),
            "created_at": it.get("created_at", "")
        })

    return {
        "period": period,
        "count": len(entries),
        "entries": entries
    }


@app.get("/api/loaf/{entry_id}")
async def get_loaf_details(entry_id: str):
    """Retrieves full audit scorecard and observation critique for a specific cat loaf."""
    entry_id = entry_id.strip()
    if not entry_id or not re.match(r'^[a-zA-Z0-9_\-]+$', entry_id):
        raise HTTPException(status_code=400, detail="Invalid loaf identifier.")

    session = get_boto3_session()
    ddb = session.resource("dynamodb")
    table = ddb.Table(DYNAMODB_TABLE_NAME)

    item = None
    # 1. Direct O(1) key lookup
    try:
        res = table.get_item(Key={"pk": f"ENTRY#{entry_id}", "sk": "METADATA"})
        item = res.get("Item")
    except Exception as e:
        logger.warning(f"DynamoDB get_item error for ENTRY#{entry_id}: {e}")

    # 2. Query fallback on PERIOD#ALL
    if not item:
        try:
            res = table.query(
                KeyConditionExpression=Key("pk").eq("PERIOD#ALL"),
                FilterExpression=Attr("entry_id").eq(entry_id)
            )
            items = res.get("Items", [])
            if items:
                item = items[0]
        except Exception as e:
            logger.warning(f"DynamoDB query fallback error for {entry_id}: {e}")

    # 3. Table scan fallback for legacy items
    if not item:
        try:
            res = table.scan(
                FilterExpression=Attr("entry_id").eq(entry_id)
            )
            items = res.get("Items", [])
            if items:
                item = items[0]
        except Exception as e:
            logger.warning(f"DynamoDB scan fallback error for {entry_id}: {e}")

    if not item or item.get("is_hidden") is True or int(item.get("report_count", 0)) >= 3:
        raise HTTPException(status_code=404, detail="Cat loaf not found or has been removed.")

    # Match benchmark presets if applicable
    preset_data = {}
    if entry_id == "hof_buttercup":
        preset_data = PRESET_BUTTERCUP
    elif entry_id == "hof_chonks":
        preset_data = PRESET_CHONKS
    elif entry_id == "hof_flash":
        preset_data = PRESET_FLASH

    overall_score = int(item.get("overall_score", 0))
    cat_name = item.get("cat_name") or preset_data.get("cat_name", "Anonymous Loaf")
    display_name = item.get("display_name", "Anonymous Baker")
    grade_letter = item.get("grade_letter") or preset_data.get("grade_letter", "B")
    loaf_rank = item.get("loaf_rank") or preset_data.get("loaf_rank", "Certified Artisan Loaf")
    bread_class = item.get("bread_classification") or preset_data.get("bread_classification", "Golden Brioche")
    thumb = item.get("thumbnail_url", "")
    created_at = item.get("created_at", "")

    summary_critique = item.get("summary_critique") or preset_data.get("summary_critique")
    if not summary_critique:
        summary_critique = f"{cat_name} demonstrates authentic domestic feline bakery curvature with commendable perimeter compacting and a distinguished {bread_class} rise."

    paw_tuck = item.get("paw_tuck") or preset_data.get("paw_tuck")
    if not paw_tuck:
        pt_score = min(25, max(15, overall_score // 4))
        paw_tuck = {
            "score": pt_score,
            "status": "Commendable Paw Concealment",
            "critique": "Undercarriage perimeter is firmly tucked with minimal paw flaring.",
            "observations": ["Paws withdrawn beneath chest silhouette", "Solid base perimeter"]
        }

    tail_tuck = item.get("tail_tuck") or preset_data.get("tail_tuck")
    if not tail_tuck:
        tt_score = min(25, max(15, (overall_score + 2) // 4))
        tail_tuck = {
            "score": tt_score,
            "status": "Flush Flank Contour",
            "critique": "Tail wraps cleanly along flank line minimizing aerodynamic drag.",
            "observations": ["Tail follows natural lateral curvature", "Flush haunch tuck"]
        }

    elbow_compactness = item.get("elbow_compactness") or preset_data.get("elbow_compactness")
    if not elbow_compactness:
        ec_score = min(25, max(15, (overall_score - 1) // 4))
        elbow_compactness = {
            "score": ec_score,
            "status": "Compact Dough Form",
            "critique": "Elbow joints are compressed inwards to form a tight, aerodynamic loaf silhouette.",
            "observations": ["Zero significant wing protrusion", "Stable dough density"]
        }

    crust_symmetry = item.get("crust_symmetry") or preset_data.get("crust_symmetry")
    if not crust_symmetry:
        cs_score = min(25, max(10, overall_score - (paw_tuck.get('score', 20) + tail_tuck.get('score', 20) + elbow_compactness.get('score', 20))))
        crust_symmetry = {
            "score": cs_score,
            "status": "Balanced Crust Toastiness",
            "critique": "Coat toastiness is uniform across dorsal spine with pleasing bilateral symmetry.",
            "observations": ["Bilateral spinal alignment", "Even coat toast distribution"]
        }

    drag_coeff = item.get("drag_coefficient")
    if drag_coeff is None:
        drag_coeff = preset_data.get("drag_coefficient", 0.12)
    else:
        try:
            drag_coeff = float(drag_coeff)
        except Exception:
            drag_coeff = 0.12

    badges = item.get("badges") or preset_data.get("badges") or [
        "Certified Feline Loaf",
        "Official Bureau Audit",
        f"{bread_class} Silhouette"
    ]

    tips = item.get("fun_tips_for_cat") or preset_data.get("fun_tips_for_cat") or [
        "Maintain optimal hydration for crust sheen.",
        "Practice daily dough rising on warm surfaces."
    ]

    angles = item.get("angles")
    if not angles:
        if item.get("photo_urls"):
            angles = [{"label": f"Perspective {i+1}", "url": u} for i, u in enumerate(item.get("photo_urls"))]
        elif preset_data.get("angles"):
            angles = preset_data.get("angles")
        elif thumb:
            angles = [{"label": "Front/Side Portrait", "url": thumb}]
        else:
            angles = []

    photo_urls = item.get("photo_urls") or [a["url"] for a in angles]
    user_id = item.get("user_id")

    return {
        "entry_id": entry_id,
        "user_id": user_id,
        "cat_name": cat_name,
        "display_name": display_name,
        "overall_score": overall_score,
        "grade_letter": grade_letter,
        "loaf_rank": loaf_rank,
        "bread_classification": bread_class,
        "thumbnail_url": thumb,
        "angles": angles,
        "photo_urls": photo_urls,
        "angle_notes": item.get("angle_notes") or preset_data.get("angle_notes", {}),
        "created_at": created_at,
        "summary_critique": summary_critique,
        "paw_tuck": paw_tuck,
        "tail_tuck": tail_tuck,
        "elbow_compactness": elbow_compactness,
        "crust_symmetry": crust_symmetry,
        "drag_coefficient": drag_coeff,
        "badges": badges,
        "fun_tips_for_cat": tips,
        "oar_detected": bool(item.get("oar_detected", preset_data.get("oar_detected", False))),
        "face_loaf": bool(item.get("face_loaf", preset_data.get("face_loaf", False))),
        "multi_angle_bonus": int(item.get("multi_angle_bonus", preset_data.get("multi_angle_bonus", 0)))
    }


class LeaderboardReportRequest(BaseModel):
    entry_id: str
    score: Optional[int] = None
    reason: Optional[str] = None


@app.post("/api/leaderboard/report")
async def report_leaderboard_entry(
    request: Request,
    req: LeaderboardReportRequest,
    authorization: Optional[str] = Header(None)
):
    """Allows users to report an inappropriate or non-cat submission.
    Automatically hides entries that receive 3 or more community reports."""
    entry_id = req.entry_id.strip()
    if not entry_id:
        raise HTTPException(status_code=400, detail="Entry ID is required.")

    client_ip = get_client_ip(request)
    session = get_boto3_session()
    ddb = session.resource("dynamodb")
    table = ddb.Table(DYNAMODB_TABLE_NAME)

    matching_item = None
    if req.score is not None:
        sk = f"SCORE#{req.score:03d}#{entry_id}"
        resp = table.get_item(Key={"pk": "PERIOD#ALL", "sk": sk})
        matching_item = resp.get("Item")

    if not matching_item:
        resp = table.query(
            KeyConditionExpression=Key("pk").eq("PERIOD#ALL"),
            FilterExpression=Attr("entry_id").eq(entry_id)
        )
        items = resp.get("Items", [])
        if items:
            matching_item = items[0]

    if not matching_item:
        raise HTTPException(status_code=404, detail="Leaderboard entry not found.")

    score = int(matching_item.get("overall_score", 0))
    sk = f"SCORE#{score:03d}#{entry_id}"
    periods = matching_item.get("periods", ["ALL"])
    current_reports = int(matching_item.get("report_count", 0)) + 1
    should_hide = current_reports >= 3

    for p in periods:
        pk = "PERIOD#ALL" if p == "ALL" else f"PERIOD#{p}"
        try:
            table.update_item(
                Key={"pk": pk, "sk": sk},
                UpdateExpression="SET report_count = :rc, is_hidden = :hid",
                ExpressionAttributeValues={
                    ":rc": current_reports,
                    ":hid": should_hide
                }
            )
        except Exception as e:
            logger.warning(f"Error updating report count on {pk}/{sk}: {e}")

    logger.info(f"Entry {entry_id} reported by IP {client_ip}. Total reports: {current_reports}. Hidden: {should_hide}")
    return {
        "success": True,
        "entry_id": entry_id,
        "report_count": current_reports,
        "is_hidden": should_hide,
        "message": "Thank you for reporting. Our moderation system has recorded your report."
    }


class AdminRemoveRequest(BaseModel):
    entry_id: str
    admin_key: str
    score: Optional[int] = None


@app.post("/api/admin/leaderboard/remove")
async def admin_remove_entry(req: AdminRemoveRequest):
    """Admin endpoint to forcefully purge an offensive submission from DynamoDB and S3."""
    expected_secret = os.getenv("ADMIN_SECRET", SIGNATURE_SECRET)
    if not req.admin_key or not hmac.compare_digest(req.admin_key, expected_secret):
        raise HTTPException(status_code=403, detail="Unauthorized admin access.")

    entry_id = req.entry_id.strip()
    session = get_boto3_session()
    ddb = session.resource("dynamodb")
    table = ddb.Table(DYNAMODB_TABLE_NAME)
    s3_client = session.client("s3")

    matching_item = None
    if req.score is not None:
        sk = f"SCORE#{req.score:03d}#{entry_id}"
        resp = table.get_item(Key={"pk": "PERIOD#ALL", "sk": sk})
        matching_item = resp.get("Item")

    if not matching_item:
        resp = table.query(
            KeyConditionExpression=Key("pk").eq("PERIOD#ALL"),
            FilterExpression=Attr("entry_id").eq(entry_id)
        )
        items = resp.get("Items", [])
        if items:
            matching_item = items[0]

    if not matching_item:
        raise HTTPException(status_code=404, detail="Entry not found in DynamoDB.")

    score = int(matching_item.get("overall_score", 0))
    sk = f"SCORE#{score:03d}#{entry_id}"
    periods = matching_item.get("periods", ["ALL"])

    for p in periods:
        pk = "PERIOD#ALL" if p == "ALL" else f"PERIOD#{p}"
        try:
            table.delete_item(Key={"pk": pk, "sk": sk})
        except Exception as e:
            logger.warning(f"Admin delete item error {pk}/{sk}: {e}")

    try:
        table.delete_item(Key={"pk": f"ENTRY#{entry_id}", "sk": "METADATA"})
    except Exception as e:
        logger.warning(f"Admin delete entry lookup error ENTRY#{entry_id}: {e}")

    try:
        s3_res = s3_client.list_objects_v2(Bucket=S3_BUCKET_NAME, Prefix=f"thumbnails/{entry_id}")
        for s3_obj in s3_res.get("Contents", []):
            s3_client.delete_object(Bucket=S3_BUCKET_NAME, Key=s3_obj["Key"])
    except Exception as e:
        logger.warning(f"Admin delete S3 thumbnail error for {entry_id}: {e}")

    logger.info(f"Admin successfully purged entry {entry_id} and its thumbnail.")
    return {"success": True, "purged_id": entry_id, "message": "Entry purged from leaderboard and S3."}


@app.get("/api/leaderboard/my-entries")
async def get_my_entries(authorization: Optional[str] = Header(None)):
    """Retrieves all leaderboard submissions created by the authenticated user."""
    user_claims = verify_cognito_token(authorization)
    user_id = user_claims.get("sub")
    if not user_id:
        raise HTTPException(status_code=401, detail="User identification missing.")

    session = get_boto3_session()
    ddb = session.resource("dynamodb")
    table = ddb.Table(DYNAMODB_TABLE_NAME)

    try:
        response = table.query(
            IndexName="UserIndex",
            KeyConditionExpression=Key("user_id").eq(user_id),
            ScanIndexForward=False
        )
        items = response.get("Items", [])
    except Exception as e:
        logger.error(f"DynamoDB UserIndex query error: {e}", exc_info=True)
        items = []

    entries = []
    for it in items:
        entries.append({
            "entry_id": it.get("entry_id", ""),
            "cat_name": it.get("cat_name", "Anonymous Loaf"),
            "display_name": it.get("display_name", ""),
            "overall_score": int(it.get("overall_score", 0)),
            "grade_letter": it.get("grade_letter", ""),
            "loaf_rank": it.get("loaf_rank", ""),
            "bread_classification": it.get("bread_classification", ""),
            "thumbnail_url": it.get("thumbnail_url", ""),
            "created_at": it.get("created_at", "")
        })
    return {"entries": entries, "count": len(entries)}


@app.delete("/api/leaderboard/entry/{entry_id}")
async def delete_leaderboard_entry(entry_id: str, authorization: Optional[str] = Header(None)):
    """Deletes an individual loaf submission owned by the authenticated user."""
    user_claims = verify_cognito_token(authorization)
    user_id = user_claims.get("sub")
    if not user_id:
        raise HTTPException(status_code=401, detail="User identification missing.")

    session = get_boto3_session()
    ddb = session.resource("dynamodb")
    table = ddb.Table(DYNAMODB_TABLE_NAME)
    s3_client = session.client("s3")

    res = table.query(
        IndexName="UserIndex",
        KeyConditionExpression=Key("user_id").eq(user_id)
    )
    matching_item = next((it for it in res.get("Items", []) if it.get("entry_id") == entry_id), None)
    if not matching_item:
        raise HTTPException(status_code=404, detail="Entry not found or you are not authorized to delete it.")

    score = int(matching_item.get("overall_score", 0))
    sk = f"SCORE#{score:03d}#{entry_id}"
    periods = matching_item.get("periods", ["ALL"])

    for p in periods:
        pk = "PERIOD#ALL" if p == "ALL" else f"PERIOD#{p}"
        try:
            table.delete_item(Key={"pk": pk, "sk": sk})
        except Exception as e:
            logger.warning(f"Error deleting item {pk}/{sk}: {e}")

    try:
        table.delete_item(Key={"pk": f"ENTRY#{entry_id}", "sk": "METADATA"})
    except Exception as e:
        logger.warning(f"Error deleting entry lookup item ENTRY#{entry_id}: {e}")

    try:
        s3_res = s3_client.list_objects_v2(Bucket=S3_BUCKET_NAME, Prefix=f"thumbnails/{entry_id}")
        for s3_obj in s3_res.get("Contents", []):
            s3_client.delete_object(Bucket=S3_BUCKET_NAME, Key=s3_obj["Key"])
    except Exception as e:
        logger.warning(f"Error deleting S3 thumbnails for {entry_id}: {e}")

    return {"success": True, "deleted_id": entry_id, "message": "Leaderboard entry removed."}


class UpdateProfileRequest(BaseModel):
    display_name: str


@app.get("/api/user/profile")
async def get_user_profile(authorization: Optional[str] = Header(None)):
    """Returns profile details for the authenticated Baker."""
    user_claims = verify_cognito_token(authorization)
    user_id = user_claims.get("sub")
    if not user_id:
        raise HTTPException(status_code=401, detail="User identification missing.")

    email = user_claims.get("email", "")
    name = user_claims.get("name") or user_claims.get("cognito:username") or (email.split("@")[0] if email else "Baker")

    identities = user_claims.get("identities", [])
    auth_provider = "Email & Password"
    if identities:
        try:
            if isinstance(identities, str):
                identities = json.loads(identities)
            if isinstance(identities, list) and len(identities) > 0:
                provider_name = identities[0].get("providerName", "")
                if "Google" in provider_name:
                    auth_provider = "Google Sign-In"
        except Exception:
            pass
    elif "google" in str(user_claims.get("cognito:username", "")).lower():
        auth_provider = "Google Sign-In"

    return {
        "user_id": user_id,
        "email": email,
        "display_name": name,
        "auth_provider": auth_provider
    }


@app.patch("/api/user/profile")
async def update_user_profile(
    req: UpdateProfileRequest,
    authorization: Optional[str] = Header(None)
):
    """Updates the Baker display name for the authenticated user in Cognito and DynamoDB."""
    user_claims = verify_cognito_token(authorization)
    user_id = user_claims.get("sub")
    if not user_id:
        raise HTTPException(status_code=401, detail="User identification missing.")

    # Validate and sanitize display name with content safety & profanity filters
    clean_name = validate_name(req.display_name, field_label="Baker display name")

    session = get_boto3_session()
    cognito_client = session.client("cognito-idp")
    ddb = session.resource("dynamodb")
    table = ddb.Table(DYNAMODB_TABLE_NAME)

    username = user_claims.get("cognito:username") or user_claims.get("username") or user_id

    # 1. Update in Cognito User Pool
    try:
        cognito_client.admin_update_user_attributes(
            UserPoolId=COGNITO_USER_POOL_ID,
            Username=username,
            UserAttributes=[{"Name": "name", "Value": clean_name}]
        )
    except Exception as e:
        logger.error(f"Error updating Cognito user attributes for {username}: {e}")
        try:
            cognito_client.admin_update_user_attributes(
                UserPoolId=COGNITO_USER_POOL_ID,
                Username=user_id,
                UserAttributes=[{"Name": "name", "Value": clean_name}]
            )
        except Exception as e2:
            logger.error(f"Failed fallback Cognito update for {user_id}: {e2}")
            raise HTTPException(status_code=500, detail="Failed to update profile name in authentication directory.")

    # 2. Update existing submissions in DynamoDB so all leaderboard loaves reflect the new display name
    try:
        res = table.query(
            IndexName="UserIndex",
            KeyConditionExpression=Key("user_id").eq(user_id)
        )
        user_entries = res.get("Items", [])
        for item in user_entries:
            entry_id = item.get("entry_id")
            score = int(item.get("overall_score", 0))
            sk = f"SCORE#{score:03d}#{entry_id}"
            periods = item.get("periods", ["ALL"])
            for p in periods:
                pk = "PERIOD#ALL" if p == "ALL" else f"PERIOD#{p}"
                try:
                    table.update_item(
                        Key={"pk": pk, "sk": sk},
                        UpdateExpression="SET display_name = :dn",
                        ExpressionAttributeValues={":dn": clean_name}
                    )
                except Exception as update_err:
                    logger.warning(f"Error updating display_name on {pk}/{sk}: {update_err}")
    except Exception as ddb_err:
        logger.warning(f"Could not batch update display_name on DynamoDB entries for user {user_id}: {ddb_err}")

    logger.info(f"User {user_id} ({username}) updated Baker display name to '{clean_name}'.")
    return {
        "success": True,
        "display_name": clean_name,
        "message": f"Baker display name updated to '{clean_name}'."
    }


@app.delete("/api/user/account")
async def delete_user_account(authorization: Optional[str] = Header(None)):
    """Permanently deletes the user account, all submissions, and all stored media."""
    user_claims = verify_cognito_token(authorization)
    user_id = user_claims.get("sub")
    if not user_id:
        raise HTTPException(status_code=401, detail="User identification missing.")

    session = get_boto3_session()
    ddb = session.resource("dynamodb")
    table = ddb.Table(DYNAMODB_TABLE_NAME)
    s3_client = session.client("s3")
    cognito_client = session.client("cognito-idp")

    # Find and delete all user loaf records
    try:
        res = table.query(
            IndexName="UserIndex",
            KeyConditionExpression=Key("user_id").eq(user_id)
        )
        items = res.get("Items", [])
    except Exception as e:
        logger.error(f"Error querying UserIndex for account deletion: {e}", exc_info=True)
        items = []

    for it in items:
        entry_id = it.get("entry_id")
        score = int(it.get("overall_score", 0))
        sk = f"SCORE#{score:03d}#{entry_id}"
        periods = it.get("periods", ["ALL"])
        for p in periods:
            pk = "PERIOD#ALL" if p == "ALL" else f"PERIOD#{p}"
            try:
                table.delete_item(Key={"pk": pk, "sk": sk})
            except Exception as e:
                logger.warning(f"Error deleting item {pk}/{sk}: {e}")
        try:
            s3_client.delete_object(Bucket=S3_BUCKET_NAME, Key=f"thumbnails/{entry_id}.webp")
        except Exception as e:
            logger.warning(f"Error deleting S3 thumbnail: {e}")

    # Delete Cognito user
    username = user_claims.get("cognito:username") or user_claims.get("username") or user_id
    try:
        cognito_client.admin_delete_user(
            UserPoolId=COGNITO_USER_POOL_ID,
            Username=username
        )
    except Exception as e:
        logger.error(f"Error deleting user from Cognito with username {username}: {e}")
        try:
            cognito_client.admin_delete_user(
                UserPoolId=COGNITO_USER_POOL_ID,
                Username=user_id
            )
        except Exception:
            pass

    return {
        "success": True,
        "message": "Your account and all associated submissions have been permanently removed."
    }


# Mount static files and sample assets
app.mount("/static", StaticFiles(directory=str(STATIC_DIR)), name="static")
app.mount("/samples", StaticFiles(directory=str(SAMPLES_DIR)), name="samples")

@app.get("/")
async def serve_index():
    return FileResponse(str(STATIC_DIR / "index.html"))

@app.get("/leaderboard")
@app.get("/leaderboard.html")
async def serve_leaderboard():
    return FileResponse(str(STATIC_DIR / "leaderboard.html"))

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
