from sqlalchemy.future import select
from sqlalchemy.ext.asyncio import AsyncSession
from datetime import datetime
from zoneinfo import ZoneInfo
from app.models.sql_models import OrderTrigger 

def get_ist_time():
    return datetime.now(ZoneInfo("Asia/Kolkata"))

async def create_trigger_order(
    db: AsyncSession, 
    user_id: int, 
    stock_id: int, 
    quantity: int, 
    target_price: float, 
    order_type: str
):
    """
    Creates a new limit/trigger order in the database.
    This uses the SQLAlchemy Model (OrderTrigger) to avoid the 'not mapped' error.
    """
    new_trigger = OrderTrigger(
        user_id=user_id,
        stock_id=stock_id,
        quantity=quantity,
        target_price=target_price,
        order_type=order_type,
        status="P",  # 'P' for Pending
        created_at=get_ist_time()
    )

    db.add(new_trigger)
    await db.commit()
    await db.refresh(new_trigger)
    return new_trigger

async def get_triggers_by_user(db: AsyncSession, user_id: int):
    """
    Fetches all pending triggers for a specific user.
    """
    result = await db.execute(
        select(OrderTrigger).where(
            OrderTrigger.user_id == user_id, 
            OrderTrigger.status == "P"
        )
    )
    return result.scalars().all()