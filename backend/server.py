from fastapi import FastAPI, APIRouter, HTTPException, Request, Response, Depends, Query, UploadFile, File
from fastapi.responses import Response as FastAPIResponse
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
import httpx
import cloudinary
import cloudinary.utils
import time
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict
from typing import List, Optional
import uuid
from datetime import datetime, timezone, timedelta
from enum import Enum
from emergentintegrations.llm.chat import LlmChat, UserMessage
from emergentintegrations.llm.openai import OpenAISpeechToText
from google.oauth2 import id_token as google_id_token
from google.auth.transport import requests as google_requests
import jwt
from jwt.algorithms import RSAAlgorithm
import json
import tempfile

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Cloudinary configuration
cloudinary.config(
    cloud_name=os.getenv("CLOUDINARY_CLOUD_NAME"),
    api_key=os.getenv("CLOUDINARY_API_KEY"),
    api_secret=os.getenv("CLOUDINARY_API_SECRET"),
    secure=True
)

# Create the main app
app = FastAPI(title="EdgeLog API", version="1.0.0")

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Constants
FREE_PLAN_DAYS = 14
EMERGENT_AUTH_URL = "https://demobackend.emergentagent.com/auth/v1/env/oauth/session-data"
GOOGLE_WEB_CLIENT_ID = "168585078949-dbma6ti5vg2tm74s0eb7sf66i61rhu8o.apps.googleusercontent.com"
GOOGLE_IOS_CLIENT_ID = "168585078949-rgs53ketk7c1rgetbq9iftnjhv0jehi0.apps.googleusercontent.com"
GOOGLE_ANDROID_CLIENT_ID = "168585078949-va9hptqsimbnqseaq3ge90rjur2takfc.apps.googleusercontent.com"
APPLE_APP_ID = "com.edgelog.app"

# ==================== MODELS ====================

class TradeType(str, Enum):
    BUY = "buy"
    SELL = "sell"

class TradeOutcome(str, Enum):
    WIN = "win"
    LOSS = "loss"
    BREAKEVEN = "breakeven"
    OPEN = "open"

class SubscriptionTier(str, Enum):
    FREE = "free"
    PREMIUM = "premium"

class User(BaseModel):
    model_config = ConfigDict(extra="ignore")
    user_id: str
    email: str
    name: str
    picture: Optional[str] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    max_trades_per_day: int = 5
    # Subscription fields
    subscription_tier: SubscriptionTier = SubscriptionTier.FREE
    subscription_expires_at: Optional[datetime] = None
    revenuecat_user_id: Optional[str] = None
    ai_reports_this_week: int = 0
    ai_reports_week_start: Optional[datetime] = None

class UserSession(BaseModel):
    model_config = ConfigDict(extra="ignore")
    session_id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    session_token: str
    expires_at: datetime
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class Trade(BaseModel):
    model_config = ConfigDict(extra="ignore")
    trade_id: str = Field(default_factory=lambda: f"trade_{uuid.uuid4().hex[:12]}")
    user_id: str
    trading_pair: str
    trade_type: TradeType
    entry_price: float
    stop_loss: Optional[float] = None
    take_profit: Optional[float] = None
    lot_size: float
    trade_date: datetime
    close_price: Optional[float] = None
    outcome: TradeOutcome = TradeOutcome.OPEN
    pnl: Optional[float] = None
    notes: Optional[str] = None
    emotion_before: Optional[str] = None
    screenshot_url: Optional[str] = None  # NEW: Screenshot URL
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class TradeCreate(BaseModel):
    trading_pair: str
    trade_type: TradeType
    entry_price: float
    stop_loss: Optional[float] = None
    take_profit: Optional[float] = None
    lot_size: float
    trade_date: datetime
    notes: Optional[str] = None
    emotion_before: Optional[str] = None
    screenshot_url: Optional[str] = None  # NEW: Screenshot URL

class TradeUpdate(BaseModel):
    close_price: Optional[float] = None
    outcome: Optional[TradeOutcome] = None
    pnl: Optional[float] = None
    notes: Optional[str] = None
    screenshot_url: Optional[str] = None

class DisciplineSettings(BaseModel):
    max_trades_per_day: int = 5

class ReminderSettings(BaseModel):
    daily_reminder_enabled: bool = False
    reminder_time: Optional[str] = None

class AIReport(BaseModel):
    model_config = ConfigDict(extra="ignore")
    report_id: str = Field(default_factory=lambda: f"report_{uuid.uuid4().hex[:12]}")
    user_id: str
    period: str  # "weekly" or "monthly"
    report_data: dict
    ai_insights: str
    generated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

# ==================== AUTH HELPERS ====================

async def get_current_user(request: Request) -> User:
    """Get current user from session token (cookie or header)"""
    session_token = request.cookies.get("session_token")
    
    if not session_token:
        auth_header = request.headers.get("Authorization")
        if auth_header and auth_header.startswith("Bearer "):
            session_token = auth_header.split(" ")[1]
    
    if not session_token:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    session_doc = await db.user_sessions.find_one(
        {"session_token": session_token},
        {"_id": 0}
    )
    
    if not session_doc:
        raise HTTPException(status_code=401, detail="Invalid session")
    
    expires_at = session_doc["expires_at"]
    if isinstance(expires_at, str):
        expires_at = datetime.fromisoformat(expires_at)
    if expires_at.tzinfo is None:
        expires_at = expires_at.replace(tzinfo=timezone.utc)
    if expires_at < datetime.now(timezone.utc):
        raise HTTPException(status_code=401, detail="Session expired")
    
    user_doc = await db.users.find_one(
        {"user_id": session_doc["user_id"]},
        {"_id": 0}
    )
    
    if not user_doc:
        raise HTTPException(status_code=401, detail="User not found")
    
    return User(**user_doc)

# ==================== AUTH ENDPOINTS ====================

