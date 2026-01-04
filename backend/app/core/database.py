from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from app.core.config import DB_HOST, DB_PORT, DB_USERNAME, DB_PASSWORD, DB_DATABASE, SSL_CA_PATH
import ssl

connect_args = {}
if SSL_CA_PATH:
    ssl_ctx = ssl.create_default_context(cafile=SSL_CA_PATH)
    ssl_ctx.verify_mode = ssl.CERT_REQUIRED
    connect_args["ssl"] = ssl_ctx

DB_URL = f"mysql+aiomysql://{DB_USERNAME}:{DB_PASSWORD}@{DB_HOST}:{DB_PORT}/{DB_DATABASE}"

engine = create_async_engine(
    DB_URL,
    pool_pre_ping=True,
    echo=False,
    connect_args=connect_args
)

SessionLocal = async_sessionmaker(
    bind=engine,
    expire_on_commit=False,
    class_=AsyncSession
)

async def get_db():
    async with SessionLocal() as session:
        yield session