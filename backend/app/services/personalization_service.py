from collections import Counter

from backend.app.models.models import RecommendationFeedback, RoadmapProgress, SavedRecommendation


def _course_tags(course):
    if not course or not course.tags:
        return []
    return [tag.strip().lower() for tag in course.tags.split(",") if tag.strip()]


def build_personalization_profile(user):
    if not user:
        return {
            "signal_count": 0,
            "top_interests": [],
            "average_rating": None,
            "saved_count": 0,
            "feedback_count": 0,
            "progress_average": 0,
            "next_action": "Start chatting or upload a resume to personalize recommendations.",
        }

    saved = SavedRecommendation.query.filter_by(user_id=user.id).all()
    feedback = RecommendationFeedback.query.filter_by(user_id=user.id).all()
    progress = RoadmapProgress.query.filter_by(user_id=user.id).all()

    tag_counter = Counter()
    for item in saved:
        tag_counter.update(_course_tags(item.course))

    positive_course_ids = {item.course_id for item in feedback if item.rating and item.rating >= 4}
    for item in feedback:
        if item.course_id in positive_course_ids and getattr(item, "course", None):
            tag_counter.update(_course_tags(item.course))

    ratings = [item.rating for item in feedback if item.rating]
    progress_values = [item.progress for item in progress]
    signal_count = len(saved) + len(feedback) + len(progress)
    progress_average = int(sum(progress_values) / len(progress_values)) if progress_values else 0

    if progress_average >= 75:
        next_action = "Convert roadmap progress into a portfolio project and add measurable outcomes."
    elif tag_counter:
        next_action = f"Continue with {tag_counter.most_common(1)[0][0]} courses and rate the next recommendation."
    else:
        next_action = "Save or rate at least three recommendations to unlock stronger personalization."

    return {
        "signal_count": signal_count,
        "top_interests": [{"tag": tag, "weight": count} for tag, count in tag_counter.most_common(5)],
        "average_rating": round(sum(ratings) / len(ratings), 2) if ratings else None,
        "saved_count": len(saved),
        "feedback_count": len(feedback),
        "progress_average": progress_average,
        "next_action": next_action,
    }


def adjust_readiness_score(base_score, personalization):
    progress_bonus = min(10, personalization.get("progress_average", 0) // 10)
    feedback_bonus = min(5, personalization.get("feedback_count", 0))
    saved_bonus = min(5, personalization.get("saved_count", 0))
    return min(100, int(base_score + progress_bonus + feedback_bonus + saved_bonus))
