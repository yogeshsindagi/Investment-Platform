import asyncio
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.models.sql_models import OrderTrigger
from app.crud.portfolio import buy_stock, sell_stock 

# The 'trigger_cache' stores pending orders grouped by stock_id for O(1) lookup
# Format: { "1": [OrderTrigger, OrderTrigger], "2": [...] }

# trigger_cache = { "101": [OrderTrigger(trigger_id=1, user_id=55, stock_id=101, type="B", target=140.00)] }
trigger_cache = {}

async def initialize_trigger_cache(db: AsyncSession):
    """
    Loads all 'P' (Pending) triggers from TiDB into memory at server startup.
    """
    global trigger_cache
    
    # query_pending_orders is a descriptive name for the SQL statement
    query_pending_orders = select(OrderTrigger).where(OrderTrigger.status == "P")
    
    result = await db.execute(query_pending_orders)
    pending_orders = result.scalars().all()
    
    # Clear and rebuild the cache
    trigger_cache = {}
    for order in pending_orders:
        stock_id_key = str(order.stock_id)
        if stock_id_key not in trigger_cache:
            trigger_cache[stock_id_key] = []
        trigger_cache[stock_id_key].append(order)
    
async def add_to_trigger_cache(new_order: OrderTrigger):
    """Adds a single new order to the memory cache immediately."""
    stock_id_key = str(new_order.stock_id)
    if stock_id_key not in trigger_cache:
        trigger_cache[stock_id_key] = []
    trigger_cache[stock_id_key].append(new_order)

async def check_parallel_triggers(db: AsyncSession, market_prices: dict):
    """Iterates through market prices and fires parallel execution tasks for stocks that have active triggers."""
    matching_tasks = []
    
    for stock_id, price_data in market_prices.items():
        # Only process if this stock has active triggers in our cache
        stock_id_key = str(stock_id)
        if stock_id_key in trigger_cache:
            current_price = price_data["price"]
            specific_stock_triggers = trigger_cache[stock_id_key]

            matching_tasks.append(
                _process_price_match(db, specific_stock_triggers, current_price)
            )
    
    if matching_tasks:
        await asyncio.gather(*matching_tasks)

async def _process_price_match(db: AsyncSession, orders_list: list, current_price: float):
    """Internal matching logic for a specific stock group."""
    from app.services.scraper_engine import manager
    for order in orders_list[:]:  
        is_triggered = False
        
        # 'B' = BUY (Execute if market price is at or below target)
        if order.order_type == "B" and current_price <= order.target_price:
            is_triggered = True
        # 'S' = SELL (Execute if market price is at or above target)
        elif order.order_type == "S" and current_price >= order.target_price:
            is_triggered = True

        if is_triggered:
            try:
                db.add(order)
                # 1. Execute the trade via your CRUD logic
                await manager.send_trigger_message(
                    {
                        "type": "ORDER_EXECUTED",
                        "stock_id": order.stock_id,
                        "price": current_price,
                        "quantity": order.quantity,
                        "side": order.order_type
                    },
                    user_id=order.user_id
                )
                if order.order_type == "B":
                    await buy_stock(db, order.user_id, order.stock_id, order.quantity, current_price)
                else:
                    await sell_stock(db, order.user_id, order.stock_id, order.quantity, current_price)
                
                # 2. Persist status change to TiDB
                order.status = "E"
                await db.commit()
                
                # 3. Remove from memory cache
                orders_list.remove(order)
            except Exception as e:
                print(f"Trade Execution Failed for User {order.user_id}: {e}")