from sqlalchemy.future import select
from sqlalchemy.ext.asyncio import AsyncSession
from datetime import datetime
from zoneinfo import ZoneInfo
from app.models.sql_models import Portfolio, Transaction

def get_ist_time():
    return datetime.now(ZoneInfo("Asia/Kolkata"))

async def get_portfolio_by_user(db: AsyncSession, user_id: int):
    result = await db.execute(select(Portfolio).where(Portfolio.user_id == user_id))
    return result.scalars().all()

async def buy_stock(db: AsyncSession, user_id: int, stock_id: int, quantity: int, price: float):
    result = await db.execute(
        select(Portfolio)
        .where(Portfolio.user_id == user_id, Portfolio.stock_id == stock_id)
        .with_for_update()
    )
    existing = result.scalars().first()

    if existing:
        old_val = float(existing.quantity) * float(existing.buy_price)
        new_val = float(quantity) * float(price)
        total_qty = existing.quantity + quantity
        existing.buy_price = (old_val + new_val) / total_qty
        existing.quantity = total_qty
        existing.purchase_date = get_ist_time()
    else:
        existing = Portfolio(
            user_id=user_id, stock_id=stock_id, quantity=quantity, 
            buy_price=price, purchase_date=get_ist_time()
        )
        db.add(existing)

    tx = Transaction(
        user_id=user_id, stock_id=stock_id, quantity=quantity, 
        price=price, transaction_type="B", transaction_date=get_ist_time()
    )
    db.add(tx)
    await db.commit()
    return existing

async def sell_stock(db: AsyncSession, user_id: int, stock_id: int, quantity: int, price: float):
    result = await db.execute(
        select(Portfolio)
        .where(Portfolio.user_id == user_id, Portfolio.stock_id == stock_id)
        .with_for_update()
    )
    existing = result.scalars().first()

    if not existing or existing.quantity < quantity:
        raise ValueError("Insufficient holdings")

    existing.quantity -= quantity
    if existing.quantity == 0:
        await db.delete(existing)

    tx = Transaction(
        user_id=user_id, stock_id=stock_id, quantity=quantity, 
        price=price, transaction_type="S", transaction_date=get_ist_time()
    )
    db.add(tx)
    await db.commit()
    return True