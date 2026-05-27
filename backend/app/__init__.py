from flask import Flask, jsonify
from flask_cors import CORS
from flask_jwt_extended import JWTManager
from backend.app.config import Config
from backend.app.models.models import db
import logging

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
    CORS(app, resources={r"/*": {"origins": "*"}})
    db.init_app(app)
    jwt.init_app(app)

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
        logger.info("Database initialized successfully.")

    return app