@api_router.post("/auth/session")
async def create_session(request: Request, response: Response):
    """Exchange session_id for session_token"""
    body = await request.json()
    session_id = body.get("session_id")
    
    if not session_id:
        raise HTTPException(status_code=400, detail="session_id required")
    
    async with httpx.AsyncClient() as client_http:
        try:
            auth_response = await client_http.get(
                EMERGENT_AUTH_URL,
                headers={"X-Session-ID": session_id}
            )
            if auth_response.status_code != 200:
                raise HTTPException(status_code=401, detail="Invalid session_id")
            
            user_data = auth_response.json()
        except Exception as e:
            logger.error(f"Auth error: {e}")
            raise HTTPException(status_code=401, detail="Authentication failed")
    
    existing_user = await db.users.find_one(
        {"email": user_data["email"]},
        {"_id": 0}
    )
    
    if existing_user:
        user_id = existing_user["user_id"]
        await db.users.update_one(
            {"user_id": user_id},
            {"$set": {
                "name": user_data["name"],
                "picture": user_data.get("picture")
            }}
        )
    else:
        # New user - give 7-day free trial!
        user_id = f"user_{uuid.uuid4().hex[:12]}"
        trial_expires = datetime.now(timezone.utc) + timedelta(days=7)
        new_user = {
            "user_id": user_id,
            "email": user_data["email"],
            "name": user_data["name"],
            "picture": user_data.get("picture"),
            "created_at": datetime.now(timezone.utc).isoformat(),
            "max_trades_per_day": 5,
            # 7-day free trial
            "subscription_tier": "premium",
            "subscription_expires_at": trial_expires.isoformat(),
            "is_trial": True,
            "trial_started_at": datetime.now(timezone.utc).isoformat()
        }
        await db.users.insert_one(new_user)
        logger.info(f"New user {user_id} registered with 7-day free trial")
    
    session_token = user_data.get("session_token", f"session_{uuid.uuid4().hex}")
    expires_at = datetime.now(timezone.utc) + timedelta(days=7)
    
    session_doc = {
        "session_id": str(uuid.uuid4()),
        "user_id": user_id,
        "session_token": session_token,
        "expires_at": expires_at.isoformat(),
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.user_sessions.insert_one(session_doc)
    
    response.set_cookie(
        key="session_token",
        value=session_token,
        httponly=True,
        secure=True,
        samesite="none",
        path="/",
        max_age=7 * 24 * 60 * 60
    )
    
    user_doc = await db.users.find_one({"user_id": user_id}, {"_id": 0})
    
    return {"user": user_doc, "session_token": session_token}

@api_router.get("/auth/me")
async def get_me(user: User = Depends(get_current_user)):
    """Get current user info"""
    return user.model_dump()

@api_router.post("/auth/logout")
async def logout(request: Request, response: Response):
    """Logout user"""
    # Try to get token from Authorization header (for native apps)
    auth_header = request.headers.get("Authorization")
    if auth_header and auth_header.startswith("Bearer "):
        token = auth_header.split(" ")[1]
        await db.user_sessions.delete_many({"session_token": token})
    
    # Also try cookie-based session (for web)
    session_token = request.cookies.get("session_token")
    if session_token:
        await db.user_sessions.delete_many({"session_token": session_token})
    
    response.delete_cookie(key="session_token", path="/")
    return {"message": "Logged out"}

# ==================== NATIVE APP AUTH TOKEN STORAGE ====================
# Stored in MongoDB for persistence across server restarts

class NativeAuthRequest(BaseModel):
    auth_request_id: str

class NativeAuthStore(BaseModel):
    auth_request_id: str
    session_token: str

@api_router.post("/auth/native/store")
async def store_native_auth_token(data: NativeAuthStore):
    """Store auth token in MongoDB for native app to retrieve"""
    expires_at = datetime.now(timezone.utc) + timedelta(minutes=5)
    await db.native_auth_tokens.update_one(
        {"auth_request_id": data.auth_request_id},
        {"$set": {
            "auth_request_id": data.auth_request_id,
            "session_token": data.session_token,
            "expires_at": expires_at.isoformat(),
            "created_at": datetime.now(timezone.utc).isoformat()
        }},
        upsert=True
    )
    logger.info(f"Stored native auth token for request: {data.auth_request_id}")
    return {"success": True}

@api_router.post("/auth/native/retrieve")
async def retrieve_native_auth_token(data: NativeAuthRequest):
    """Retrieve stored auth token for native app from MongoDB"""
    token_doc = await db.native_auth_tokens.find_one(
        {"auth_request_id": data.auth_request_id},
        {"_id": 0}
    )
    if not token_doc:
        raise HTTPException(status_code=404, detail="Auth request not found")
    
    expires_at = token_doc.get("expires_at", "")
    if isinstance(expires_at, str):
        expires_at = datetime.fromisoformat(expires_at.replace("Z", "+00:00"))
    if expires_at < datetime.now(timezone.utc):
        await db.native_auth_tokens.delete_one({"auth_request_id": data.auth_request_id})
        raise HTTPException(status_code=410, detail="Auth request expired")
    
    session_token = token_doc["session_token"]
    # Clean up after retrieval
    await db.native_auth_tokens.delete_one({"auth_request_id": data.auth_request_id})
    logger.info(f"Retrieved native auth token for request: {data.auth_request_id}")
    return {"session_token": session_token}

# ==================== NATIVE APP AUTH CALLBACK ====================
from fastapi.responses import HTMLResponse

@api_router.get("/auth/native-callback")
async def native_auth_callback(request: Request, auth_request_id: str = Query(default="")):
    """
    Callback page for native app authentication.
    Served by backend to ensure dynamic API URL (no hardcoding).
    The session_id arrives in the URL hash fragment.
    This page exchanges it for a session_token, stores it for the native app,
    and attempts to deep-link back.
    """
    api_url = os.environ.get('REACT_APP_BACKEND_URL', '') or (request.base_url.scheme + "://" + request.headers.get('host', ''))
    
    html_content = f"""<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, user-scalable=no">
<meta http-equiv="Cache-Control" content="no-cache, no-store, must-revalidate">
<meta http-equiv="Pragma" content="no-cache">
<meta http-equiv="Expires" content="0">
<title>EdgeLog - Sign In</title>
<style>
*{{margin:0;padding:0;box-sizing:border-box}}
body{{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background:#000;min-height:100vh;display:flex;flex-direction:column;align-items:center;justify-content:center;color:#fff;padding:24px}}
.container{{text-align:center;max-width:320px;width:100%}}
.logo{{font-size:24px;font-weight:800;letter-spacing:3px;margin-bottom:40px;color:#22c55e}}
.spinner-wrap{{display:flex;flex-direction:column;align-items:center;gap:20px}}
.spinner{{width:48px;height:48px;border:3px solid #222;border-top-color:#22c55e;border-radius:50%;animation:spin .8s linear infinite}}
@keyframes spin{{to{{transform:rotate(360deg)}}}}
@keyframes scaleIn{{0%{{transform:scale(0);opacity:0}}50%{{transform:scale(1.1)}}100%{{transform:scale(1);opacity:1}}}}
.check{{width:80px;height:80px;margin:0 auto 24px;background:linear-gradient(135deg,#22c55e,#16a34a);border-radius:50%;display:flex;align-items:center;justify-content:center;animation:scaleIn .4s ease-out;box-shadow:0 8px 32px rgba(34,197,94,.3)}}
.check svg{{width:40px;height:40px;fill:#fff}}
h1{{font-size:24px;font-weight:700;margin-bottom:8px}}
.sub{{color:#888;font-size:15px;margin-bottom:32px}}
.btn{{display:block;width:100%;padding:18px 24px;background:linear-gradient(135deg,#22c55e,#16a34a);border:none;border-radius:14px;color:#fff;font-size:17px;font-weight:600;cursor:pointer;margin-bottom:16px;box-shadow:0 4px 16px rgba(34,197,94,.3)}}
.btn:active{{transform:scale(.98)}}
.hint{{color:#666;font-size:13px;line-height:1.5}}
.hint strong{{color:#999}}
.err-icon{{width:80px;height:80px;margin:0 auto 24px;background:linear-gradient(135deg,#ef4444,#dc2626);border-radius:50%;display:flex;align-items:center;justify-content:center;box-shadow:0 8px 32px rgba(239,68,68,.3)}}
.err-icon svg{{width:40px;height:40px;fill:#fff}}
.err-msg{{color:#ef4444;font-size:14px;margin-bottom:24px;padding:12px;background:rgba(239,68,68,.1);border-radius:8px}}
#loading{{display:block}}#success{{display:none}}#error-state{{display:none}}
</style>
</head>
<body>
<div class="container">
<div class="logo">EDGELOG</div>
<div id="loading"><div class="spinner-wrap"><div class="spinner"></div><div style="color:#888;font-size:16px">Signing you in...</div></div></div>
<div id="success">
<div class="check"><svg viewBox="0 0 24 24"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg></div>
<h1>You're all set!</h1>
<p class="sub">Successfully signed in to EdgeLog</p>
<button class="btn" id="returnBtn" onclick="returnToApp()">Return to EdgeLog</button>
<p class="hint" id="hintText">Or tap <strong>back</strong> or <strong>close</strong> to return</p>
</div>
<div id="error-state">
<div class="err-icon"><svg viewBox="0 0 24 24"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/></svg></div>
<h1>Sign in failed</h1>
<p class="err-msg" id="error-message">Something went wrong</p>
<p class="hint">Please close this window and try again</p>
</div>
</div>
<script>
var API_URL='{api_url}/api';
var authRequestId='{auth_request_id}';
console.log('Native callback loaded. API:',API_URL,'authRequestId:',authRequestId);

function returnToApp(){{
  if(!authRequestId){{try{{window.close()}}catch(e){{}}return}}
  var dl='edgelog://auth?auth_request_id='+authRequestId+'&status=success';
  window.location.href=dl;
  var ua=navigator.userAgent.toLowerCase();
  if(ua.includes('android')){{
    setTimeout(function(){{
      window.location.href='intent://auth?auth_request_id='+authRequestId+'&status=success#Intent;scheme=edgelog;package=com.edgelog.app;end';
    }},500);
  }}
  setTimeout(function(){{
    document.getElementById('returnBtn').textContent='Close this window';
    document.getElementById('hintText').innerHTML='Tap <strong>back</strong> or <strong>close</strong> to return to the app';
  }},1500);
}}

async function processAuth(){{
  try{{
    var hash=window.location.hash;
    console.log('Hash:',hash);
    var m=hash.match(/session_id=([^&]+)/);
    if(!m)throw new Error('Session not found');
    var sessionId=m[1];
    console.log('Exchanging session_id...');
    var r=await fetch(API_URL+'/auth/session',{{
      method:'POST',
      headers:{{'Content-Type':'application/json'}},
      credentials:'include',
      body:JSON.stringify({{session_id:sessionId}})
    }});
    if(!r.ok)throw new Error('Authentication failed ('+r.status+')');
    var data=await r.json();
    console.log('Got session_token, storing for native app...');
    if(authRequestId){{
      var sr=await fetch(API_URL+'/auth/native/store',{{
        method:'POST',
        headers:{{'Content-Type':'application/json'}},
        body:JSON.stringify({{auth_request_id:authRequestId,session_token:data.session_token}})
      }});
      console.log('Store result:',sr.status);
    }}
    document.getElementById('loading').style.display='none';
    document.getElementById('success').style.display='block';
    if(authRequestId){{setTimeout(returnToApp,800)}}
  }}catch(e){{
    console.error('Auth error:',e);
    document.getElementById('loading').style.display='none';
    document.getElementById('error-state').style.display='block';
    document.getElementById('error-message').textContent=e.message;
  }}
}}
processAuth();
</script>
</body>
</html>"""
    return HTMLResponse(
        content=html_content,
        headers={
            "Cache-Control": "no-cache, no-store, must-revalidate",
            "Pragma": "no-cache",
            "Expires": "0"
        }
    )




# ==================== GOOGLE SIGN-IN (Native) ====================

class GoogleSignInRequest(BaseModel):
    id_token: str

@api_router.post("/auth/google")
async def google_sign_in(request: GoogleSignInRequest, response: Response):
    """Verify Google ID token and create/login user"""
    try:
        idinfo = google_id_token.verify_oauth2_token(
            request.id_token,
            google_requests.Request(),
            audience=None  # Accept any audience, we check manually
        )
        
        # Verify the token is from our app
        aud = idinfo.get('aud', '')
        valid_audiences = [GOOGLE_WEB_CLIENT_ID, GOOGLE_IOS_CLIENT_ID, GOOGLE_ANDROID_CLIENT_ID]
        if aud not in valid_audiences:
            logger.warning(f"Google token audience mismatch: {aud}")
            raise HTTPException(status_code=401, detail="Invalid token audience")
        
        if idinfo.get('iss') not in ['accounts.google.com', 'https://accounts.google.com']:
            raise HTTPException(status_code=401, detail="Invalid token issuer")
        
        email = idinfo.get('email')
        name = idinfo.get('name', email.split('@')[0] if email else 'User')
        picture = idinfo.get('picture')
        
        if not email:
            raise HTTPException(status_code=401, detail="No email in token")
        
        # Find or create user
        existing_user = await db.users.find_one({"email": email}, {"_id": 0})
        
        if existing_user:
            user_id = existing_user["user_id"]
            await db.users.update_one(
                {"user_id": user_id},
                {"$set": {"name": name, "picture": picture}}
            )
        else:
            user_id = f"user_{uuid.uuid4().hex[:12]}"
            trial_expires = datetime.now(timezone.utc) + timedelta(days=7)
            new_user = {
                "user_id": user_id,
                "email": email,
                "name": name,
                "picture": picture,
                "created_at": datetime.now(timezone.utc).isoformat(),
                "max_trades_per_day": 5,
                "subscription_tier": "premium",
                "subscription_expires_at": trial_expires.isoformat(),
                "is_trial": True,
                "trial_started_at": datetime.now(timezone.utc).isoformat()
            }
            await db.users.insert_one(new_user)
            logger.info(f"New Google user {user_id} registered with 7-day free trial")
        
        session_token = f"google_session_{uuid.uuid4().hex}"
        expires_at = datetime.now(timezone.utc) + timedelta(days=7)
        
        session_doc = {
            "session_id": str(uuid.uuid4()),
            "user_id": user_id,
            "session_token": session_token,
            "expires_at": expires_at.isoformat(),
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        await db.user_sessions.insert_one(session_doc)
        
        user_doc = await db.users.find_one({"user_id": user_id}, {"_id": 0})
        return {"user": user_doc, "session_token": session_token}
        
    except HTTPException:
        raise
    except ValueError as e:
        logger.error(f"Google token verification failed: {e}")
        raise HTTPException(status_code=401, detail="Invalid Google token")
    except Exception as e:
        logger.error(f"Google sign-in error: {e}")
        raise HTTPException(status_code=500, detail="Authentication failed")

# ==================== APPLE SIGN-IN (Native iOS) ====================

APPLE_PUBLIC_KEY_URL = "https://appleid.apple.com/auth/keys"

class AppleSignInRequest(BaseModel):
    identity_token: str
    user_id: str
    email: Optional[str] = None
    name: Optional[str] = None

@api_router.post("/auth/apple")
async def apple_sign_in(request: AppleSignInRequest, response: Response):
    """Verify Apple identity token and create/login user"""
    try:
        # Fetch Apple's public keys
        async with httpx.AsyncClient() as client_http:
            resp = await client_http.get(APPLE_PUBLIC_KEY_URL)
            if resp.status_code != 200:
                raise HTTPException(status_code=503, detail="Unable to fetch Apple public keys")
            apple_keys = resp.json()
        
        # Decode token header to find key
        unverified_header = jwt.get_unverified_header(request.identity_token)
        kid = unverified_header.get('kid')
        
        matching_key = None
        for key in apple_keys.get('keys', []):
            if key.get('kid') == kid:
                matching_key = key
                break
        
        if not matching_key:
            raise HTTPException(status_code=401, detail="No matching Apple key found")
        
        public_key = RSAAlgorithm.from_jwk(json.dumps(matching_key))
        decoded_token = jwt.decode(
            request.identity_token,
            public_key,
            algorithms=['RS256'],
            audience=APPLE_APP_ID,
            issuer="https://appleid.apple.com",
        )
        
        apple_user_id = decoded_token.get('sub')
        email = decoded_token.get('email') or request.email
        
        if not apple_user_id:
            raise HTTPException(status_code=401, detail="No user ID in Apple token")
        
        existing_user = await db.users.find_one(
            {"$or": [
                {"apple_user_id": apple_user_id},
                {"email": email} if email else {"_id": None}
            ]},
            {"_id": 0}
        )
        
        if existing_user:
            user_id = existing_user["user_id"]
            update_data = {"apple_user_id": apple_user_id}
            if request.name and not existing_user.get("name"):
                update_data["name"] = request.name
            await db.users.update_one({"user_id": user_id}, {"$set": update_data})
        else:
            user_id = f"user_{uuid.uuid4().hex[:12]}"
            name = request.name or (email.split('@')[0] if email else "Apple User")
            trial_expires = datetime.now(timezone.utc) + timedelta(days=7)
            new_user = {
                "user_id": user_id,
                "apple_user_id": apple_user_id,
                "email": email,
                "name": name,
                "picture": None,
                "created_at": datetime.now(timezone.utc).isoformat(),
                "max_trades_per_day": 5,
                "subscription_tier": "premium",
                "subscription_expires_at": trial_expires.isoformat(),
                "is_trial": True,
                "trial_started_at": datetime.now(timezone.utc).isoformat()
            }
            await db.users.insert_one(new_user)
            logger.info(f"New Apple user {user_id} registered")
        
        session_token = f"apple_session_{uuid.uuid4().hex}"
        expires_at = datetime.now(timezone.utc) + timedelta(days=7)
        session_doc = {
            "session_id": str(uuid.uuid4()),
            "user_id": user_id,
            "session_token": session_token,
            "expires_at": expires_at.isoformat(),
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        await db.user_sessions.insert_one(session_doc)
        
        user_doc = await db.users.find_one({"user_id": user_id}, {"_id": 0})
        return {"user": user_doc, "session_token": session_token}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Apple sign-in error: {e}")
        raise HTTPException(status_code=500, detail="Authentication failed")


# ==================== CLOUDINARY ENDPOINTS ====================

@api_router.get("/cloudinary/signature")
async def generate_cloudinary_signature(
    resource_type: str = Query("image", enum=["image", "video"]),
    folder: str = "trades",
    user: User = Depends(get_current_user)
):
    """Generate signed upload params for Cloudinary"""
    # Create user-specific folder
    user_folder = f"edgelog/{user.user_id}/{folder}"
    
    timestamp = int(time.time())
    params = {
        "timestamp": timestamp,
        "folder": user_folder,
        "resource_type": resource_type
    }
    
    signature = cloudinary.utils.api_sign_request(
        params,
        os.getenv("CLOUDINARY_API_SECRET")
    )
    
    return {
        "signature": signature,
        "timestamp": timestamp,
        "cloud_name": os.getenv("CLOUDINARY_CLOUD_NAME"),
        "api_key": os.getenv("CLOUDINARY_API_KEY"),
        "folder": user_folder,
        "resource_type": resource_type
    }

# ==================== TRADE ENDPOINTS ====================

@api_router.post("/trades", response_model=dict)
async def create_trade(trade_data: TradeCreate, user: User = Depends(get_current_user)):
    """Create a new trade"""
    trade = Trade(
        user_id=user.user_id,
        **trade_data.model_dump()
    )
    
    trade_doc = trade.model_dump()
    trade_doc["trade_date"] = trade_doc["trade_date"].isoformat()
    trade_doc["created_at"] = trade_doc["created_at"].isoformat()
    
    await db.trades.insert_one(trade_doc)
    
    trade_doc.pop("_id", None)
    return trade_doc

@api_router.get("/trades")
async def get_trades(user: User = Depends(get_current_user)):
    """Get all trades for user (limited to 14 days for free plan)"""
    cutoff_date = datetime.now(timezone.utc) - timedelta(days=FREE_PLAN_DAYS)
    
    trades = await db.trades.find(
        {
            "user_id": user.user_id,
            "created_at": {"$gte": cutoff_date.isoformat()}
        },
        {"_id": 0}
    ).sort("trade_date", -1).to_list(1000)
    
    return trades

@api_router.get("/trades/today")
async def get_today_trades(user: User = Depends(get_current_user)):
    """Get trades for today"""
    today_start = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0)
    
    trades = await db.trades.find(
        {
            "user_id": user.user_id,
            "trade_date": {"$gte": today_start.isoformat()}
        },
        {"_id": 0}
    ).sort("trade_date", -1).to_list(100)
    
    return trades

@api_router.put("/trades/{trade_id}")
async def update_trade(trade_id: str, trade_update: TradeUpdate, user: User = Depends(get_current_user)):
    """Update a trade"""
    existing = await db.trades.find_one(
        {"trade_id": trade_id, "user_id": user.user_id},
        {"_id": 0}
    )
    
    if not existing:
        raise HTTPException(status_code=404, detail="Trade not found")
    
    update_data = {k: v for k, v in trade_update.model_dump().items() if v is not None}
    
    if update_data:
        await db.trades.update_one(
            {"trade_id": trade_id},
            {"$set": update_data}
        )
    
    updated = await db.trades.find_one({"trade_id": trade_id}, {"_id": 0})
    return updated

@api_router.delete("/trades/{trade_id}")
async def delete_trade(trade_id: str, user: User = Depends(get_current_user)):
    """Delete a trade"""
    result = await db.trades.delete_one(
        {"trade_id": trade_id, "user_id": user.user_id}
    )
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Trade not found")
    
    return {"message": "Trade deleted"}

# ==================== ANALYTICS ENDPOINTS ====================

@api_router.get("/analytics/summary")
async def get_analytics_summary(user: User = Depends(get_current_user)):
    """Get analytics summary for dashboard"""
    cutoff_date = datetime.now(timezone.utc) - timedelta(days=FREE_PLAN_DAYS)
    today_start = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0)
    
    all_trades = await db.trades.find(
        {
            "user_id": user.user_id,
            "created_at": {"$gte": cutoff_date.isoformat()}
        },
        {"_id": 0}
    ).to_list(1000)
    
    today_trades = [t for t in all_trades if t.get("trade_date", "") >= today_start.isoformat()]
    
    total_trades = len(all_trades)
    today_count = len(today_trades)
    
    wins = len([t for t in all_trades if t.get("outcome") == "win"])
    losses = len([t for t in all_trades if t.get("outcome") == "loss"])
    breakevens = len([t for t in all_trades if t.get("outcome") == "breakeven"])
    open_trades = len([t for t in all_trades if t.get("outcome") == "open"])
    
    closed_trades = wins + losses + breakevens
    win_rate = (wins / closed_trades * 100) if closed_trades > 0 else 0
    
    total_pnl = sum(t.get("pnl", 0) or 0 for t in all_trades)
    
    rr_ratios = []
    for t in all_trades:
        if t.get("stop_loss") and t.get("take_profit") and t.get("entry_price"):
            entry = t["entry_price"]
            sl = t["stop_loss"]
            tp = t["take_profit"]
            risk = abs(entry - sl)
            reward = abs(tp - entry)
            if risk > 0:
                rr_ratios.append(reward / risk)
    
    avg_rr = sum(rr_ratios) / len(rr_ratios) if rr_ratios else 0
    
    max_trades = user.max_trades_per_day
    discipline_score = 100
    if today_count > max_trades:
        over_trades = today_count - max_trades
        discipline_score = max(0, 100 - (over_trades * 20))
    
    days_remaining = FREE_PLAN_DAYS
    
    return {
        "total_trades": total_trades,
        "today_trades": today_count,
        "wins": wins,
        "losses": losses,
        "breakevens": breakevens,
        "open_trades": open_trades,
        "win_rate": round(win_rate, 1),
        "total_pnl": round(total_pnl, 2),
        "avg_risk_reward": round(avg_rr, 2),
        "discipline_score": discipline_score,
        "max_trades_per_day": max_trades,
        "days_remaining": days_remaining
    }

@api_router.get("/analytics/daily")
async def get_daily_analytics(user: User = Depends(get_current_user)):
    """Get daily P&L for charts"""
    cutoff_date = datetime.now(timezone.utc) - timedelta(days=FREE_PLAN_DAYS)
    
    trades = await db.trades.find(
        {
            "user_id": user.user_id,
            "created_at": {"$gte": cutoff_date.isoformat()}
        },
        {"_id": 0}
    ).to_list(1000)
    
    daily_data = {}
    for trade in trades:
        trade_date = trade.get("trade_date", "")[:10]
        if trade_date not in daily_data:
            daily_data[trade_date] = {"date": trade_date, "trades": 0, "pnl": 0, "wins": 0, "losses": 0}
        
        daily_data[trade_date]["trades"] += 1
        daily_data[trade_date]["pnl"] += trade.get("pnl", 0) or 0
        
        if trade.get("outcome") == "win":
            daily_data[trade_date]["wins"] += 1
        elif trade.get("outcome") == "loss":
            daily_data[trade_date]["losses"] += 1
    
    result = sorted(daily_data.values(), key=lambda x: x["date"])
    return result

# ==================== AI REPORT GENERATION ====================

async def check_ai_report_limit(user: User) -> tuple[bool, str]:
    """Check if user can generate AI report based on subscription"""
    # Premium users have unlimited reports
    user_doc = await db.users.find_one({"user_id": user.user_id}, {"_id": 0})
    if user_doc and user_doc.get("subscription_tier") == "premium":
        # Check if subscription is still valid
        expires_at = user_doc.get("subscription_expires_at")
        if expires_at:
            if isinstance(expires_at, str):
                expires_at = datetime.fromisoformat(expires_at.replace("Z", "+00:00"))
            if expires_at > datetime.now(timezone.utc):
                return True, ""
    
    # Free users: 1 report per week
    now = datetime.now(timezone.utc)
    week_start = user_doc.get("ai_reports_week_start") if user_doc else None
    reports_this_week = user_doc.get("ai_reports_this_week", 0) if user_doc else 0
    
    # Reset weekly counter if new week
    if week_start:
        if isinstance(week_start, str):
            week_start = datetime.fromisoformat(week_start.replace("Z", "+00:00"))
        if (now - week_start).days >= 7:
            reports_this_week = 0
            week_start = now
    else:
        week_start = now
    
    if reports_this_week >= 1:
        days_until_reset = 7 - (now - week_start).days
        return False, f"Free users get 1 AI report per week. Upgrade to Premium for unlimited reports! ({days_until_reset} days until reset)"
    
    return True, ""

async def increment_ai_report_count(user_id: str):
    """Increment the AI report counter for free users"""
    now = datetime.now(timezone.utc)
    user_doc = await db.users.find_one({"user_id": user_id}, {"_id": 0})
    
    week_start = user_doc.get("ai_reports_week_start") if user_doc else None
    reports_this_week = user_doc.get("ai_reports_this_week", 0) if user_doc else 0
    
    if week_start:
        if isinstance(week_start, str):
            week_start = datetime.fromisoformat(week_start.replace("Z", "+00:00"))
        if (now - week_start).days >= 7:
            reports_this_week = 0
            week_start = now
    else:
        week_start = now
    
    await db.users.update_one(
        {"user_id": user_id},
        {"$set": {
            "ai_reports_this_week": reports_this_week + 1,
            "ai_reports_week_start": week_start.isoformat()
        }}
    )

@api_router.post("/reports/generate")
async def generate_ai_report(
    period: str = Query("weekly", enum=["weekly", "monthly"]),
    user: User = Depends(get_current_user)
):
    """Generate AI-powered performance report"""
    # Check AI report limit
    can_generate, error_msg = await check_ai_report_limit(user)
    if not can_generate:
        raise HTTPException(status_code=403, detail=error_msg)
    # Determine date range
    if period == "weekly":
        days = 7
    else:
        days = 30
    
    cutoff_date = datetime.now(timezone.utc) - timedelta(days=days)
    
    # Get trades for the period
    trades = await db.trades.find(
        {
            "user_id": user.user_id,
            "created_at": {"$gte": cutoff_date.isoformat()}
        },
        {"_id": 0}
    ).to_list(1000)
    
    if not trades:
        return {
            "report_id": f"report_{uuid.uuid4().hex[:12]}",
            "period": period,
            "report_data": {
                "total_trades": 0,
                "wins": 0,
                "losses": 0,
                "win_rate": 0,
                "total_pnl": 0,
                "best_pair": None,
                "worst_pair": None
            },
            "ai_insights": "No trades found for this period. Start logging your trades to get AI-powered insights!",
            "generated_at": datetime.now(timezone.utc).isoformat()
        }
    
    # Calculate statistics
    total_trades = len(trades)
    wins = len([t for t in trades if t.get("outcome") == "win"])
    losses = len([t for t in trades if t.get("outcome") == "loss"])
    breakevens = len([t for t in trades if t.get("outcome") == "breakeven"])
    
    closed_trades = wins + losses + breakevens
    win_rate = (wins / closed_trades * 100) if closed_trades > 0 else 0
    total_pnl = sum(t.get("pnl", 0) or 0 for t in trades)
    
    # Analyze by trading pair
    pair_stats = {}
    for trade in trades:
        pair = trade.get("trading_pair", "Unknown")
        if pair not in pair_stats:
            pair_stats[pair] = {"wins": 0, "losses": 0, "pnl": 0, "count": 0}
        pair_stats[pair]["count"] += 1
        pair_stats[pair]["pnl"] += trade.get("pnl", 0) or 0
        if trade.get("outcome") == "win":
            pair_stats[pair]["wins"] += 1
        elif trade.get("outcome") == "loss":
            pair_stats[pair]["losses"] += 1
    
    # Find best and worst pairs
    best_pair = max(pair_stats.items(), key=lambda x: x[1]["pnl"]) if pair_stats else (None, {})
    worst_pair = min(pair_stats.items(), key=lambda x: x[1]["pnl"]) if pair_stats else (None, {})
    
    # Analyze by emotion
    emotion_stats = {}
    for trade in trades:
        emotion = trade.get("emotion_before", "unknown") or "unknown"
        if emotion not in emotion_stats:
            emotion_stats[emotion] = {"wins": 0, "losses": 0, "count": 0}
        emotion_stats[emotion]["count"] += 1
        if trade.get("outcome") == "win":
            emotion_stats[emotion]["wins"] += 1
        elif trade.get("outcome") == "loss":
            emotion_stats[emotion]["losses"] += 1
    
    # Analyze by trade type
    buy_trades = [t for t in trades if t.get("trade_type") == "buy"]
    sell_trades = [t for t in trades if t.get("trade_type") == "sell"]
    
    buy_wins = len([t for t in buy_trades if t.get("outcome") == "win"])
    sell_wins = len([t for t in sell_trades if t.get("outcome") == "win"])
    
    # Generate AI insights using GPT-5.2
    report_data = {
        "total_trades": total_trades,
        "wins": wins,
        "losses": losses,
        "breakevens": breakevens,
        "win_rate": round(win_rate, 1),
        "total_pnl": round(total_pnl, 2),
        "best_pair": {"name": best_pair[0], "pnl": round(best_pair[1].get("pnl", 0), 2)} if best_pair[0] else None,
        "worst_pair": {"name": worst_pair[0], "pnl": round(worst_pair[1].get("pnl", 0), 2)} if worst_pair[0] else None,
        "pair_stats": {k: {"wins": v["wins"], "losses": v["losses"], "pnl": round(v["pnl"], 2)} for k, v in pair_stats.items()},
        "emotion_stats": emotion_stats,
        "buy_stats": {"count": len(buy_trades), "wins": buy_wins},
        "sell_stats": {"count": len(sell_trades), "wins": sell_wins},
        "period": period,
        "user_name": user.name
    }
    
    # Create AI prompt
    prompt = f"""You are a professional trading coach analyzing a trader's performance. Generate a brief, actionable performance report.

TRADER DATA ({period} period):
- Total Trades: {total_trades}
- Wins: {wins} | Losses: {losses} | Breakeven: {breakevens}
- Win Rate: {win_rate:.1f}%
- Total P&L: {total_pnl:.2f}
- Best Performing Pair: {best_pair[0]} (P&L: {best_pair[1].get('pnl', 0):.2f})
- Worst Performing Pair: {worst_pair[0]} (P&L: {worst_pair[1].get('pnl', 0):.2f})
- Buy Trades: {len(buy_trades)} ({buy_wins} wins)
- Sell Trades: {len(sell_trades)} ({sell_wins} wins)
- Trading Pairs: {', '.join(pair_stats.keys())}
- Emotions logged: {', '.join(emotion_stats.keys())}

Generate a concise performance summary (3-4 sentences max) highlighting:
1. Overall performance assessment
2. Key strength or pattern
3. One specific improvement suggestion

Keep it professional, motivating, and actionable. Use trader's first name: {user.name.split()[0]}."""

    try:
        chat = LlmChat(
            api_key=os.getenv("EMERGENT_LLM_KEY"),
            session_id=f"report_{user.user_id}_{period}",
            system_message="You are a professional trading performance analyst. Be concise, insightful, and actionable."
        ).with_model("openai", "gpt-5.2")
        
        user_message = UserMessage(text=prompt)
        ai_insights = await chat.send_message(user_message)
        
    except Exception as e:
        logger.error(f"AI generation error: {e}")
        # Fallback insights
        if win_rate >= 60:
            ai_insights = f"Great {period}! Your {win_rate:.0f}% win rate shows solid execution. Focus on {best_pair[0]} where you're performing best."
        elif win_rate >= 40:
            ai_insights = f"Decent {period} with room to grow. Consider reducing position sizes on {worst_pair[0]} and stick to your discipline rules."
        else:
            ai_insights = f"Challenging {period}. Review your {worst_pair[0]} trades and consider taking fewer, higher-quality setups."
    
    # Save report
    report_doc = {
        "report_id": f"report_{uuid.uuid4().hex[:12]}",
        "user_id": user.user_id,
        "period": period,
        "report_data": report_data,
        "ai_insights": ai_insights,
        "generated_at": datetime.now(timezone.utc).isoformat()
    }
    await db.reports.insert_one(report_doc)
    report_doc.pop("_id", None)
    
    # Increment AI report count for free users
    await increment_ai_report_count(user.user_id)
    
    return report_doc

@api_router.get("/reports")
async def get_reports(user: User = Depends(get_current_user)):
    """Get all reports for user"""
    reports = await db.reports.find(
        {"user_id": user.user_id},
        {"_id": 0}
    ).sort("generated_at", -1).to_list(50)
    
    return reports

@api_router.get("/reports/{report_id}")
async def get_report(report_id: str, user: User = Depends(get_current_user)):
    """Get a specific report"""
    report = await db.reports.find_one(
        {"report_id": report_id, "user_id": user.user_id},
        {"_id": 0}
    )
    
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")
    
    return report

# ==================== SETTINGS ENDPOINTS ====================

@api_router.put("/settings/discipline")
async def update_discipline_settings(
    settings: DisciplineSettings,
    user: User = Depends(get_current_user)
):
    """Update discipline settings"""
    await db.users.update_one(
        {"user_id": user.user_id},
        {"$set": {"max_trades_per_day": settings.max_trades_per_day}}
    )
    return {"message": "Settings updated", "max_trades_per_day": settings.max_trades_per_day}

@api_router.get("/settings/reminders")
async def get_reminder_settings(user: User = Depends(get_current_user)):
    """Get reminder settings"""
    settings = await db.reminder_settings.find_one(
        {"user_id": user.user_id},
        {"_id": 0}
    )
    return settings or {"daily_reminder_enabled": False, "reminder_time": None}

@api_router.put("/settings/reminders")
async def update_reminder_settings(
    settings: ReminderSettings,
    user: User = Depends(get_current_user)
):
    """Update reminder settings"""
    await db.reminder_settings.update_one(
        {"user_id": user.user_id},
        {"$set": {
            "user_id": user.user_id,
            "daily_reminder_enabled": settings.daily_reminder_enabled,
            "reminder_time": settings.reminder_time
        }},
        upsert=True
    )
    return {"message": "Reminder settings updated"}

# ==================== CLEANUP JOB ====================

@api_router.post("/admin/cleanup-old-trades")
async def cleanup_old_trades():
    """Cleanup trades older than 14 days for FREE users only"""
    cutoff_date = datetime.now(timezone.utc) - timedelta(days=FREE_PLAN_DAYS)
    
    # Get free users only
    free_users = await db.users.find(
        {"$or": [
            {"subscription_tier": {"$exists": False}},
            {"subscription_tier": "free"},
            {"subscription_tier": None}
        ]},
        {"user_id": 1, "_id": 0}
    ).to_list(10000)
    
    free_user_ids = [u["user_id"] for u in free_users]
    
    result = await db.trades.delete_many({
        "user_id": {"$in": free_user_ids},
        "created_at": {"$lt": cutoff_date.isoformat()}
    })
    return {"deleted_count": result.deleted_count}

# ==================== SUBSCRIPTION ENDPOINTS ====================

class SubscriptionUpdate(BaseModel):
    subscription_tier: str
    expires_at: Optional[str] = None
    revenuecat_user_id: Optional[str] = None

@api_router.get("/subscription/status")
async def get_subscription_status(user: User = Depends(get_current_user)):
    """Get current subscription status"""
    user_doc = await db.users.find_one({"user_id": user.user_id}, {"_id": 0})
    
    subscription_tier = user_doc.get("subscription_tier", "free") if user_doc else "free"
    expires_at = user_doc.get("subscription_expires_at") if user_doc else None
    
    # Check if premium expired
    is_premium = False
    if subscription_tier == "premium" and expires_at:
        if isinstance(expires_at, str):
            expires_at_dt = datetime.fromisoformat(expires_at.replace("Z", "+00:00"))
        else:
            expires_at_dt = expires_at
        is_premium = expires_at_dt > datetime.now(timezone.utc)
    
    # AI report usage
    ai_reports_this_week = user_doc.get("ai_reports_this_week", 0) if user_doc else 0
    ai_reports_week_start = user_doc.get("ai_reports_week_start") if user_doc else None
    
    # Check if week reset needed
    if ai_reports_week_start:
        if isinstance(ai_reports_week_start, str):
            week_start_dt = datetime.fromisoformat(ai_reports_week_start.replace("Z", "+00:00"))
        else:
            week_start_dt = ai_reports_week_start
        if (datetime.now(timezone.utc) - week_start_dt).days >= 7:
            ai_reports_this_week = 0
    
    # Check trial status
    is_trial = user_doc.get("is_trial", False) if user_doc else False
    trial_days_left = 0
    if is_trial and is_premium and expires_at:
        if isinstance(expires_at, str):
            expires_at_dt = datetime.fromisoformat(expires_at.replace("Z", "+00:00"))
        else:
            expires_at_dt = expires_at
        trial_days_left = max(0, (expires_at_dt - datetime.now(timezone.utc)).days)
    
    return {
        "subscription_tier": "premium" if is_premium else "free",
        "is_premium": is_premium,
        "is_trial": is_trial and is_premium,
        "trial_days_left": trial_days_left if is_trial else None,
        "expires_at": expires_at,
        "ai_reports_used": ai_reports_this_week,
        "ai_reports_limit": None if is_premium else 1,
        "features": {
            "ads_free": is_premium,
            "unlimited_history": is_premium,
            "unlimited_ai_reports": is_premium,
            "mt4_mt5_import": is_premium,
            "export_share": is_premium,
            "download_reports": is_premium
        }
    }

# ==================== COUPON CODES ====================

class CouponCode(BaseModel):
    code: str
    discount_type: str = "percentage"  # "percentage" or "free_days"
    discount_value: int = 0  # percentage off or free days
    max_uses: Optional[int] = None
    expires_at: Optional[str] = None
    is_active: bool = True

class ApplyCouponRequest(BaseModel):
    code: str

@api_router.post("/coupons/validate")
async def validate_coupon(
    request: ApplyCouponRequest,
    user: User = Depends(get_current_user)
):
    """Validate a coupon code"""
    code = request.code.strip().upper()
    
    coupon = await db.coupons.find_one({"code": code}, {"_id": 0})
    
    if not coupon:
        raise HTTPException(status_code=404, detail="Invalid coupon code")
    
    if not coupon.get("is_active", True):
        raise HTTPException(status_code=400, detail="This coupon is no longer active")
    
    # Check expiration
    expires_at = coupon.get("expires_at")
    if expires_at:
        if isinstance(expires_at, str):
            expires_at = datetime.fromisoformat(expires_at.replace("Z", "+00:00"))
        if expires_at < datetime.now(timezone.utc):
            raise HTTPException(status_code=400, detail="This coupon has expired")
    
    # Check max uses
    max_uses = coupon.get("max_uses")
    current_uses = coupon.get("current_uses", 0)
    if max_uses and current_uses >= max_uses:
        raise HTTPException(status_code=400, detail="This coupon has reached its usage limit")
    
    # Check if user already used this coupon
    user_coupons = await db.user_coupons.find_one({
        "user_id": user.user_id,
        "coupon_code": code
    })
    if user_coupons:
        raise HTTPException(status_code=400, detail="You have already used this coupon")
    
    return {
        "valid": True,
        "code": code,
        "discount_type": coupon.get("discount_type", "percentage"),
        "discount_value": coupon.get("discount_value", 0),
        "description": coupon.get("description", "")
    }

@api_router.post("/coupons/apply")
async def apply_coupon(
    request: ApplyCouponRequest,
    user: User = Depends(get_current_user)
):
    """Apply a coupon code to user account"""
    code = request.code.strip().upper()
    
    # Validate first
    coupon = await db.coupons.find_one({"code": code}, {"_id": 0})
    
    if not coupon:
        raise HTTPException(status_code=404, detail="Invalid coupon code")
    
    if not coupon.get("is_active", True):
        raise HTTPException(status_code=400, detail="This coupon is no longer active")
    
    # Check if user already used this coupon
    user_coupons = await db.user_coupons.find_one({
        "user_id": user.user_id,
        "coupon_code": code
    })
    if user_coupons:
        raise HTTPException(status_code=400, detail="You have already used this coupon")
    
    discount_type = coupon.get("discount_type", "percentage")
    discount_value = coupon.get("discount_value", 0)
    
    # Apply the coupon
    if discount_type == "free_days":
        # Give free premium days
        current_expires = None
        user_doc = await db.users.find_one({"user_id": user.user_id}, {"_id": 0})
        if user_doc:
            current_expires = user_doc.get("subscription_expires_at")
        
        if current_expires:
            if isinstance(current_expires, str):
                base_date = datetime.fromisoformat(current_expires.replace("Z", "+00:00"))
            else:
                base_date = current_expires
        else:
            base_date = datetime.now(timezone.utc)
        
        new_expires = base_date + timedelta(days=discount_value)
        
        await db.users.update_one(
            {"user_id": user.user_id},
            {"$set": {
                "subscription_tier": "premium",
                "subscription_expires_at": new_expires.isoformat(),
                "coupon_applied": code
            }}
        )
        
        message = f"You got {discount_value} days of free Premium!"
        
    elif discount_type == "percentage":
        # Store the discount for checkout (RevenueCat handles actual discount)
        await db.users.update_one(
            {"user_id": user.user_id},
            {"$set": {
                "pending_discount": discount_value,
                "pending_coupon": code
            }}
        )
        message = f"You got {discount_value}% off your subscription!"
    
    # Record coupon usage
    await db.user_coupons.insert_one({
        "user_id": user.user_id,
        "coupon_code": code,
        "applied_at": datetime.now(timezone.utc).isoformat()
    })
    
    # Increment coupon usage count
    await db.coupons.update_one(
        {"code": code},
        {"$inc": {"current_uses": 1}}
    )
    
    return {
        "success": True,
        "message": message,
        "discount_type": discount_type,
        "discount_value": discount_value
    }

@api_router.post("/admin/coupons/create")
async def create_coupon(
    coupon: CouponCode,
    user: User = Depends(get_current_user)
):
    """Create a new coupon code (admin only - check by email for now)"""
    # Simple admin check - you can enhance this later
    admin_emails = ["ravuri@gmail.com", "admin@edgelog.app"]  # Add your email
    
    user_doc = await db.users.find_one({"user_id": user.user_id}, {"_id": 0})
    if not user_doc or user_doc.get("email") not in admin_emails:
        raise HTTPException(status_code=403, detail="Admin access required")
    
    code = coupon.code.strip().upper()
    
    # Check if code already exists
    existing = await db.coupons.find_one({"code": code})
    if existing:
        raise HTTPException(status_code=400, detail="Coupon code already exists")
    
    coupon_doc = {
        "code": code,
        "discount_type": coupon.discount_type,
        "discount_value": coupon.discount_value,
        "max_uses": coupon.max_uses,
        "current_uses": 0,
        "expires_at": coupon.expires_at,
        "is_active": coupon.is_active,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.coupons.insert_one(coupon_doc)
    coupon_doc.pop("_id", None)
    
    return {"success": True, "coupon": coupon_doc}

@api_router.get("/admin/coupons")
async def list_coupons(user: User = Depends(get_current_user)):
    """List all coupons (admin only)"""
    admin_emails = ["ravuri@gmail.com", "admin@edgelog.app"]
    
    user_doc = await db.users.find_one({"user_id": user.user_id}, {"_id": 0})
    if not user_doc or user_doc.get("email") not in admin_emails:
        raise HTTPException(status_code=403, detail="Admin access required")
    
    coupons = await db.coupons.find({}, {"_id": 0}).to_list(1000)
    return {"coupons": coupons}

# RevenueCat Webhook Secret
REVENUECAT_WEBHOOK_SECRET = os.getenv("REVENUECAT_WEBHOOK_SECRET", "")

@api_router.post("/subscription/webhook")
async def subscription_webhook(request: Request):
    """Handle RevenueCat webhook for subscription updates"""
    try:
        # Validate webhook authorization
        auth_header = request.headers.get("Authorization")
        if REVENUECAT_WEBHOOK_SECRET and auth_header != f"Bearer {REVENUECAT_WEBHOOK_SECRET}":
            logger.warning("Invalid webhook authorization")
            raise HTTPException(status_code=401, detail="Unauthorized")
        
        body = await request.json()
        event = body.get("event", {})
        event_type = event.get("type")
        app_user_id = event.get("app_user_id")
        
        logger.info(f"RevenueCat webhook received: {event_type} for user {app_user_id}")
        
        if not app_user_id:
            return {"status": "ignored", "reason": "no app_user_id"}
        
        # Find user by RevenueCat ID, user_id, or email
        user = await db.users.find_one(
            {"$or": [
                {"revenuecat_user_id": app_user_id},
                {"user_id": app_user_id},
                {"email": app_user_id}
            ]},
            {"_id": 0}
        )
        
        if not user:
            logger.warning(f"User not found for RevenueCat ID: {app_user_id}")
            return {"status": "ignored", "reason": "user not found"}
        
        if event_type in ["INITIAL_PURCHASE", "RENEWAL", "PRODUCT_CHANGE", "UNCANCELLATION"]:
            # Activate premium
            expiration = event.get("expiration_at_ms")
            expires_at = datetime.fromtimestamp(expiration / 1000, tz=timezone.utc) if expiration else None
            
            await db.users.update_one(
                {"user_id": user["user_id"]},
                {"$set": {
                    "subscription_tier": "premium",
                    "subscription_expires_at": expires_at.isoformat() if expires_at else None,
                    "revenuecat_user_id": app_user_id,
                    "is_trial": False
                }}
            )
            logger.info(f"Premium activated for user: {user['user_id']} until {expires_at}")
            
        elif event_type in ["CANCELLATION", "EXPIRATION", "BILLING_ISSUE"]:
            # Downgrade to free (but keep until expiration for CANCELLATION)
            if event_type == "EXPIRATION":
                await db.users.update_one(
                    {"user_id": user["user_id"]},
                    {"$set": {
                        "subscription_tier": "free",
                        "is_trial": False
                    }}
                )
                logger.info(f"Premium expired for user: {user['user_id']}")
            else:
                # CANCELLATION - they keep access until expiration
                logger.info(f"Subscription cancelled (but still active) for user: {user['user_id']}")
        
        elif event_type == "SUBSCRIBER_ALIAS":
            # User alias changed - update the RevenueCat ID
            new_app_user_id = event.get("new_app_user_id")
            if new_app_user_id:
                await db.users.update_one(
                    {"user_id": user["user_id"]},
                    {"$set": {"revenuecat_user_id": new_app_user_id}}
                )
        
        return {"status": "success", "event_type": event_type}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Webhook error: {e}")
        raise HTTPException(status_code=500, detail="Webhook processing failed")

# ==================== MT4/MT5 IMPORT ====================

class MT4MT5ImportRequest(BaseModel):
    file_content: str  # Base64 encoded or raw HTML/CSV content
    file_type: str = "html"  # "html" or "csv"
    platform: str = "mt4"  # "mt4" or "mt5"

@api_router.post("/import/mt4mt5")
async def import_mt4_mt5_trades(
    import_data: MT4MT5ImportRequest,
    user: User = Depends(get_current_user)
):
    """Import trades from MT4/MT5 report (Premium only)"""
    # Check premium status
    user_doc = await db.users.find_one({"user_id": user.user_id}, {"_id": 0})
    is_premium = user_doc.get("subscription_tier") == "premium" if user_doc else False
    
    if not is_premium:
        raise HTTPException(
            status_code=403, 
            detail="MT4/MT5 import is a Premium feature. Upgrade to access this feature!"
        )
    
    try:
        import re
        import base64
        from html.parser import HTMLParser
        
        # Decode content if base64
        try:
            content = base64.b64decode(import_data.file_content).decode('utf-8')
        except Exception:
            content = import_data.file_content
        
        trades_imported = []
        
        if import_data.file_type == "html":
            # Parse MT4/MT5 HTML report
            # Look for trade rows in the Account History section
            
            # Simple regex patterns for MT4/MT5 HTML reports
            # MT4 pattern: <tr>...<td>ticket</td><td>time</td><td>type</td><td>size</td><td>item</td><td>price</td>...
            trade_pattern = r'<tr[^>]*>.*?<td[^>]*>(\d+)</td>.*?<td[^>]*>([\d\.:\s]+)</td>.*?<td[^>]*>(buy|sell)</td>.*?<td[^>]*>([\d\.]+)</td>.*?<td[^>]*>([^<]+)</td>.*?<td[^>]*>([\d\.]+)</td>.*?<td[^>]*>([\d\.]+)</td>.*?<td[^>]*>.*?</td>.*?<td[^>]*>.*?</td>.*?<td[^>]*>([-\d\.]+)</td>.*?</tr>'
            
            matches = re.findall(trade_pattern, content, re.IGNORECASE | re.DOTALL)
            
            for match in matches:
                try:
                    ticket, time_str, trade_type, lot_size, symbol, open_price, close_price, pnl = match
                    
                    # Determine outcome
                    pnl_float = float(pnl)
                    if pnl_float > 0:
                        outcome = "win"
                    elif pnl_float < 0:
                        outcome = "loss"
                    else:
                        outcome = "breakeven"
                    
                    trade_doc = {
                        "trade_id": f"trade_{uuid.uuid4().hex[:12]}",
                        "user_id": user.user_id,
                        "trading_pair": symbol.strip().upper(),
                        "trade_type": trade_type.lower(),
                        "entry_price": float(open_price),
                        "close_price": float(close_price),
                        "lot_size": float(lot_size),
                        "pnl": pnl_float,
                        "outcome": outcome,
                        "trade_date": datetime.now(timezone.utc).isoformat(),
                        "notes": f"Imported from {import_data.platform.upper()} - Ticket #{ticket}",
                        "created_at": datetime.now(timezone.utc).isoformat(),
                        "imported_from": import_data.platform
                    }
                    trades_imported.append(trade_doc)
                except Exception as e:
                    logger.warning(f"Failed to parse trade row: {e}")
                    continue
        
        elif import_data.file_type == "csv":
            # Parse CSV format
            import csv
            from io import StringIO
            
            reader = csv.DictReader(StringIO(content))
            for row in reader:
                try:
                    # Common CSV column names
                    symbol = row.get("Symbol", row.get("Item", row.get("symbol", "")))
                    trade_type = row.get("Type", row.get("type", "buy")).lower()
                    if "buy" not in trade_type and "sell" not in trade_type:
                        continue
                    trade_type = "buy" if "buy" in trade_type else "sell"
                    
                    lot_size = float(row.get("Volume", row.get("Lots", row.get("Size", "0.01"))))
                    open_price = float(row.get("Open Price", row.get("Price", "0")))
                    close_price = float(row.get("Close Price", row.get("S/L", "0")))
                    pnl = float(row.get("Profit", row.get("P/L", "0")))
                    
                    if pnl > 0:
                        outcome = "win"
                    elif pnl < 0:
                        outcome = "loss"
                    else:
                        outcome = "breakeven"
                    
                    trade_doc = {
                        "trade_id": f"trade_{uuid.uuid4().hex[:12]}",
                        "user_id": user.user_id,
                        "trading_pair": symbol.strip().upper(),
                        "trade_type": trade_type,
                        "entry_price": open_price,
                        "close_price": close_price,
                        "lot_size": lot_size,
                        "pnl": pnl,
                        "outcome": outcome,
                        "trade_date": datetime.now(timezone.utc).isoformat(),
                        "notes": f"Imported from {import_data.platform.upper()} CSV",
                        "created_at": datetime.now(timezone.utc).isoformat(),
                        "imported_from": import_data.platform
                    }
                    trades_imported.append(trade_doc)
                except Exception as e:
                    logger.warning(f"Failed to parse CSV row: {e}")
                    continue
        
        # Insert trades
        if trades_imported:
            await db.trades.insert_many(trades_imported)
        
        return {
            "success": True,
            "trades_imported": len(trades_imported),
            "message": f"Successfully imported {len(trades_imported)} trades from {import_data.platform.upper()}"
        }
        
    except Exception as e:
        logger.error(f"Import error: {e}")
        raise HTTPException(status_code=400, detail=f"Failed to parse file: {str(e)}")


# ==================== VOICE TRADE PARSING ====================

@api_router.post("/voice/parse-trade")
async def voice_parse_trade(
    audio: UploadFile = File(...),
    user: User = Depends(get_current_user)
):
    """Parse voice recording into structured trade data (Premium or 1x/week free)"""
    # Check subscription for voice feature
    user_doc = await db.users.find_one({"user_id": user.user_id}, {"_id": 0})
    is_premium = False
    if user_doc and user_doc.get("subscription_tier") == "premium":
        expires_at = user_doc.get("subscription_expires_at")
        if expires_at:
            if isinstance(expires_at, str):
                expires_at = datetime.fromisoformat(expires_at.replace("Z", "+00:00"))
            is_premium = expires_at > datetime.now(timezone.utc)
    
    if not is_premium:
        # Check weekly voice usage for free users
        now = datetime.now(timezone.utc)
        voice_week_start = user_doc.get("voice_week_start") if user_doc else None
        voice_uses = user_doc.get("voice_uses_this_week", 0) if user_doc else 0
        
        if voice_week_start:
            if isinstance(voice_week_start, str):
                voice_week_start = datetime.fromisoformat(voice_week_start.replace("Z", "+00:00"))
            if (now - voice_week_start).days >= 7:
                voice_uses = 0
                voice_week_start = now
        else:
            voice_week_start = now
        
        if voice_uses >= 1:
            days_left = 7 - (now - voice_week_start).days
            raise HTTPException(
                status_code=403,
                detail=f"Free users get 1 voice log per week. Upgrade to Premium for unlimited! ({days_left} days until reset)"
            )
    
    try:
        # Save audio to temp file
        suffix = ".m4a" if audio.content_type and "m4a" in audio.content_type else ".wav"
        with tempfile.NamedTemporaryFile(suffix=suffix, delete=False) as tmp:
            content = await audio.read()
            if len(content) > 25 * 1024 * 1024:
                raise HTTPException(status_code=400, detail="Audio file too large (max 25MB)")
            tmp.write(content)
            tmp_path = tmp.name
        
        # Transcribe with Whisper
        stt = OpenAISpeechToText(api_key=os.getenv("EMERGENT_LLM_KEY"))
        with open(tmp_path, "rb") as audio_file:
            transcription = await stt.transcribe(
                file=audio_file,
                model="whisper-1",
                response_format="json",
                language="en",
                prompt="Trading trade entry. Instruments like XAUUSD, EURUSD, GBPUSD, NAS100, US30, BTC."
            )
        
        transcript_text = transcription.text
        logger.info(f"Voice transcription: {transcript_text}")
        
        # Clean up temp file
        os.unlink(tmp_path)
        
        # Extract structured data using LLM
        chat = LlmChat(
            api_key=os.getenv("EMERGENT_LLM_KEY"),
            session_id=f"voice_{user.user_id}_{uuid.uuid4().hex[:8]}",
            system_message="You are a trading data extraction assistant. Extract structured trade data from user speech. Return ONLY valid JSON, no markdown."
        ).with_model("openai", "gpt-5.2")
        
        extraction_prompt = f"""Extract structured trade data from this speech transcript:

"{transcript_text}"

Return ONLY this JSON format (use null for missing values):
{{
  "instrument": "XAUUSD",
  "trade_type": "buy",
  "entry_price": 2320.50,
  "stop_loss": 2310.00,
  "take_profit": 2340.00,
  "lot_size": 0.01,
  "notes": "breakout trade"
}}

Rules:
- instrument: uppercase trading pair (XAUUSD, EURUSD, etc.)
- trade_type: "buy" or "sell" or null
- entry_price, stop_loss, take_profit: numbers or null
- lot_size: number or null (default null)
- notes: any extra context mentioned"""
        
        ai_response = await chat.send_message(UserMessage(text=extraction_prompt))
        
        # Parse JSON from AI response
        try:
            # Strip markdown code blocks if present
            cleaned = ai_response.strip()
            if cleaned.startswith("```"):
                cleaned = cleaned.split("\n", 1)[1] if "\n" in cleaned else cleaned[3:]
            if cleaned.endswith("```"):
                cleaned = cleaned[:-3]
            cleaned = cleaned.strip()
            if cleaned.startswith("json"):
                cleaned = cleaned[4:].strip()
            
            trade_data = json.loads(cleaned)
        except json.JSONDecodeError:
            trade_data = {"instrument": None, "trade_type": None, "entry_price": None,
                         "stop_loss": None, "take_profit": None, "lot_size": None, "notes": transcript_text}
        
        # Increment voice usage for free users
        if not is_premium:
            now = datetime.now(timezone.utc)
            await db.users.update_one(
                {"user_id": user.user_id},
                {"$set": {
                    "voice_uses_this_week": (voice_uses or 0) + 1,
                    "voice_week_start": (voice_week_start or now).isoformat()
                }}
            )
        
        return {
            "success": True,
            "transcript": transcript_text,
            "trade_data": trade_data
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Voice parse error: {e}")
        # Clean up temp file on error
        try:
            os.unlink(tmp_path)
        except Exception:
            pass
        raise HTTPException(status_code=500, detail=f"Voice processing failed: {str(e)}")

# ==================== CALENDAR SUMMARY ====================

@api_router.get("/trades/calendar-summary")
async def get_calendar_summary(
    year: int = Query(default=None),
    month: int = Query(default=None),
    user: User = Depends(get_current_user)
):
    """Get daily trade summary for calendar view"""
    now = datetime.now(timezone.utc)
    if not year:
        year = now.year
    if not month:
        month = now.month
    
    # Build date range for the month
    start_date = datetime(year, month, 1, tzinfo=timezone.utc)
    if month == 12:
        end_date = datetime(year + 1, 1, 1, tzinfo=timezone.utc)
    else:
        end_date = datetime(year, month + 1, 1, tzinfo=timezone.utc)
    
    trades = await db.trades.find(
        {
            "user_id": user.user_id,
            "trade_date": {
                "$gte": start_date.isoformat(),
                "$lt": end_date.isoformat()
            }
        },
        {"_id": 0}
    ).to_list(1000)
    
    # Aggregate by day
    daily_summary = {}
    for trade in trades:
        trade_date_str = trade.get("trade_date", "")[:10]
        if trade_date_str not in daily_summary:
            daily_summary[trade_date_str] = {
                "date": trade_date_str,
                "trades": 0,
                "pnl": 0,
                "wins": 0,
                "losses": 0,
                "breakevens": 0,
            }
        day = daily_summary[trade_date_str]
        day["trades"] += 1
        day["pnl"] += trade.get("pnl", 0) or 0
        outcome = trade.get("outcome", "")
        if outcome == "win":
            day["wins"] += 1
        elif outcome == "loss":
            day["losses"] += 1
        elif outcome == "breakeven":
            day["breakevens"] += 1
    
    # Calculate result per day
    for day in daily_summary.values():
        if day["pnl"] > 0:
            day["result"] = "profit"
        elif day["pnl"] < 0:
            day["result"] = "loss"
        else:
            day["result"] = "breakeven" if day["trades"] > 0 else "none"
    
    # Month stats
    total_trades = sum(d["trades"] for d in daily_summary.values())
    total_wins = sum(d["wins"] for d in daily_summary.values())
    total_losses_count = sum(d["losses"] for d in daily_summary.values())
    closed = total_wins + total_losses_count
    win_rate = (total_wins / closed * 100) if closed > 0 else 0
    green_days = sum(1 for d in daily_summary.values() if d["result"] == "profit")
    red_days = sum(1 for d in daily_summary.values() if d["result"] == "loss")
    total_pnl = sum(d["pnl"] for d in daily_summary.values())
    
    return {
        "year": year,
        "month": month,
        "days": list(daily_summary.values()),
        "stats": {
            "total_trades": total_trades,
            "win_rate": round(win_rate, 1),
            "green_days": green_days,
            "red_days": red_days,
            "total_pnl": round(total_pnl, 2)
        }
    }


# ==================== EXPORT & SHARE ====================

@api_router.get("/export/trades")
async def export_trades(
    format: str = Query("json", enum=["json", "csv"]),
    user: User = Depends(get_current_user)
):
    """Export trades (Premium: Excel/CSV, Free: JSON only)"""
    user_doc = await db.users.find_one({"user_id": user.user_id}, {"_id": 0})
    is_premium = user_doc.get("subscription_tier") == "premium" if user_doc else False
    
    # Free users can only export JSON
    if format != "json" and not is_premium:
        raise HTTPException(
            status_code=403,
            detail="CSV/Excel export is a Premium feature. Upgrade to access this feature!"
        )
    
    # Get all trades
    trades = await db.trades.find(
        {"user_id": user.user_id},
        {"_id": 0}
    ).sort("created_at", -1).to_list(10000)
    
    if format == "json":
        return {"trades": trades, "count": len(trades)}
    
    elif format == "csv":
        import csv
        from io import StringIO
        
        output = StringIO()
        if trades:
            writer = csv.DictWriter(output, fieldnames=trades[0].keys())
            writer.writeheader()
            writer.writerows(trades)
        
        csv_content = output.getvalue()
        
        return Response(
            content=csv_content,
            media_type="text/csv",
            headers={"Content-Disposition": "attachment; filename=edgelog_trades.csv"}
        )

@api_router.get("/export/report/{report_id}")
async def export_report(
    report_id: str,
    format: str = Query("json", enum=["json", "pdf"]),
    user: User = Depends(get_current_user)
):
    """Export a specific report"""
    user_doc = await db.users.find_one({"user_id": user.user_id}, {"_id": 0})
    is_premium = user_doc.get("subscription_tier") == "premium" if user_doc else False
    
    if format == "pdf" and not is_premium:
        raise HTTPException(
            status_code=403,
            detail="PDF export is a Premium feature. Upgrade to access this feature!"
        )
    
    report = await db.reports.find_one(
        {"report_id": report_id, "user_id": user.user_id},
        {"_id": 0}
    )
    
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")
    
    if format == "json":
        return report
    
    # Generate actual PDF
    from reportlab.lib import colors
    from reportlab.lib.pagesizes import letter
    from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle
    from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
    from io import BytesIO
    
    buffer = BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=letter, topMargin=50, bottomMargin=50)
    styles = getSampleStyleSheet()
    
    # Custom styles
    title_style = ParagraphStyle(
        'CustomTitle',
        parent=styles['Heading1'],
        fontSize=24,
        spaceAfter=20,
        textColor=colors.HexColor('#22c55e')
    )
    
    subtitle_style = ParagraphStyle(
        'CustomSubtitle',
        parent=styles['Normal'],
        fontSize=12,
        textColor=colors.gray
    )
    
    elements = []
    
    # Header
    elements.append(Paragraph("EdgeLog Performance Report", title_style))
    elements.append(Paragraph(f"Period: {report.get('period', 'Weekly').title()}", subtitle_style))
    elements.append(Paragraph(f"Generated: {report.get('generated_at', '')[:10]}", subtitle_style))
    elements.append(Spacer(1, 20))
    
    # Report data
    report_data = report.get('report_data', {})
    
    # Summary table
    summary_data = [
        ['Metric', 'Value'],
        ['Total Trades', str(report_data.get('total_trades', 0))],
        ['Win Rate', f"{report_data.get('win_rate', 0):.1f}%"],
        ['Total P&L', f"${report_data.get('total_pnl', 0):.2f}"],
        ['Profit Factor', f"{report_data.get('profit_factor', 0):.2f}"],
        ['Average Win', f"${report_data.get('avg_win', 0):.2f}"],
        ['Average Loss', f"${report_data.get('avg_loss', 0):.2f}"],
        ['Discipline Score', f"{report_data.get('discipline_score', 0):.0f}%"],
    ]
    
    table = Table(summary_data, colWidths=[200, 200])
    table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#1a1a1a')),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.HexColor('#22c55e')),
        ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, 0), 12),
        ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
        ('BACKGROUND', (0, 1), (-1, -1), colors.HexColor('#0a0a0a')),
        ('TEXTCOLOR', (0, 1), (-1, -1), colors.white),
        ('FONTNAME', (0, 1), (-1, -1), 'Helvetica'),
        ('FONTSIZE', (0, 1), (-1, -1), 11),
        ('GRID', (0, 0), (-1, -1), 1, colors.HexColor('#333333')),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('TOPPADDING', (0, 0), (-1, -1), 8),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
    ]))
    elements.append(table)
    elements.append(Spacer(1, 30))
    
    # AI Insights
    ai_insights = report.get('ai_insights', '')
    if ai_insights:
        elements.append(Paragraph("AI Insights", styles['Heading2']))
        elements.append(Spacer(1, 10))
        for line in ai_insights.split('\n'):
            if line.strip():
                elements.append(Paragraph(line, styles['Normal']))
                elements.append(Spacer(1, 5))
    
    elements.append(Spacer(1, 30))
    elements.append(Paragraph("Generated by EdgeLog - Your Trading Edge, Journaled", subtitle_style))
    
    doc.build(elements)
    
    pdf_content = buffer.getvalue()
    buffer.close()
    
    return Response(
        content=pdf_content,
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename=edgelog_report_{report_id}.pdf"}
    )

