import os
import logging
import requests
from backend.app.utils.sanitize import sanitize_text

logger = logging.getLogger(__name__)

def generate_response(interest: str, level: str, retrieved_courses=None) -> str:
    """Call Google Gemini API for course recommendations.
    Returns sanitized text.
    """
    api_key = os.getenv('GEMINI_API_KEY')
    if not api_key:
        logger.error('GEMINI_API_KEY not set')
        raise ConnectionError('Gemini API key missing')

    # Build context from retrieved courses if any
    context = ''
    if retrieved_courses:
        context = '\n'.join([f"- {c.title} by {c.provider} ({c.level}): {c.link}" for c in retrieved_courses])

    prompt = f"Suggest the best 2 courses for someone interested in '{interest}' at '{level}' level."
    if context:
        prompt = f"Based on these verified courses:\n{context}\n\n{prompt}\nOnly recommend from the list above. Format with 🔹 emoji, bold titles, and links."
    else:
        prompt += " Include course titles, platforms, and links. Format with 🔹 emoji and bold titles."

    url = f'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key={api_key}'
    payload = {
        'contents': [{'role': 'user', 'parts': [{'text': prompt}]}],
        'generationConfig': {'temperature': 0.4, 'maxOutputTokens': 400}
    }
    try:
        response = requests.post(url, json=payload, timeout=15)
        response.raise_for_status()
        data = response.json()
        text = data['candidates'][0]['content']['parts'][0]['text']
        return sanitize_text(text)
    except Exception as e:
        logger.error(f'Gemini request failed: {e}')
        raise
