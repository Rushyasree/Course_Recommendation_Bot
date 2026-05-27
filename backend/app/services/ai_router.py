import logging
import time
from typing import List, Dict, Any

from backend.app.utils.sanitize import sanitize_text

# Import provider wrappers
from backend.app.services.openai_service import call_openai_rag_assistant, call_openai_assistant
from backend.app.services.gemini_service import generate_response as gemini_generate
from backend.app.services.claude_service import generate_response as claude_generate
from backend.app.services.tfidf_service import fallback_recommendations

logger = logging.getLogger(__name__)

# Circuit breaker state per provider
_circuit_state: Dict[str, Dict[str, Any]] = {}
FAILURE_THRESHOLD = 3
COOLDOWN_SECONDS = 60

PROVIDER_ORDER = ["openai", "gemini", "claude", "local"]

def _is_circuit_open(provider: str) -> bool:
    state = _circuit_state.get(provider, {})
    open_until = state.get("open_until")
    if open_until and time.time() < open_until:
        return True
    return False

def _record_failure(provider: str) -> None:
    state = _circuit_state.setdefault(provider, {"failures": 0})
    state["failures"] = state.get("failures", 0) + 1
    logger.warning(f"{provider} failure count: {state['failures']}")
    if state["failures"] >= FAILURE_THRESHOLD:
        state["open_until"] = time.time() + COOLDOWN_SECONDS
        logger.error(f"Circuit breaker opened for {provider} for {COOLDOWN_SECONDS}s")

def _record_success(provider: str) -> None:
    if provider in _circuit_state:
        _circuit_state[provider]["failures"] = 0
        _circuit_state[provider].pop("open_until", None)

def retry_with_backoff(fn, max_retries: int = 3, base_delay: float = 0.5):
    for attempt in range(max_retries + 1):
        try:
            return fn()
        except Exception as e:
            if attempt == max_retries:
                raise
            delay = base_delay * (2 ** attempt)
            logger.warning(f"Retry {attempt + 1}/{max_retries} after error: {e}. Backoff {delay}s")
            time.sleep(delay)

def _call_openai(interest: str, level: str, retrieved_courses: List[Any] = None) -> str:
    if retrieved_courses:
        return sanitize_text(call_openai_rag_assistant(interest, level, retrieved_courses))
    else:
        return sanitize_text(call_openai_assistant(interest, level))

def _call_gemini(interest: str, level: str, retrieved_courses: List[Any] = None) -> str:
    return gemini_generate(interest, level, retrieved_courses)

def _call_claude(interest: str, level: str, retrieved_courses: List[Any] = None) -> str:
    return claude_generate(interest, level, retrieved_courses)

def _call_local(interest: str, level: str, retrieved_courses: List[Any] = None) -> str:
    return fallback_recommendations(interest, level, retrieved_courses)

def get_ai_response(interest: str, level: str, retrieved_courses: List[Any] = None) -> Dict[str, Any]:
    """Attempt to get a response from the provider chain.
    Returns a dict with keys: reply (str), model (str), fallback (bool).
    """
    for provider in PROVIDER_ORDER:
        if _is_circuit_open(provider):
            logger.info(f"Skipping {provider} – circuit breaker open")
            continue
        try:
            if provider == "openai":
                fn = lambda: _call_openai(interest, level, retrieved_courses)
            elif provider == "gemini":
                fn = lambda: _call_gemini(interest, level, retrieved_courses)
            elif provider == "claude":
                fn = lambda: _call_claude(interest, level, retrieved_courses)
            else:
                fn = lambda: _call_local(interest, level, retrieved_courses)

            reply = retry_with_backoff(fn)
            _record_success(provider)
            return {"reply": reply, "model": provider, "fallback": provider == "local"}
        except Exception as exc:
            logger.error(f"Provider {provider} failed: {exc}")
            _record_failure(provider)
            continue
    # If all providers failed, return a generic fallback message
    fallback_msg = fallback_recommendations(interest, level, retrieved_courses)
    return {"reply": fallback_msg, "model": "local", "fallback": True}

def get_provider_health() -> Dict[str, Any]:
    health = {}
    now = time.time()
    for provider in PROVIDER_ORDER:
        state = _circuit_state.get(provider, {})
        open_until = state.get("open_until", 0)
        health[provider] = {
            "circuit_open": now < open_until,
            "failures": state.get("failures", 0),
            "cooldown_seconds": max(0, int(open_until - now)) if now < open_until else 0,
        }
    return health