# ==================== WELL-KNOWN / ASSET LINKS ====================

@app.get("/.well-known/assetlinks.json")
async def asset_links():
    """Serve Android App Links assetlinks.json for deep link verification"""
    return [
        {
            "relation": ["delegate_permission/common.handle_all_urls"],
            "target": {
                "namespace": "android_app",
                "package_name": "com.edgelog.app",
                "sha256_cert_fingerprints": [
                    "6B:AA:80:2E:74:FB:BA:FD:7B:9E:5F:B4:E6:4B:8B:E8:22:42:2A:F4:33:3D:B2:E5:54:92:83:11:0A:5E:15:11"
                ]
            }
        }
    ]

# ==================== PRIVACY POLICY & TERMS ====================

@app.get("/privacy", response_class=HTMLResponse)
async def privacy_policy():
    """Serve Privacy Policy page"""
    return HTMLResponse(content="""<!DOCTYPE html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>EdgeLog - Privacy Policy</title>
<style>*{margin:0;padding:0;box-sizing:border-box}body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background:#000;color:#ccc;padding:24px;max-width:700px;margin:0 auto;line-height:1.7}h1{color:#22c55e;font-size:28px;margin-bottom:8px}h2{color:#fff;font-size:18px;margin:24px 0 8px}p,li{font-size:14px;margin-bottom:8px}.updated{color:#888;font-size:12px;margin-bottom:24px}</style>
</head><body>
<h1>Privacy Policy</h1>
<p class="updated">Last updated: April 2026</p>
<p>EdgeLog ("we", "our", "us") is a trading journal application. This Privacy Policy explains how we collect, use, and protect your information.</p>
<h2>1. Information We Collect</h2>
<ul><li>Name and email (from your Google account)</li><li>Trading data you enter (pairs, prices, P/L, notes)</li><li>Voice recordings (processed in real-time, not stored)</li><li>App usage analytics</li></ul>
<h2>2. How We Use Your Information</h2>
<ul><li>To provide and improve the trading journal service</li><li>To generate AI-powered performance reports</li><li>To process voice trade entries</li><li>To manage your subscription</li></ul>
<h2>3. Data Storage & Security</h2>
<p>Your data is stored securely using MongoDB Atlas with encryption at rest. We use HTTPS for all data transmission. Voice recordings are processed in real-time and are not stored on our servers.</p>
<h2>4. Third-Party Services</h2>
<ul><li><strong>Google Sign-In:</strong> For authentication</li><li><strong>Apple Sign-In:</strong> For authentication (iOS)</li><li><strong>OpenAI:</strong> For AI reports and voice processing</li><li><strong>RevenueCat:</strong> For subscription management</li><li><strong>Google AdMob:</strong> For displaying ads (free tier)</li><li><strong>Cloudinary:</strong> For image storage</li></ul>
<h2>5. Data Retention</h2>
<p>Free tier: Trade data retained for 14 days. Premium: Unlimited retention. You can delete your data at any time.</p>
<h2>6. Your Rights</h2>
<p>You can request deletion of your account and all associated data by contacting us.</p>
<h2>7. Contact</h2>
<p>For privacy inquiries: ck.ravuri@gmail.com</p>
</body></html>""")

