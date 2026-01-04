from fastapi import APIRouter, Depends, HTTPException, WebSocket, WebSocketDisconnect
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List

from app.core.database import get_db
from app.crud import portfolio as portfolio_crud
from app.crud import trigger as trigger_crud
from app.schemas.portfolio import PortfolioItem, TradeRequest, TriggerRequest
from app.api.dependencies import get_current_user_id 
# Note: "scraper_service" alias helps avoid confusion with the API file name
from app.services import scraper_engine as scraper_service 
from app.services.trigger import add_to_trigger_cache

router = APIRouter()

@router.get("/{user_id}", response_model=List[PortfolioItem])
async def get_portfolio(user_id: int, db: AsyncSession = Depends(get_db)):
    items = await portfolio_crud.get_portfolio_by_user(db, user_id)
    response = []
    
    for item in items:
        name = scraper_service.ID_MAP_REVERSE.get(item.stock_id, "Unknown")
        cached = scraper_service.CACHE.get(item.stock_id, {})
        live_price = cached.get("price")
        day_change = cached.get("day_change", 0.0)
        
        if live_price is None:
            live_price = item.buy_price

        current_val = item.quantity * live_price
        pnl = (float(live_price) - float(item.buy_price)) * float(item.quantity)

        response.append({
            "stock_id": item.stock_id,
            "stock_name": name,
            "quantity": item.quantity,
            "buy_price": item.buy_price,
            "current_price": live_price,
            "day_change": day_change,
            "current_value": round(current_val, 2),
            "pnl": round(pnl, 2)
        })
    return response

@router.post("/buy")
async def buy_stock(req: TradeRequest, user_id: int = Depends(get_current_user_id), db: AsyncSession = Depends(get_db)):
    if req.quantity < 1:
        raise HTTPException(status_code=400, detail="Quantity must be positive")
    await portfolio_crud.buy_stock(db, user_id, req.stock_id, req.quantity, req.price)
    return {"message": "Stock purchased successfully"}

@router.post("/sell")
async def sell_stock(req: TradeRequest, user_id: int = Depends(get_current_user_id), db: AsyncSession = Depends(get_db)):
    if req.quantity < 1:
        raise HTTPException(status_code=400, detail="Quantity must be positive")
    try:
        await portfolio_crud.sell_stock(db, user_id, req.stock_id, req.quantity, req.price)
        return {"message": "Stock sold successfully"}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    
@router.post("/trigger")
async def set_trigger_order(req: TriggerRequest, user_id: int = Depends(get_current_user_id), db: AsyncSession = Depends(get_db)):
    try:
        new_trigger = await trigger_crud.create_trigger_order(
            db=db,
            user_id=user_id,
            stock_id=req.stock_id,
            quantity=req.quantity,
            target_price=req.target_price,
            order_type=req.order_type
        )

        await add_to_trigger_cache(new_trigger)

        return {
            "status": "success", 
            "message": "Trigger order placed and active in trigger order engine",
            "trigger_id": new_trigger.trigger_id
        }
    except Exception as e:
        # Rollback is handled inside CRUD, but safety check here
        raise HTTPException(status_code=500, detail=f"Trigger Error: {str(e)}")

# @router.websocket("/ws/portfolio/{user_id}")
# async def portfolio_websocket(websocket: WebSocket):
#     await scraper_service.manager.connect(websocket)
#     try:
#         while True:
#             await websocket.receive_text()
#     except WebSocketDisconnect:
#         scraper_service.manager.disconnect(websocket)

@router.websocket("/ws/market")
async def portfolio_websocket(websocket: WebSocket, user_id: int = None):
    await scraper_service.manager.connect(websocket, user_id)
    try:
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        scraper_service.manager.disconnect(websocket, user_id)