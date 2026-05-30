import logging
import os

from openai import OpenAI

logger = logging.getLogger(__name__)


def get_openai_client():
    """Return an authenticated OpenAI client or raise so the router can fallback."""
    api_key = os.getenv("OPENAI_API_KEY", "").strip()
    if not api_key:
        raise ConnectionError("OPENAI_API_KEY is not configured")

    try:
        return OpenAI(api_key=api_key)
    except Exception as exc:
        logger.error("Failed to initialize OpenAI client: %s", exc)
        raise


def call_openai_assistant(interest, level):
    """Zero-context LLM suggestion used when retrieved course context is unavailable."""
    client = get_openai_client()

    try:
        response = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {
                    "role": "system",
                    "content": (
                        "You are a professional educational and career advisor. "
                        "Format recommendations with bold titles, concise bullets, and markdown links."
                    ),
                },
                {
                    "role": "user",
                    "content": (
                        f"Suggest 2 online courses for someone interested in {interest} "
                        f"with {level} skill level. Include course titles, platforms, and realistic links."
                    ),
                },
            ],
            temperature=0.7,
            max_tokens=350,
        )
        return response.choices[0].message.content.strip()
    except Exception as exc:
        logger.error("OpenAI assistant request failed: %s", exc)
        raise


def call_openai_rag_assistant(interest, level, retrieved_courses):
    """
    Retrieval-Augmented Generation assistant.

    Failures are intentionally raised so ai_router can rotate to Gemini,
    Claude, and finally the local TF-IDF fallback.
    """
    client = get_openai_client()

    try:
        context_items = []
        for course in retrieved_courses:
            context_items.append(
                "- Title: {title}\n"
                "  Provider: {provider}\n"
                "  Category: {category}\n"
                "  Level: {level}\n"
                "  Link: {link}\n"
                "  Tags: {tags}".format(
                    title=course.title,
                    provider=course.provider,
                    category=course.category,
                    level=course.level,
                    link=course.link,
                    tags=course.tags,
                )
            )
        courses_context = "\n\n".join(context_items)

        system_prompt = (
            "You are a professional educational advisor and career mentor. "
            "Recommend matching online courses based strictly on this verified local database.\n\n"
            f"{courses_context}\n\n"
            "Rules:\n"
            "1. Recommend only courses from the verified list above.\n"
            "2. Do not invent course titles, providers, or URLs.\n"
            "3. Include a short reason for each recommendation.\n"
            "4. If there is no exact match, say so and suggest the closest course from the list."
        )

        user_prompt = (
            f"Suggest the best 2 courses for a student interested in '{interest}' "
            f"at a '{level}' skill level from the verified database."
        )

        logger.info(
            "Invoking OpenAI RAG completion with gpt-4o-mini. Context size: %s courses.",
            len(retrieved_courses),
        )

        response = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt},
            ],
            temperature=0.4,
            max_tokens=400,
        )
        return response.choices[0].message.content.strip()
    except Exception as exc:
        logger.error("OpenAI RAG request failed: %s", exc)
        raise
