import asyncio
import requests
import json
from fastapi import WebSocket
from concurrent.futures import ThreadPoolExecutor, as_completed
from typing import Dict, Any, List
from bs4 import BeautifulSoup
import datetime
from zoneinfo import ZoneInfo
from .data_history import get_prev_close
from app.services.trigger import check_parallel_triggers
from app.core.database import SessionLocal

# ------------------ CONFIG ------------------
TICKERS = [
    "ADANIENT", "ADANIPORTS", "APOLLOHOSP", "ASIANPAINT", "AXISBANK",
    "BAJAJ-AUTO", "BAJAJFINSV", "BAJFINANCE", "BEL", "BHARTIARTL",
    "CIPLA", "COALINDIA", "DRREDDY", "EICHERMOT", "ETERNAL",
    "GRASIM", "HCLTECH", "HDFCBANK", "HDFCLIFE", "HEROMOTOCO",
    "HINDALCO", "HINDUNILVR", "ICICIBANK", "INFY", "ITC",
    "RELIANCE", "SBILIFE", "TCS", "MARUTI", "SUNPHARMA",
    "TITAN", "ULTRACEMCO", "NTPC", "ONGC", "JIOFIN",
    "JSWSTEEL", "TRENT", "TATASTEEL", "TMPV", "TATACONSUM",
    "TECHM", "WIPRO", "INDIGO", "NESTLEIND", "M&M",
    "POWERGRID", "SBIN", "LT", "PIDILITIND", "BOSCHLTD"
]

# ------------------ GLOBAL STATE ------------------

ID_MAP = {t: i + 1 for i, t in enumerate(TICKERS)}
ID_MAP_REVERSE = {v: k for k, v in ID_MAP.items()}

MAX_WORKERS = 10
PRICE_CLASS = "YMlKec fxKbKc"
HEADERS = {"User-Agent": "Mozilla/5.0"}

CACHE: Dict[int, Dict[str, Any]] = {}
PREV_CLOSE_CACHE = {} 
LAST_REFRESH_DATE = None
SCRAPER_RUNNING = False

EXECUTOR = ThreadPoolExecutor(max_workers=MAX_WORKERS)

# ------------------ WEBSOCKET MANAGER ------------------
class ConnectionManager:
    def __init__(self):
        self.active_connections: List[WebSocket] = []
        self.user_connections: Dict[int, WebSocket] = {}

    # FIX 1: Add user_id parameter here
    async def connect(self, websocket: WebSocket, user_id: int = None):
        await websocket.accept()
        self.active_connections.append(websocket)
        
        # FIX 2: Store the user connection if user_id is provided
        if user_id is not None:
            self.user_connections[user_id] = websocket
            print(f"User {user_id} connected to private channel")

        # Send initial data if available
        # (Assuming CACHE is defined globally in this file)
        if 'CACHE' in globals() and globals()['CACHE']:
             try:
                await websocket.send_text(json.dumps({"type": "update", "data": globals()['CACHE']}))
             except Exception:
                pass # Connection might be unstable, let disconnect handle it later

    # FIX 3: Add user_id to disconnect logic
    def disconnect(self, websocket: WebSocket, user_id: int = None):
        if websocket in self.active_connections:
            self.active_connections.remove(websocket)
        
        if user_id and user_id in self.user_connections:
            del self.user_connections[user_id]

    async def broadcast(self, message: str):
        dead = []
        for ws in self.active_connections:
            try:
                await ws.send_text(message)
            except Exception:
                dead.append(ws)
        for ws in dead:
            self.active_connections.remove(ws)

    # FIX 4: Renamed to match trigger.py calls
    async def send_personal_message(self, message: dict, user_id: int):
        if user_id in self.user_connections:
            websocket = self.user_connections[user_id]
            try:
                await websocket.send_json(message)
            except Exception as e:
                print(f"Failed to send personal message to {user_id}: {e}")
                # Optional: cleanup if dead
                # del self.user_connections[user_id]

manager = ConnectionManager()

# ------------------ SCRAPER FUNCTIONS ------------------
def fetch_price(ticker: str) -> float | None:
    """Fetch stock price from Google Finance"""
    url = f"https://www.google.com/finance/quote/{ticker}:NSE"
    try:
        r = requests.get(url, headers=HEADERS, timeout=5)
        if r.status_code != 200:
            return None
        soup = BeautifulSoup(r.text, "html.parser")
        tag = soup.find(class_=PRICE_CLASS)
        if tag:
            return float(tag.text.strip().replace("₹", "").replace(",", ""))
    except Exception:
        return None
    return None

def fetch_all() -> Dict[int, Dict[str, Any]]:

    results: Dict[int, Dict[str, Any]] = {}
    futures = {EXECUTOR.submit(fetch_price, t): t for t in TICKERS}

    for fut in as_completed(futures):
        ticker = futures[fut]
        try:
            price = fut.result()
        except Exception:
            price = None
        if price is not None:
            sid = ID_MAP[ticker]
            results[sid] = {"stock_id": sid, "name": ticker, "price": price}

    return results

def calculate_day_change(current_data, previous_close_data):
    """
    Adds prev_close and calculates day_change for the cache
    """
    for sid, stock in current_data.items():
        prev_price = previous_close_data.get(sid, 0)
        stock["prev_close"] = prev_price
        
        if prev_price > 0:
            diff = stock["price"] - prev_price
            stock["day_change"] = round((diff / prev_price) * 100, 2)
        else:
            stock["day_change"] = 0.0
    return current_data

# ------------------ SCRAPER LOOP ------------------
async def scraper_loop():
    """Main scraper loop: fetch prices and broadcast"""
    global CACHE, PREV_CLOSE_CACHE, LAST_REFRESH_DATE, SCRAPER_RUNNING
    loop = asyncio.get_running_loop()
    ist = ZoneInfo("Asia/Kolkata")
    print("Scraper loop started")

    while SCRAPER_RUNNING:
        now = datetime.datetime.now(ist)


        if LAST_REFRESH_DATE != now.date() and now.hour >= 9:
            PREV_CLOSE_DATA = await loop.run_in_executor(None, get_prev_close, TICKERS, ID_MAP)
            LAST_REFRESH_DATE = now.date()
        
        # Initial run fallback
        if not PREV_CLOSE_DATA:
            PREV_CLOSE_DATA = await loop.run_in_executor(None, get_prev_close, TICKERS, ID_MAP)

        new_data = await loop.run_in_executor(EXECUTOR, fetch_all)
        new_data = calculate_day_change(new_data, PREV_CLOSE_DATA)

        if new_data:
            CACHE = new_data

            async with SessionLocal() as db:
                await check_parallel_triggers(db, new_data)

            await manager.broadcast(json.dumps({"type": "update", "data": CACHE}))

        await asyncio.sleep(2)

    print("Scraper loop stopped")
