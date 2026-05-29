from flask import Flask, jsonify, send_from_directory
from flask_cors import CORS
from flask_jwt_extended import JWTManager
from backend.app.config import Config
from backend.app.models.models import db
import logging
import os

jwt = JWTManager()

def create_app(config_class=Config):
    app = Flask(__name__)
    app.config.from_object(config_class)

    # Setup Logging
    logging.basicConfig(
        level=logging.INFO,
        format='%(asctime)s [%(levelname)s] %(message)s',
        handlers=[
            logging.StreamHandler()
        ]
    )
    logger = logging.getLogger(__name__)

    # Initialize extensions
    CORS(app, resources={r"/api/*": {"origins": app.config.get("CORS_ORIGINS", [])}})
    db.init_app(app)
    jwt.init_app(app)
    from backend.app.middleware.rate_limit import register_rate_limiter
    register_rate_limiter(app)

    # Register blueprints (routes)
    from backend.app.routes.chat import chat_bp
    from backend.app.routes.auth import auth_bp
    from backend.app.routes.courses import courses_bp
    from backend.app.routes.resume import resume_bp
    from backend.app.routes.stats import stats_bp

    app.register_blueprint(chat_bp, url_prefix='/api')
    app.register_blueprint(auth_bp, url_prefix='/api/auth')
    app.register_blueprint(courses_bp, url_prefix='/api/courses')
    app.register_blueprint(resume_bp, url_prefix='/api/resume')
    app.register_blueprint(stats_bp, url_prefix='/api/stats')

    # Roadmap blueprint
    from backend.app.routes.roadmap import roadmap_bp
    app.register_blueprint(roadmap_bp, url_prefix='/api/roadmap')

    # Health check endpoint
    @app.route('/api/health', methods=['GET'])
    def health_check():
        from backend.app.services.ai_router import get_provider_health
        return jsonify({
            'status': 'healthy',
            'providers': get_provider_health()
        })

    repo_root = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
    frontend_dist = os.path.join(repo_root, "frontend", "dist")

    @app.route('/', defaults={'path': ''})
    @app.route('/<path:path>')
    def serve_frontend(path):
        if path.startswith("api/"):
            return jsonify({"error": "Not Found", "message": "The requested API route does not exist."}), 404

        requested_file = os.path.join(frontend_dist, path)
        if path and os.path.exists(requested_file) and os.path.isfile(requested_file):
            return send_from_directory(frontend_dist, path)

        if os.path.exists(os.path.join(frontend_dist, "index.html")):
            return send_from_directory(frontend_dist, "index.html")

        return jsonify({
            "status": "frontend_not_built",
            "message": "Run `npm --prefix frontend run build` before using single-service mode."
        }), 503

    # Centralized Error Handlers
    @app.errorhandler(400)
    def bad_request(error):
        return jsonify({"error": "Bad Request", "message": str(error.description)}), 400

    @app.errorhandler(401)
    def unauthorized(error):
        return jsonify({"error": "Unauthorized", "message": "Access is denied due to invalid credentials."}), 401

    @app.errorhandler(404)
    def not_found(error):
        return jsonify({"error": "Not Found", "message": "The requested resource could not be found."}), 404

    @app.errorhandler(500)
    def internal_server_error(error):
        logger.error(f"Internal Server Error: {str(error)}")
        return jsonify({"error": "Internal Server Error", "message": "An unexpected error occurred on the server. Please try again later."}), 500

    # Ensure database tables exist
    with app.app_context():
        db.create_all()
        try:
            from backend.app.utils.seed import seed_database
            seed_database(app)
        except Exception as exc:
            logger.error(f"Database seed step failed: {exc}")
        logger.info("Database initialized successfully.")

    @app.cli.command("seed")
    def seed_command():
        """Seed the course catalog from courses.json."""
        from backend.app.utils.seed import seed_database
        seed_database(app)
        logger.info("Seed command completed.")

    @app.cli.command("precompute-embeddings")
    def precompute_embeddings_command():
        """Precompute course embeddings and optionally sync ChromaDB."""
        from backend.app.services.recommendation_service import precompute_all_course_embeddings
        precompute_all_course_embeddings(app)
        logger.info("Embedding precompute command completed.")

    return app
