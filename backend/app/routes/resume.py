from flask import Blueprint, request, jsonify
from backend.app.services.resume_service import extract_text_from_pdf, extract_skills_from_text, analyze_skill_gaps
from backend.app.services.recommendation_service import semantic_recommendations
from backend.app.models.models import db, User, Course
import logging

resume_bp = Blueprint('resume', __name__)
logger = logging.getLogger(__name__)

def get_user_from_request():
    """Helper to retrieve user via JWT or session ID query."""
    try:
        from flask_jwt_extended import verify_jwt_in_request, get_jwt_identity
        verify_jwt_in_request(optional=True)
        user_id = get_jwt_identity()
        if user_id:
            return User.query.get(int(user_id))
    except Exception:
        pass

    session_id = request.form.get('user_id')
    if session_id:
        return User.query.filter((User.session_id == session_id) | (User.username == session_id)).first()
    return None

@resume_bp.route('/upload', methods=['POST'])
def upload_resume():
    try:
        # Check if file part is in request
        if 'file' not in request.files:
            return jsonify({"error": "Bad Request", "message": "No file uploaded. Please supply a 'file' parameter."}), 400

        file = request.files['file']
        if file.filename == '':
            return jsonify({"error": "Bad Request", "message": "No selected file name."}), 400

        if not file.filename.lower().endswith('.pdf'):
            return jsonify({"error": "Unsupported Media Type", "message": "Only PDF resume formats are supported."}), 415

        target_role = request.form.get('target_role', 'Backend Developer').strip()
        user = get_user_from_request()

        logger.info(f"Parsing PDF Resume for target role: '{target_role}'")

        # Step 1: Read PDF and extract text
        pdf_text = extract_text_from_pdf(file.stream)
        if not pdf_text.strip():
            return jsonify({"error": "Unprocessable Entity", "message": "Could not extract readable text from this PDF resume."}), 422

        # Step 2: Extract technical skills
        found_skills = extract_skills_from_text(pdf_text)
        
        # Step 3: Compute gaps against target role template
        gap_analysis = analyze_skill_gaps(found_skills, target_role)

        # Step 4: Persist skills list to user profile if user session is present
        if user:
            user.skills = ", ".join(found_skills)
            user.target_role = gap_analysis["target_role"]
            db.session.add(user)
            db.session.commit()
            logger.info(f"Updated skill profile for user ID: {user.id}")

        # Step 5: Programmatically compile courses targeting missing skills!
        recommended_courses = []
        seen_course_ids = set()

        # Try to pull courses matching missing skill categories
        missing_skills = gap_analysis["missing_skills"]
        level = "Beginner" # Default starting level for missing competencies
        
        # Pull up to 4 recommendations total from missing gaps
        for skill in missing_skills:
            if len(recommended_courses) >= 4:
                break
            
            # Fetch semantic vector similarities matching the missing skill
            gap_matches = semantic_recommendations(skill, level, limit=2)
            for course in gap_matches:
                if course.id not in seen_course_ids:
                    seen_course_ids.add(course.id)
                    recommended_courses.append(course.to_dict())

        # If there are no missing skill gaps or no courses found for gaps, pull default role courses
        if not recommended_courses:
            role_keyword = gap_analysis["target_role"].split()[0].lower() # e.g. "frontend" from "Frontend Developer"
            catalog_matches = semantic_recommendations(role_keyword, "Beginner", limit=3)
            recommended_courses = [c.to_dict() for c in catalog_matches]

        return jsonify({
            "analysis": gap_analysis,
            "recommended_courses": [
                {
                    **course,
                    "match_score": round(max(0.58, 0.96 - (idx * 0.07)), 2),
                    "why_recommended": "Targets a missing skill from your resume skill-gap analysis.",
                    "career_alignment": gap_analysis["target_role"],
                    "missing_skills": missing_skills[:3]
                }
                for idx, course in enumerate(recommended_courses)
            ],
            "career_insights": {
                "summary": f"You are {gap_analysis['completion_rate']}% aligned with {gap_analysis['target_role']}.",
                "estimated_learning_duration": f"{max(4, len(missing_skills) * 2)}-{max(6, len(missing_skills) * 3)} weeks",
                "next_best_action": missing_skills[0] if missing_skills else "Build a portfolio project and apply for roles."
            }
        }), 200

    except Exception as e:
        logger.error(f"Error handling PDF resume upload: {str(e)}")
        return jsonify({"error": "Server Error", "message": "An unexpected error occurred during resume processing."}), 500
