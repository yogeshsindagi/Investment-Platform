from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import asyncio

from app.core.database import engine, SessionLocal
from app.models.sql_models import Base
from app.services import scraper_engine as scraper_service 
from app.services.trigger import initialize_trigger_cache
from app.api import auth, portfolio, scraper, chat
# --- Lifecycle Manager ---
@asynccontextmanager
async def lifespan(app: FastAPI):
    # 1. Create Tables
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    async with SessionLocal() as db:
        await initialize_trigger_cache(db)
    
    # 2. Start the Scraper Loop
    scraper_service.SCRAPER_RUNNING = True
    asyncio.create_task(scraper_service.scraper_loop())

    yield
    
    # 3. Cleanup
    scraper_service.SCRAPER_RUNNING = False
    await engine.dispose()

app = FastAPI(title="Stock Platform API", lifespan=lifespan)

# --- CORS ---
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"], 
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- Routers ---
app.include_router(auth.router, prefix="/api", tags=["Auth"])
app.include_router(portfolio.router, prefix="/api/portfolio", tags=["Portfolio"])
# app.include_router(portfolio.router, tags=["PortfolioWS"]) 
app.include_router(scraper.router, prefix="/api/scraper", tags=["Scraper"])
app.include_router(chat.router,prefix="/api", tags=["Chatbot"])

@app.get("/")
def read_root():
    return {"message": "Stock Platform API is running"}

# --- Health Check endpoint for uptime monitoring ---#
@app.get("/health")
@app.head("/health")
def health_check():
    return {"status": "ok"}
