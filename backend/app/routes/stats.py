from flask import Blueprint, request, jsonify
from backend.app.services.resume_service import ROLE_REQUIRED_SKILLS, analyze_skill_gaps
from backend.app.models.models import User
import logging

stats_bp = Blueprint('stats', __name__)
logger = logging.getLogger(__name__)

def get_user_from_request():
    try:
        from flask_jwt_extended import verify_jwt_in_request, get_jwt_identity
        verify_jwt_in_request(optional=True)
        user_id = get_jwt_identity()
        if user_id:
            return User.query.get(int(user_id))
    except Exception:
        pass

    session_id = request.args.get('user_id')
    if session_id:
        return User.query.filter((User.session_id == session_id) | (User.username == session_id)).first()
    return None

@stats_bp.route('/dashboard', methods=['GET'])
def get_stats():
    try:
        user = get_user_from_request()
        
        # Default mock statistics for first-time / non-uploaded profiles
        default_stats = {
            "target_role": "Backend Developer",
            "completion_rate": 35,
            "matched_skills": ["python", "sql", "git"],
            "missing_skills": ["node.js", "mongodb", "docker", "devops"],
            "radar_coordinates": {
                "programming": 80,
                "data_science": 50,
                "cloud": 40,
                "cybersecurity": 30
            }
        }

        if not user or not user.skills:
            return jsonify(default_stats), 200

        # Calculate live skill metrics from SQLite user record!
        user_skills = [s.strip().lower() for s in user.skills.split(",") if s.strip()]
        target_role = user.target_role or "Backend Developer"
        
        analysis = analyze_skill_gaps(user_skills, target_role)

        return jsonify({
            "target_role": analysis["target_role"],
            "completion_rate": analysis["completion_rate"],
            "matched_skills": analysis["matched_skills"],
            "missing_skills": analysis["missing_skills"],
            "radar_coordinates": analysis["radar_coordinates"]
        }), 200

    except Exception as e:
        logger.error(f"Error compiling dashboard metrics: {str(e)}")
        return jsonify({"error": "Server Error", "message": "An unexpected error occurred compiling metrics."}), 500
