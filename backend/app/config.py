import os
from dotenv import load_dotenv

# Load environment variables from .env
load_dotenv()

class Config:
    SECRET_KEY = os.getenv("SECRET_KEY", "super-secret-key-12345")
    JWT_SECRET_KEY = os.getenv("JWT_SECRET_KEY", "jwt-super-secret-key-67890")
    
    # SQLite Database Configuration (Postgres-compatible SQLAlchemy URI)
    BASE_DIR = os.path.abspath(os.path.dirname(os.path.dirname(__file__)))
    SQLALCHEMY_DATABASE_URI = os.getenv(
        "DATABASE_URL", 
        f"sqlite:///{os.path.join(BASE_DIR, 'recommender.db')}"
    )
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    
    # OpenAI configurations
    OPENAI_API_KEY = os.getenv("OPENAI_API_KEY", "")
    
    # Server configuration
    PORT = int(os.getenv("PORT", 5000))
    DEBUG = os.getenv("FLASK_DEBUG", "true").lower() in ("true", "1", "yes")
