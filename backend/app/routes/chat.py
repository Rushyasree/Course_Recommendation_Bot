from flask import Blueprint, request, jsonify
from flask_jwt_extended import get_jwt_identity, verify_jwt_in_request
from backend.app.models.models import db, User, Course, ChatHistory
from backend.app.services.ai_router import get_ai_response
from backend.app.utils.sanitize import sanitize_text
from backend.app.services.openai_service import call_openai_rag_assistant, call_openai_assistant
import logging

chat_bp = Blueprint('chat', __name__)
logger = logging.getLogger(__name__)

@chat_bp.route('/chat', methods=['POST'])
def chat():
    try:
        data = request.json or {}
        user_id = data.get('user_id')
        message = sanitize_text(data.get('message', '').strip())

        authenticated_user_id = None
        try:
            verify_jwt_in_request(optional=True)
            authenticated_user_id = get_jwt_identity()
        except Exception:
            authenticated_user_id = None

        if not user_id and not authenticated_user_id:
            return jsonify({"reply": "User ID/Session ID required."}), 400

        user_input = message.lower()

        # Step 1: Find or create session user in SQLite
        if authenticated_user_id:
            user = User.query.get(int(authenticated_user_id))
        else:
            user = User.query.filter((User.session_id == user_id) | (User.username == user_id)).first()
        if not user:
            user = User(session_id=user_id)
            db.session.add(user)
            db.session.commit()
            logger.info(f"Created new anonymous user session: {user_id}")

        # Step 2: Retrieve the last chat stage
        last_chat = ChatHistory.query.filter_by(user_id=user.id).order_by(ChatHistory.timestamp.desc()).first()
        current_stage = last_chat.stage if last_chat else "ask_name"

        # Log user message
        user_msg = ChatHistory(user_id=user.id, sender="user", text=message, stage=current_stage)
        db.session.add(user_msg)

        reply = ""
        next_stage = current_stage
        model_used = "default"
        structured_courses = []

        # Handle exit flow
        if user_input == "exit":
            reply = "Thank you! The session is now ended. Keep up your learning journey! 😊"
            next_stage = "completed"
        elif current_stage == "ask_name":
            user.name = message
            next_stage = "ask_interest"
            db.session.add(user)
            reply = f"Nice to meet you, **{user.name}**! Which domain or subject are you interested in learning today?"
        elif current_stage == "ask_interest":
            user.interests = message.lower()
            next_stage = "ask_level"
            db.session.add(user)
            reply = "What is your current skill level? (Beginner, Intermediate, Advanced)"
        elif current_stage == "ask_level":
            level = message.capitalize()
            if level not in ["Beginner", "Intermediate", "Advanced"]:
                level = "Beginner"  # Default fallback if they enter a random text

            user_interest = user.interests or "programming"
            next_stage = "ask_interest"  # Looping state

            logger.info(f"Retrieving matching courses for interest: '{user_interest}' and level: '{level}'")

            from backend.app.services.recommendation_service import semantic_recommendations
            matched_courses = semantic_recommendations(user_interest, level, limit=4)
            # Use AI router to get response, passing retrieved courses if any
            result = get_ai_response(user_interest, level, retrieved_courses=matched_courses if matched_courses else None)
            reply = result['reply']
            model_used = result.get('model')
            structured_courses = [
                {
                    **course.to_dict(),
                    "match_score": round(max(0.55, 0.95 - (idx * 0.08)), 2),
                    "why_recommended": f"Aligned with {user_interest} at {level} level using semantic catalog retrieval.",
                    "career_alignment": user_interest.title(),
                    "missing_skills": []
                }
                for idx, course in enumerate(matched_courses or [])
            ]
            # Append follow-up prompt
            reply += "\n\nWould you like another recommendation? Enter another interest or type 'exit' to end."
        else:
            reply = "I'm here to help you find the best courses! What are you interested in learning?"
            next_stage = "ask_interest"

        if not reply:
            reply = "I'm here to help you find the best courses! What are you interested in learning?"
            next_stage = "ask_interest"

        # Log bot message
        bot_msg = ChatHistory(user_id=user.id, sender="bot", text=reply, stage=next_stage)
        db.session.add(bot_msg)
        db.session.commit()

        return jsonify({"reply": reply, "stage": next_stage, "model": model_used, "courses": structured_courses})

    except Exception as e:
        logger.error(f"Error handling chat request: {str(e)}")
        return jsonify({"reply": "⚠️ An unexpected server error occurred. Please try again shortly."}), 500
