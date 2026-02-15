from fastapi import FastAPI, APIRouter, HTTPException, Request, Response, Depends
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
import httpx
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict
from typing import List, Optional
import uuid
from datetime import datetime, timezone, timedelta
from enum import Enum

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

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

class User(BaseModel):
    model_config = ConfigDict(extra="ignore")
    user_id: str
    email: str
    name: str
    picture: Optional[str] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    max_trades_per_day: int = 5  # User-defined discipline rule

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
    trading_pair: str  # e.g., XAUUSD, EURUSD
    trade_type: TradeType
    entry_price: float
    stop_loss: Optional[float] = None
    take_profit: Optional[float] = None
    lot_size: float
    trade_date: datetime
    close_price: Optional[float] = None
    outcome: TradeOutcome = TradeOutcome.OPEN
    pnl: Optional[float] = None  # Profit/Loss in pips or currency
    notes: Optional[str] = None
    emotion_before: Optional[str] = None  # e.g., "confident", "anxious", "neutral"
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

class TradeUpdate(BaseModel):
    close_price: Optional[float] = None
    outcome: Optional[TradeOutcome] = None
    pnl: Optional[float] = None
    notes: Optional[str] = None

class DisciplineSettings(BaseModel):
    max_trades_per_day: int = 5

class ReminderSettings(BaseModel):
    daily_reminder_enabled: bool = False
    reminder_time: Optional[str] = None  # e.g., "20:00"

# ==================== AUTH HELPERS ====================

async def get_current_user(request: Request) -> User:
    """Get current user from session token (cookie or header)"""
    # Try cookie first
    session_token = request.cookies.get("session_token")
    
    # Fallback to Authorization header
    if not session_token:
        auth_header = request.headers.get("Authorization")
        if auth_header and auth_header.startswith("Bearer "):
            session_token = auth_header.split(" ")[1]
    
    if not session_token:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    # Find session
    session_doc = await db.user_sessions.find_one(
        {"session_token": session_token},
        {"_id": 0}
    )
    
    if not session_doc:
        raise HTTPException(status_code=401, detail="Invalid session")
    
    # Check expiry
    expires_at = session_doc["expires_at"]
    if isinstance(expires_at, str):
        expires_at = datetime.fromisoformat(expires_at)
    if expires_at.tzinfo is None:
        expires_at = expires_at.replace(tzinfo=timezone.utc)
    if expires_at < datetime.now(timezone.utc):
        raise HTTPException(status_code=401, detail="Session expired")
    
    # Get user
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
    
    # Call Emergent Auth to get user data
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
    
    # Check if user exists
    existing_user = await db.users.find_one(
        {"email": user_data["email"]},
        {"_id": 0}
    )
    
    if existing_user:
        user_id = existing_user["user_id"]
        # Update user info
        await db.users.update_one(
            {"user_id": user_id},
            {"$set": {
                "name": user_data["name"],
                "picture": user_data.get("picture")
            }}
        )
    else:
        # Create new user
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
    
    # Create session
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
    
    # Get user data to return
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
    
    # Return without _id
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
    """Update a trade (close it, set outcome, etc.)"""
    # Check trade exists and belongs to user
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
    
    # Get all trades within free plan period
    all_trades = await db.trades.find(
        {
            "user_id": user.user_id,
            "created_at": {"$gte": cutoff_date.isoformat()}
        },
        {"_id": 0}
    ).to_list(1000)
    
    # Get today's trades
    today_trades = [t for t in all_trades if t.get("trade_date", "") >= today_start.isoformat()]
    
    # Calculate stats
    total_trades = len(all_trades)
    today_count = len(today_trades)
    
    wins = len([t for t in all_trades if t.get("outcome") == "win"])
    losses = len([t for t in all_trades if t.get("outcome") == "loss"])
    breakevens = len([t for t in all_trades if t.get("outcome") == "breakeven"])
    open_trades = len([t for t in all_trades if t.get("outcome") == "open"])
    
    # Win rate
    closed_trades = wins + losses + breakevens
    win_rate = (wins / closed_trades * 100) if closed_trades > 0 else 0
    
    # Total P&L
    total_pnl = sum(t.get("pnl", 0) or 0 for t in all_trades)
    
    # Average Risk-Reward (for trades with SL and TP)
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
    
    # Discipline score
    max_trades = user.max_trades_per_day
    discipline_score = 100
    if today_count > max_trades:
        # Reduce score by 10% for each extra trade
        over_trades = today_count - max_trades
        discipline_score = max(0, 100 - (over_trades * 20))
    
    # Days remaining
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
    
    # Group by date
    daily_data = {}
    for trade in trades:
        trade_date = trade.get("trade_date", "")[:10]  # Get YYYY-MM-DD
        if trade_date not in daily_data:
            daily_data[trade_date] = {"date": trade_date, "trades": 0, "pnl": 0, "wins": 0, "losses": 0}
        
        daily_data[trade_date]["trades"] += 1
        daily_data[trade_date]["pnl"] += trade.get("pnl", 0) or 0
        
        if trade.get("outcome") == "win":
            daily_data[trade_date]["wins"] += 1
        elif trade.get("outcome") == "loss":
            daily_data[trade_date]["losses"] += 1
    
    # Sort by date
    result = sorted(daily_data.values(), key=lambda x: x["date"])
    return result

# ==================== SETTINGS ENDPOINTS ====================

@api_router.put("/settings/discipline")
async def update_discipline_settings(
    settings: DisciplineSettings,
    user: User = Depends(get_current_user)
):
    """Update discipline settings (max trades per day)"""
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
    """Cleanup trades older than 14 days (run as cron job)"""
    cutoff_date = datetime.now(timezone.utc) - timedelta(days=FREE_PLAN_DAYS)
    result = await db.trades.delete_many(
        {"created_at": {"$lt": cutoff_date.isoformat()}}
    )
    return {"deleted_count": result.deleted_count}

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
