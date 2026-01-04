from fastapi import APIRouter
import asyncio
from app.services import scraper_engine as scraper_service

router = APIRouter()

@router.post("/start")
async def start_scraper():
    if scraper_service.SCRAPER_RUNNING:
        return {"message": "Scraper is already running."}
    scraper_service.SCRAPER_RUNNING = True
    asyncio.create_task(scraper_service.scraper_loop())
    return {"message": "Scraper started successfully."}

@router.post("/stop")
async def stop_scraper():
    if not scraper_service.SCRAPER_RUNNING:
        return {"message": "Scraper is not running."}
    scraper_service.SCRAPER_RUNNING = False
    return {"message": "Scraper stopped."}