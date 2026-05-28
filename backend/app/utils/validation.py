from backend.app.utils.sanitize import sanitize_text


def clean_string(value, *, min_length=0, max_length=500, field="value"):
    if value is None:
        return None
    cleaned = sanitize_text(str(value)).strip()
    if len(cleaned) < min_length:
        raise ValueError(f"{field} must be at least {min_length} characters.")
    if len(cleaned) > max_length:
        raise ValueError(f"{field} must be at most {max_length} characters.")
    return cleaned


def require_string(data, field, *, min_length=1, max_length=500):
    value = clean_string(data.get(field), min_length=min_length, max_length=max_length, field=field)
    if not value:
        raise ValueError(f"{field} is required.")
    return value


def optional_string(data, field, *, max_length=500, default=""):
    value = clean_string(data.get(field, default), max_length=max_length, field=field)
    return value if value is not None else default


def require_int(data, field, *, minimum=None, maximum=None):
    raw = data.get(field)
    if raw is None:
        raise ValueError(f"{field} is required.")
    try:
        value = int(raw)
    except (TypeError, ValueError) as exc:
        raise ValueError(f"{field} must be an integer.") from exc
    if minimum is not None and value < minimum:
        raise ValueError(f"{field} must be at least {minimum}.")
    if maximum is not None and value > maximum:
        raise ValueError(f"{field} must be at most {maximum}.")
    return value


def optional_int(data, field, *, minimum=None, maximum=None, default=None):
    if field not in data or data.get(field) is None:
        return default
    return require_int(data, field, minimum=minimum, maximum=maximum)
