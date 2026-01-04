from sqlalchemy.future import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.sql_models import User
from app.core.security import hash_password, verify_password_hash

# User is CLASS which is in sql_model
async def get_user_by_id(db: AsyncSession, user_id: int):
    result = await db.execute(select(User).where(User.user_id == user_id))
    return result.scalars().first()

async def get_user_by_email(db: AsyncSession, email: str):   
    result = await db.execute(select(User).where(User.email == email))
    return result.scalars().first()

async def create_user(db: AsyncSession, name: str, email: str, password: str):
    result = await db.execute(select(User).where(User.email == email))
    if result.scalars().first():
        raise ValueError("Email already registered")

    user = User(
        name=name,
        email=email,
        password_hash=hash_password(password)
    )
    db.add(user)
    await db.commit()
    await db.refresh(user)
    return user

async def verify_user_login(db: AsyncSession, identifier: str, password: str):

    if "@" in identifier:
        user = await get_user_by_email(db, identifier)
    else:
        try:
            user_id = int(identifier)
        except ValueError:
            return None
        user = await get_user_by_id(db, user_id)
    if not user:
        return None
    if not verify_password_hash(password, user.password_hash):
        return None
    return user