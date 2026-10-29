import logging
from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker
from app.config import settings

logger = logging.getLogger(__name__)

Base = declarative_base()

def create_db_engine():
    """
    Attempts to connect to PostgreSQL.
    If PostgreSQL is unreachable (e.g. local service not running),
    smoothly falls back to SQLite so local MVP testing never crashes.
    """
    db_url = settings.DATABASE_URL
    try:
        if db_url.startswith("postgresql://"):
            db_url = db_url.replace("postgresql://", "postgresql+psycopg2://", 1)

        if "postgresql" in db_url:
            logger.info("Attempting connection to PostgreSQL: %s", db_url.split("@")[-1])
            engine = create_engine(
                db_url,
                pool_pre_ping=True,
                connect_args={"connect_timeout": 3}
            )
            # Verify connection with a quick ping
            with engine.connect() as conn:
                logger.info("Successfully connected to PostgreSQL database.")
                # Attempt pgvector extension if available
                try:
                    conn.execute("CREATE EXTENSION IF NOT EXISTS vector;")
                    conn.commit()
                    logger.info("pgvector extension verified or created.")
                except Exception:
                    pass
            return engine
    except Exception as e:
        logger.warning(
            "Could not connect to PostgreSQL (%s). Falling back to SQLite for local development: %s",
            str(e),
            settings.SQLITE_FALLBACK_URL
        )

    # Fallback engine
    return create_engine(
        settings.SQLITE_FALLBACK_URL,
        connect_args={"check_same_thread": False}
    )

engine = create_db_engine()
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def get_db():
    """FastAPI dependency for database sessions."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def init_db():
    """Initialize database tables."""
    import app.models.models  # noqa: F401
    Base.metadata.create_all(bind=engine)
    logger.info("Database tables initialized successfully.")
