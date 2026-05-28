import os
import sys

# Ensure parent directory is in python search path
sys.path.append(os.path.abspath(os.path.dirname(os.path.dirname(__file__))))

from backend.app import create_app
from backend.app.utils.seed import seed_database
import logging

logger = logging.getLogger(__name__)

app = create_app()

if __name__ == '__main__':
    # Precompute course embeddings in batch for faster semantic queries
    from backend.app.services.recommendation_service import precompute_all_course_embeddings
    precompute_all_course_embeddings(app)
    
    port = app.config.get("PORT", 5000)
    debug = app.config.get("DEBUG", True)
    
    logger.info(f"Starting server on port {port} (debug={debug})...")
    app.run(host='0.0.0.0', port=port, debug=debug)
