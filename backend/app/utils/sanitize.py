import re

def sanitize_text(text: str) -> str:
    """Remove internal AI tags like <|system|> from the given text.

    Args:
        text: The raw string possibly containing AI channel tags.
    Returns:
        Cleaned string without any <|...|> patterns.
    """
    if not text:
        return ""
    # Regex matches any <|...|> pattern non-greedily.
    cleaned = re.sub(r"<\|[^|]*\|>", "", text)
    return cleaned.strip()

__all__ = ["sanitize_text"]
