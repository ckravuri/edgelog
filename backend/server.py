from fastapi import FastAPI, APIRouter, HTTPException, Request, Response, Depends, Query
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
import jwt
from jwt.algorithms import RSAAlgorithm
import json

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
        user_id = f"user_{uuid.uuid4().hex[:12]}"
        new_user = {
            "user_id": user_id,
            "email": user_data["email"],
            "name": user_data["name"],
            "picture": user_data.get("picture"),
            "created_at": datetime.now(timezone.utc).isoformat(),
            "max_trades_per_day": 5
        }
        await db.users.insert_one(new_user)
    
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
    session_token = request.cookies.get("session_token")
    if session_token:
        await db.user_sessions.delete_many({"session_token": session_token})
    
    response.delete_cookie(key="session_token", path="/")
    return {"message": "Logged out"}

# ==================== APPLE SIGN-IN ====================

class AppleSignInRequest(BaseModel):
    identity_token: str
    user_id: str
    email: Optional[str] = None
    name: Optional[str] = None

APPLE_PUBLIC_KEY_URL = "https://appleid.apple.com/auth/keys"
APPLE_APP_ID = "com.ravuri.edgelog"  # Your bundle identifier

async def fetch_apple_public_keys():
    """Fetch Apple's public keys for token verification"""
    async with httpx.AsyncClient() as client_http:
        response = await client_http.get(APPLE_PUBLIC_KEY_URL)
        if response.status_code != 200:
            raise HTTPException(status_code=503, detail="Unable to fetch Apple public keys")
        return response.json()

def verify_apple_identity_token(identity_token: str, apple_keys: dict) -> dict:
    """Verify the Apple identity token and return decoded claims"""
    try:
        # Get the unverified header to find the key ID
        unverified_header = jwt.get_unverified_header(identity_token)
        kid = unverified_header.get('kid')
        
        if not kid:
            raise ValueError("Token missing 'kid' in header")
        
        # Find the matching public key
        matching_key = None
        for key in apple_keys.get('keys', []):
            if key.get('kid') == kid:
                matching_key = key
                break
        
        if not matching_key:
            raise ValueError(f"No matching key found for kid: {kid}")
        
        # Convert JWK to RSA public key
        public_key = RSAAlgorithm.from_jwk(json.dumps(matching_key))
        
        # Verify and decode the token
        decoded_token = jwt.decode(
            identity_token,
            public_key,
            algorithms=['RS256'],
            audience=APPLE_APP_ID,
            options={"verify_aud": True}
        )
        
        return decoded_token
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Apple identity token has expired")
    except jwt.InvalidAudienceError:
        raise HTTPException(status_code=401, detail="Token audience does not match")
    except jwt.InvalidSignatureError:
        raise HTTPException(status_code=401, detail="Token signature verification failed")
    except Exception as e:
        logger.error(f"Apple token verification failed: {str(e)}")
        raise HTTPException(status_code=401, detail="Failed to verify Apple identity token")

@api_router.post("/auth/apple")
async def apple_sign_in(request: AppleSignInRequest, response: Response):
    """Handle Apple Sign-In authentication"""
    try:
        # Fetch Apple's public keys
        apple_keys = await fetch_apple_public_keys()
        
        # Verify the identity token
        decoded_token = verify_apple_identity_token(request.identity_token, apple_keys)
        
        # Extract user info from token
        apple_user_id = decoded_token.get('sub')  # Unique Apple user ID
        email = decoded_token.get('email') or request.email
        _ = decoded_token.get('is_private_email', False)
        
        if not apple_user_id:
            raise HTTPException(status_code=401, detail="Token does not contain user identifier")
        
        # Check if user exists (by apple_user_id or email)
        existing_user = await db.users.find_one(
            {"$or": [
                {"apple_user_id": apple_user_id},
                {"email": email} if email else {"_id": None}
            ]},
            {"_id": 0}
        )
        
        if existing_user:
            user_id = existing_user["user_id"]
            # Update with Apple ID if not set
            update_data = {"apple_user_id": apple_user_id}
            if request.name and not existing_user.get("name"):
                update_data["name"] = request.name
            await db.users.update_one(
                {"user_id": user_id},
                {"$set": update_data}
            )
        else:
            # Create new user
            user_id = f"user_{uuid.uuid4().hex[:12]}"
            name = request.name or email.split('@')[0] if email else "Apple User"
            new_user = {
                "user_id": user_id,
                "apple_user_id": apple_user_id,
                "email": email,
                "name": name,
                "picture": None,
                "created_at": datetime.now(timezone.utc).isoformat(),
                "max_trades_per_day": 5
            }
            await db.users.insert_one(new_user)
        
        # Create session
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
        
        # Set cookie
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
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Apple sign-in error: {str(e)}")
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
    
    return {
        "subscription_tier": "premium" if is_premium else "free",
        "is_premium": is_premium,
        "expires_at": expires_at,
        "ai_reports_used": ai_reports_this_week,
        "ai_reports_limit": None if is_premium else 1,
        "features": {
            "ads_free": is_premium,
            "unlimited_history": is_premium,
            "unlimited_ai_reports": is_premium,
            "mt4_mt5_import": is_premium,
            "export_share": is_premium
        }
    }

@api_router.post("/subscription/webhook")
async def subscription_webhook(request: Request):
    """Handle RevenueCat webhook for subscription updates"""
    try:
        body = await request.json()
        event_type = body.get("event", {}).get("type")
        app_user_id = body.get("event", {}).get("app_user_id")
        
        if not app_user_id:
            return {"status": "ignored", "reason": "no app_user_id"}
        
        # Find user by RevenueCat ID or email
        user = await db.users.find_one(
            {"$or": [
                {"revenuecat_user_id": app_user_id},
                {"user_id": app_user_id}
            ]},
            {"_id": 0}
        )
        
        if not user:
            logger.warning(f"User not found for RevenueCat ID: {app_user_id}")
            return {"status": "ignored", "reason": "user not found"}
        
        if event_type in ["INITIAL_PURCHASE", "RENEWAL", "PRODUCT_CHANGE"]:
            # Activate premium
            expiration = body.get("event", {}).get("expiration_at_ms")
            expires_at = datetime.fromtimestamp(expiration / 1000, tz=timezone.utc) if expiration else None
            
            await db.users.update_one(
                {"user_id": user["user_id"]},
                {"$set": {
                    "subscription_tier": "premium",
                    "subscription_expires_at": expires_at.isoformat() if expires_at else None,
                    "revenuecat_user_id": app_user_id
                }}
            )
            logger.info(f"Premium activated for user: {user['user_id']}")
            
        elif event_type in ["CANCELLATION", "EXPIRATION"]:
            # Downgrade to free
            await db.users.update_one(
                {"user_id": user["user_id"]},
                {"$set": {"subscription_tier": "free"}}
            )
            logger.info(f"Premium cancelled for user: {user['user_id']}")
        
        return {"status": "success"}
        
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
    
    # For PDF, return data that frontend can use to generate PDF
    # (actual PDF generation done client-side for better formatting)
    return {
        "report": report,
        "export_format": "pdf_data",
        "message": "Use this data to generate PDF on client side"
    }

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
