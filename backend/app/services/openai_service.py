import os
from openai import OpenAI
import logging

logger = logging.getLogger(__name__)

def get_openai_client():
    """Returns an authenticated OpenAI client if the API key is present."""
    api_key = os.getenv("OPENAI_API_KEY", "")
    if not api_key:
        logger.warning("OPENAI_API_KEY is not set. OpenAI API calls will fail.")
        return None
    try:
        return OpenAI(api_key=api_key)
    except Exception as e:
        logger.error(f"Failed to initialize OpenAI Client: {str(e)}")
        return None

def call_openai_assistant(interest, level):
    """Fallback zero-context LLM suggestion (if database is empty or not seeded)."""
    client = get_openai_client()
    if not client:
        return "⚠️ OpenAI API key is missing or not configured. Please supply an API key in the environment."
        
    try:
        response = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {"role": "system", "content": "You are a professional educational and career advisor. Format your recommendations with bold titles, concise bullet points, and markdown links."},
                {"role": "user", "content": f"Suggest 2 online courses for someone interested in {interest} with {level} skill level. Include course titles, platforms, and realistic links."}
            ],
            temperature=0.7,
            max_tokens=350
        )
        return response.choices[0].message.content.strip()
    except Exception as e:
        logger.error(f"Error calling OpenAI API: {str(e)}")
        return "⚠️ Couldn't fetch AI-based recommendations at the moment. Let's try again in a few seconds."

def call_openai_rag_assistant(interest, level, retrieved_courses):
    """
    Retrieval-Augmented Generation (RAG) assistant pipeline.
    Uses retrieved database courses as strict context to prevent hallucinations.
    """
    client = get_openai_client()
    if not client:
        # If client cannot initialize, generate a structured markdown response using local courses
        logger.warning("RAG fallback: OpenAI client is offline. Compiling local database details.")
        course_text = "\n\n".join([
            f"🔹 **{c.title}** by {c.provider}:\n[{c.link}]({c.link})"
            for c in retrieved_courses
        ])
        return f"Here are the top matches from our local catalog:\n\n{course_text}"

    try:
        # Compile retrieved courses into strict context string
        context_items = []
        for c in retrieved_courses:
            context_items.append(
                f"- Title: {c.title}\n  Provider: {c.provider}\n  Category: {c.category}\n  Level: {c.level}\n  Link: {c.link}\n  Tags: {c.tags}"
            )
        courses_context = "\n\n".join(context_items)

        system_prompt = (
            "You are a professional educational advisor and career mentor. Your goal is to suggest matching online courses "
            "based strictly on a verified local database.\n\n"
            "Here is the verified list of database courses in markdown format:\n"
            f"{courses_context}\n\n"
            "CRITICAL INSTRUCTIONS:\n"
            "1. You MUST ONLY recommend courses from the list provided above. Do NOT invent, hallucinate, or recommend outside courses.\n"
            "2. Format each recommendation with a leading '🔹' followed by the **Title** by Provider, and provide the exact enrollment URL in brackets immediately below.\n"
            "3. Add a short explanation (1-2 sentences) of why this course is highly suitable for their career development.\n"
            "4. If no courses in the list match the user's specific domain closely, tell them that there is no exact database match, and suggest the closest alternative from this list. Never suggest a non-existent course."
        )

        user_prompt = f"Suggest the best 2 courses for a student interested in '{interest}' at a '{level}' skill level from the verified database."

        logger.info(f"Invoking RAG OpenAI completion with gpt-4o-mini. Context size: {len(retrieved_courses)} courses.")

        response = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt}
            ],
            temperature=0.4, # Low temperature to prevent hallucinations
            max_tokens=400
        )
        return response.choices[0].message.content.strip()
        
    except Exception as e:
        logger.error(f"Error calling OpenAI RAG completing service: {str(e)}")
        # Graceful fallback: return local database courses
        course_text = "\n\n".join([
            f"🔹 **{c.title}** by {c.provider}:\n[{c.link}]({c.link})"
            for c in retrieved_courses
        ])
        return f"⚠️ OpenAI API experienced an error, but here are the matched courses from our local catalog:\n\n{course_text}"
