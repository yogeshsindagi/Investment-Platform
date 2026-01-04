from pydantic import BaseModel

class PortfolioItem(BaseModel):
    stock_id: int
    stock_name: str
    quantity: int
    buy_price: float
    current_price: float
    day_change: float = 0.0
    current_value: float
    pnl: float

class TradeRequest(BaseModel):
    #user_id: int
    stock_id: int
    quantity: int
    price: float

class TriggerRequest(BaseModel):
    stock_id: int
    quantity: int
    target_price: float
    order_type: str 