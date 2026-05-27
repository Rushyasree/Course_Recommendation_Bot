import os
import logging
import requests
from backend.app.utils.sanitize import sanitize_text

logger = logging.getLogger(__name__)

def generate_response(interest: str, level: str, retrieved_courses=None) -> str:
    """Call Anthropic Claude API for course recommendations.
    Returns sanitized response text.
    """
    api_key = os.getenv('ANTHROPIC_API_KEY')
    if not api_key:
        logger.error('ANTHROPIC_API_KEY not set')
        raise ConnectionError('Claude API key missing')

    # Build prompt
    context = ''
    if retrieved_courses:
        context = '\n'.join([f"- {c.title} by {c.provider} ({c.level}): {c.link}" for c in retrieved_courses])

    user_prompt = f"Suggest the best 2 courses for someone interested in '{interest}' at '{level}' skill level."
    if context:
        prompt = f"Based on these verified courses:\n{context}\n\n{user_prompt}\nOnly recommend from the list above. Format with 🔹 emoji, bold titles, and links."
    else:
        prompt = f"{user_prompt} Include course titles, platforms, and links. Format with 🔹 emoji and bold titles."

    url = 'https://api.anthropic.com/v1/messages'
    headers = {
        'x-api-key': api_key,
        'anthropic-version': '2023-06-01',
        'Content-Type': 'application/json'
    }
    payload = {
        'model': 'claude-sonnet-4-20250514',
        'max_tokens': 400,
        'temperature': 0.4,
        'messages': [
            {'role': 'user', 'content': prompt}
        ]
    }
    try:
        response = requests.post(url, json=payload, headers=headers, timeout=15)
        response.raise_for_status()
        data = response.json()
        # Anthropic returns content as list of dicts
        content = data.get('content', [])
        if content and isinstance(content[0], dict):
            text = content[0].get('text', '')
        else:
            text = ''
        return sanitize_text(text)
    except Exception as e:
        logger.error(f'Claude request failed: {e}')
        raise
