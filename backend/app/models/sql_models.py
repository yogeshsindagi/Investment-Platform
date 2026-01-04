from sqlalchemy import (
    Column, Integer, String, Date, DateTime,
    ForeignKey, Float, BigInteger
)
from sqlalchemy.orm import relationship, declarative_base
from datetime import datetime, timezone, timedelta

IST = timezone(timedelta(hours=5, minutes=30))

Base = declarative_base()

class Stock(Base):
    __tablename__ = "Stock"

    stock_id = Column(Integer, primary_key=True)
    name = Column(String(255), unique=True, nullable=False)
    full_name = Column(String(255), nullable=False)

class User(Base):
    __tablename__ = "Users"

    user_id = Column(Integer, primary_key=True, autoincrement=True)
    name = Column(String(255), nullable=False)
    email = Column(String(255), unique=True, nullable=False)
    password_hash = Column(String(255), nullable=False)

    portfolios = relationship("Portfolio", back_populates="user")
    transactions = relationship("Transaction", back_populates="user")

class Portfolio(Base):
    __tablename__ = "Portfolio"

    user_id = Column(Integer, ForeignKey("Users.user_id"), primary_key=True)
    stock_id = Column(Integer, primary_key=True)
    quantity = Column(Integer, nullable=False, default=0)
    buy_price = Column(Float(15, 2), nullable=False, default=0.0)
    purchase_date = Column(Date, default=lambda: datetime.now(IST).date())

    user = relationship("User", back_populates="portfolios")

class Transaction(Base):
    __tablename__ = "Transactions"

    transaction_id = Column(BigInteger, primary_key=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey("Users.user_id"), nullable=False)
    stock_id = Column(Integer, nullable=False)
    quantity = Column(Integer, nullable=False)
    price = Column(Float(15, 2), nullable=False)
    transaction_type = Column(String(1), nullable=False) 
    transaction_date = Column(DateTime, default=lambda: datetime.now(IST).date())

    user = relationship("User", back_populates="transactions")

class OrderTrigger(Base):
    __tablename__ = "OrderTriggers"

    trigger_id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey("Users.user_id"), nullable=False)
    stock_id = Column(Integer, ForeignKey("Stock.stock_id"), nullable=False)
    quantity = Column(Integer, nullable=False)
    target_price = Column(Float(15, 2), nullable=False)
    # B: Buy, S: Sell
    order_type = Column(String(1), nullable=False) 
    # P: Pending, E: Executed, C: Canceled
    status = Column(String(1), default="P") 
    created_at = Column(DateTime, default=lambda: datetime.now(IST))

    user = relationship("User")