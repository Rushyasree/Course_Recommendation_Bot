from flask import Blueprint, jsonify, request
from backend.app.services.resume_service import ROLE_REQUIRED_SKILLS, analyze_skill_gaps
from backend.app.models.models import db, User, Course, RoadmapProgress
from backend.app.utils.validation import optional_string, require_int, require_string
import logging

roadmap_bp = Blueprint('roadmap', __name__)
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
    session_id = request.args.get('user_id') or (request.json or {}).get('user_id')
    if session_id:
        return User.query.filter((User.session_id == session_id) | (User.username == session_id)).first()
    return None

@roadmap_bp.route('/timeline', methods=['GET'])
def get_roadmap():
    try:
        user = get_user_from_request()
        if not user:
            # Return mock roadmap for anonymous users
            return jsonify({
                "steps": []
            }), 200
        # Use existing skill gap analysis
        target_role = user.target_role or "Backend Developer"
        user_skills = [s.strip().lower() for s in (user.skills or "").split(",") if s.strip()]
        analysis = analyze_skill_gaps(user_skills, target_role)
        missing = analysis.get('missing_skills', [])
        # For each missing skill, find a course that tags include the skill
        roadmap_steps = []
        for skill in missing:
            course = Course.query.filter(Course.tags.ilike(f"%{skill}%")).first()
            step = {
                "skill": skill,
                "required": True,
                "course": {
                    "title": course.title if course else None,
                    "provider": course.provider if course else None,
                    "link": course.link if course else None,
                    "level": course.level if course else "Beginner"
                },
                "progress": 0,
                "estimated_stage": "Upcoming",
                "difficulty": "Medium"
            }
            roadmap_steps.append(step)
        return jsonify({"steps": roadmap_steps}), 200
    except Exception as e:
        logger.error(f"Error generating roadmap: {str(e)}")
        return jsonify({"error": "Server Error", "message": "Could not generate roadmap."}), 500


@roadmap_bp.route('/progress', methods=['POST'])
def update_progress():
    try:
        user = get_user_from_request()
        if not user:
            return jsonify({"error": "Unauthorized", "message": "User session or token required."}), 401

        data = request.json or {}
        skill = require_string(data, 'skill', min_length=1, max_length=120).lower()
        progress = require_int(data, 'progress', minimum=0, maximum=100)
        stage = optional_string(data, 'stage', max_length=50, default="Beginner")

        item = RoadmapProgress.query.filter_by(user_id=user.id, skill=skill).first()
        if not item:
            item = RoadmapProgress(user_id=user.id, skill=skill)

        item.progress = progress
        item.stage = stage
        db.session.add(item)
        db.session.commit()

        return jsonify({
            "skill": item.skill,
            "stage": item.stage,
            "progress": item.progress,
            "updated_at": item.updated_at.isoformat()
        }), 200
    except Exception as e:
        if isinstance(e, ValueError):
            return jsonify({"error": "Bad Request", "message": str(e)}), 400
        logger.error(f"Error updating roadmap progress: {str(e)}")
        return jsonify({"error": "Server Error", "message": "Could not update roadmap progress."}), 500
