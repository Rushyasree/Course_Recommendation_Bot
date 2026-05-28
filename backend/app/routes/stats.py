from flask import Blueprint, request, jsonify
from backend.app.services.resume_service import ROLE_REQUIRED_SKILLS, analyze_skill_gaps
from backend.app.models.models import User
from backend.app.services.personalization_service import adjust_readiness_score, build_personalization_profile
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
            "career_readiness_score": 35,
            "roadmap_completion": 25,
            "matched_skills": ["python", "sql", "git"],
            "missing_skills": ["node.js", "mongodb", "docker", "devops"],
            "radar_coordinates": {
                "programming": 80,
                "data_science": 50,
                "cloud": 40,
                "cybersecurity": 30
            },
            "skill_trend": [
                {"label": "Week 1", "score": 20},
                {"label": "Week 2", "score": 28},
                {"label": "Week 3", "score": 32},
                {"label": "Now", "score": 35}
            ],
            "completed_courses": [
                {"label": "Core", "count": 3},
                {"label": "Pending", "count": 4}
            ]
        }

        if not user or not user.skills:
            if user:
                personalization = build_personalization_profile(user)
                default_stats["personalization"] = personalization
                default_stats["career_readiness_score"] = adjust_readiness_score(default_stats["career_readiness_score"], personalization)
                default_stats["roadmap_completion"] = personalization["progress_average"] or default_stats["roadmap_completion"]
            return jsonify(default_stats), 200

        # Calculate live skill metrics from SQLite user record!
        user_skills = [s.strip().lower() for s in user.skills.split(",") if s.strip()]
        target_role = user.target_role or "Backend Developer"
        
        analysis = analyze_skill_gaps(user_skills, target_role)
        personalization = build_personalization_profile(user)
        readiness_score = adjust_readiness_score(analysis["completion_rate"], personalization)

        return jsonify({
            "target_role": analysis["target_role"],
            "completion_rate": analysis["completion_rate"],
            "matched_skills": analysis["matched_skills"],
            "missing_skills": analysis["missing_skills"],
            "radar_coordinates": analysis.get("radar_coordinates", default_stats["radar_coordinates"]),
            "career_readiness_score": readiness_score,
            "roadmap_completion": max(personalization["progress_average"], min(100, max(0, analysis["completion_rate"] - 10))),
            "skill_trend": [
                {"label": "Week 1", "score": max(10, analysis["completion_rate"] - 30)},
                {"label": "Week 2", "score": max(20, analysis["completion_rate"] - 20)},
                {"label": "Week 3", "score": max(30, analysis["completion_rate"] - 10)},
                {"label": "Now", "score": readiness_score},
            ],
            "completed_courses": [
                {"label": "Core", "count": len(analysis["matched_skills"])},
                {"label": "Pending", "count": len(analysis["missing_skills"])},
            ],
            "personalization": personalization
        }), 200

    except Exception as e:
        logger.error(f"Error compiling dashboard metrics: {str(e)}")
        return jsonify({"error": "Server Error", "message": "An unexpected error occurred compiling metrics."}), 500
