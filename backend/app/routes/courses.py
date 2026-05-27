from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from backend.app.models.models import db, User, Course, SavedRecommendation, ChatHistory
import logging

courses_bp = Blueprint('courses', __name__)
logger = logging.getLogger(__name__)

def get_user_from_request():
    """Helper to fetch a user either from JWT identity or request session ID."""
    # Try reading JWT token (optional check)
    try:
        from flask_jwt_extended import verify_jwt_in_request
        verify_jwt_in_request(optional=True)
        user_id = get_jwt_identity()
        if user_id:
            return User.query.get(int(user_id))
    except Exception:
        pass
    
    # Fallback to session_id parameter
    session_id = request.args.get('user_id') or (request.json or {}).get('user_id')
    if session_id:
        return User.query.filter((User.session_id == session_id) | (User.username == session_id)).first()
    return None

@courses_bp.route('/save', methods=['POST'])
def save_course():
    try:
        user = get_user_from_request()
        if not user:
            return jsonify({"error": "Unauthorized", "message": "User session or token required to save recommendations."}), 401

        data = request.json or {}
        course_id = data.get('course_id')

        if not course_id:
            return jsonify({"error": "Bad Request", "message": "Course ID is required."}), 400

        # Validate course exists
        course = Course.query.get(int(course_id))
        if not course:
            return jsonify({"error": "Not Found", "message": "The specified course does not exist in our catalog."}), 404

        # Check if already saved
        existing = SavedRecommendation.query.filter_by(user_id=user.id, course_id=course.id).first()
        if existing:
            return jsonify({"message": "Course already saved in recommendations."}), 200

        # Save bookmark
        saved_item = SavedRecommendation(user_id=user.id, course_id=course.id)
        db.session.add(saved_item)
        db.session.commit()

        logger.info(f"Saved course ID {course_id} for user {user.id}")
        return jsonify({"message": "Course saved successfully in recommendations.", "course": course.to_dict()}), 201

    except Exception as e:
        logger.error(f"Error saving course recommendation: {str(e)}")
        return jsonify({"error": "Server Error", "message": "An unexpected error occurred."}), 500


@courses_bp.route('/saved', methods=['GET'])
def get_saved_courses():
    try:
        user = get_user_from_request()
        if not user:
            return jsonify({"error": "Unauthorized", "message": "User session or token required."}), 401

        saves = SavedRecommendation.query.filter_by(user_id=user.id).all()
        saved_list = [s.to_dict() for s in saves if s.course is not None]

        return jsonify(saved_list), 200

    except Exception as e:
        logger.error(f"Error fetching saved courses: {str(e)}")
        return jsonify({"error": "Server Error", "message": "An unexpected error occurred."}), 500


@courses_bp.route('/history', methods=['GET'])
def get_chat_history():
    try:
        user = get_user_from_request()
        if not user:
            return jsonify({"error": "Unauthorized", "message": "User session or token required."}), 401

        history = ChatHistory.query.filter_by(user_id=user.id).order_by(ChatHistory.timestamp.asc()).all()
        return jsonify([h.to_dict() for h in history]), 200

    except Exception as e:
        logger.error(f"Error fetching chat history: {str(e)}")
        return jsonify({"error": "Server Error", "message": "An unexpected error occurred."}), 500