@app.get("/terms", response_class=HTMLResponse)
async def terms_of_service():
    """Serve Terms of Service page"""
    return HTMLResponse(content="""<!DOCTYPE html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>EdgeLog - Terms of Service</title>
<style>*{margin:0;padding:0;box-sizing:border-box}body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background:#000;color:#ccc;padding:24px;max-width:700px;margin:0 auto;line-height:1.7}h1{color:#22c55e;font-size:28px;margin-bottom:8px}h2{color:#fff;font-size:18px;margin:24px 0 8px}p,li{font-size:14px;margin-bottom:8px}.updated{color:#888;font-size:12px;margin-bottom:24px}</style>
</head><body>
<h1>Terms of Service</h1>
<p class="updated">Last updated: April 2026</p>
<h2>1. Acceptance of Terms</h2>
<p>By using EdgeLog, you agree to these terms. If you do not agree, do not use the app.</p>
<h2>2. Account</h2>
<p>You must create an account using Google Sign-In to use the App. You are responsible for maintaining the security of your account.</p>
<h2>3. Subscriptions</h2>
<p>EdgeLog offers free and premium tiers. Premium subscriptions are billed monthly ($5.99) or yearly ($49.99). Payments are processed through Apple App Store or Google Play Store.</p>
<h2>4. Voice Feature</h2>
<p>Voice trade logging processes audio in real-time using AI. Recordings are not stored. Free users: 1 voice log per week. Premium users: unlimited.</p>
<h2>5. Content</h2>
<p>You retain ownership of all trading data you enter. We do not share your trading data with third parties except as required to provide the service.</p>
<h2>6. AI Reports</h2>
<p>AI-generated insights are for informational purposes only and do not constitute financial advice. Trading involves risk.</p>
<h2>7. Disclaimer</h2>
<p>EdgeLog is a journaling tool, not a trading platform. We are not responsible for trading decisions or financial losses.</p>
<h2>8. Changes</h2>
<p>We may update these terms. Continued use constitutes acceptance of changes.</p>
<h2>9. Contact</h2>
<p>Questions: ck.ravuri@gmail.com</p>
</body></html>""")



# ==================== HEALTH CHECK ====================

@api_router.get("/")
async def root():
    return {"message": "EdgeLog API", "version": "1.0.0"}

@api_router.get("/health")
async def health_check():
    return {"status": "healthy", "timestamp": datetime.now(timezone.utc).isoformat()}

# Include the router in the main app
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
