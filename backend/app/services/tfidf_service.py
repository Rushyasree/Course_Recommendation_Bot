import logging
from backend.app.services.recommendation_service import local_tfidf_recommendations

logger = logging.getLogger(__name__)

def fallback_recommendations(interest: str, level: str, retrieved_courses=None) -> str:
    """Pure offline fallback using TF-IDF when all AI providers fail.
    Returns formatted markdown string.
    """
    if retrieved_courses:
        # Format already retrieved courses
        formatted = "\n\n".join([
            f"🔹 **{c.title}** by {c.provider}:\n[{c.link}]({c.link})"
            for c in retrieved_courses
        ])
        return f"Here are the top matches from our local catalog:{formatted}"
    try:
        courses = local_tfidf_recommendations(interest, level, limit=4)
        if courses:
            formatted = "\n\n".join([
                f"🔹 **{c.title}** by {c.provider}:\n[{c.link}]({c.link})"
                for c in courses
            ])
            return f"Here are the top matches from our local catalog:{formatted}"
    except Exception as e:
        logger.error(f"TF-IDF fallback error: {e}")
    return "I couldn't find matching courses at the moment. Please try again later or browse our catalog."
