import os
from dotenv import load_dotenv

# Load environment variables from .env
load_dotenv()

class Config:
    DEBUG = os.getenv("FLASK_DEBUG", "true").lower() in ("true", "1", "yes")
    ENV = os.getenv("FLASK_ENV", "development")
    SECRET_KEY = os.getenv("SECRET_KEY")
    JWT_SECRET_KEY = os.getenv("JWT_SECRET_KEY")

    if not DEBUG and (not SECRET_KEY or not JWT_SECRET_KEY):
        raise RuntimeError("SECRET_KEY and JWT_SECRET_KEY must be set when FLASK_DEBUG=false.")

    SECRET_KEY = SECRET_KEY or "dev-only-secret-key-change-me"
    JWT_SECRET_KEY = JWT_SECRET_KEY or "dev-only-jwt-secret-change-me"
    
    # SQLite Database Configuration (Postgres-compatible SQLAlchemy URI)
    BASE_DIR = os.path.abspath(os.path.dirname(os.path.dirname(__file__)))
    SQLALCHEMY_DATABASE_URI = os.getenv(
        "DATABASE_URL", 
        f"sqlite:///{os.path.join(BASE_DIR, 'recommender.db')}"
    )
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    
    # OpenAI configurations
    OPENAI_API_KEY = os.getenv("OPENAI_API_KEY", "")

    # Security and runtime configuration
    CORS_ORIGINS = [
        origin.strip()
        for origin in os.getenv("CORS_ORIGINS", "http://localhost:3000,http://127.0.0.1:3000").split(",")
        if origin.strip()
    ]
    MAX_CONTENT_LENGTH = int(os.getenv("MAX_CONTENT_LENGTH", 4 * 1024 * 1024))
    
    # Server configuration
    PORT = int(os.getenv("PORT", 5000))
