import time
from collections import defaultdict, deque
from flask import jsonify, request

WINDOW_SECONDS = 60
MAX_REQUESTS = 90
_requests = defaultdict(deque)


def register_rate_limiter(app):
    @app.before_request
    def limit_requests():
        if request.path == "/api/health":
            return None

        key = request.headers.get("X-Forwarded-For", request.remote_addr or "anonymous").split(",")[0].strip()
        now = time.time()
        bucket = _requests[key]

        while bucket and now - bucket[0] > WINDOW_SECONDS:
            bucket.popleft()

        if len(bucket) >= MAX_REQUESTS:
            return jsonify({"error": "Too Many Requests", "message": "Please wait a moment before trying again."}), 429

        bucket.append(now)
        return None
