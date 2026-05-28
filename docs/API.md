# ElevateAI API Reference

Base URL: `/api`

Vector search note: the main app runs without ChromaDB. Install `backend/requirements-vector.txt` and set `CHROMA_ENABLED=true` only on environments that support Chroma's native dependency chain.

## Health

### `GET /health`

Returns backend status and AI provider circuit-breaker health.

```json
{
  "status": "healthy",
  "providers": {
    "openai": { "circuit_open": false, "failures": 0, "cooldown_seconds": 0 }
  }
}
```

## Auth

### `POST /auth/register`

```json
{
  "username": "learner01",
  "password": "strong-password",
  "name": "Learner"
}
```

### `POST /auth/login`

Returns a JWT token and user profile.

```json
{
  "username": "learner01",
  "password": "strong-password"
}
```

### `GET /auth/profile`

Requires `Authorization: Bearer <token>`.

### `PUT /auth/profile`

Requires `Authorization: Bearer <token>`.

```json
{
  "name": "Learner",
  "interests": "AI engineering",
  "target_role": "AI Engineer"
}
```

## Chat

### `POST /chat`

Runs the guided recommendation flow. Anonymous users should send `user_id`; authenticated users can rely on JWT.

```json
{
  "user_id": "anon-123",
  "message": "machine learning"
}
```

Response includes a natural language reply and structured courses.

```json
{
  "reply": "Here are the top matches...",
  "stage": "ask_interest",
  "model": "openai",
  "courses": [
    {
      "id": 1,
      "title": "Python for Everybody",
      "provider": "Coursera",
      "match_score": 0.95,
      "why_recommended": "Aligned with machine learning at Beginner level using semantic catalog retrieval."
    }
  ]
}
```

## Courses

### `GET /courses`

Query parameters:

- `q`: search text
- `level`: Beginner, Intermediate, Advanced
- `category`: category filter
- `limit`: max results, capped at 100

### `POST /courses/save`

```json
{
  "user_id": "anon-123",
  "course_id": 1
}
```

### `GET /courses/saved?user_id=anon-123`

Returns saved courses.

### `POST /courses/feedback`

Records recommendation feedback for future personalization.

```json
{
  "user_id": "anon-123",
  "course_id": 1,
  "rating": 5,
  "feedback": "helpful"
}
```

### `GET /courses/personalization?user_id=anon-123`

Returns collected recommendation signals used by the dashboard and future ranking.

```json
{
  "signal_count": 5,
  "top_interests": [{ "tag": "python", "weight": 2 }],
  "average_rating": 4.5,
  "saved_count": 2,
  "feedback_count": 2,
  "progress_average": 50,
  "next_action": "Continue with python courses and rate the next recommendation."
}
```

## Resume

### `POST /resume/upload`

Multipart form data:

- `file`: PDF resume
- `target_role`: target career role
- `user_id`: optional anonymous session id

Returns skill-gap analysis, recommendations, and career insights.

## Analytics

### `GET /stats/dashboard?user_id=anon-123`

Returns readiness score, radar coordinates, missing skills, trend data, and completed/pending counts.

## Roadmap

### `GET /roadmap/timeline?user_id=anon-123`

Returns skill-gap roadmap steps with recommended courses.

### `POST /roadmap/progress`

```json
{
  "user_id": "anon-123",
  "skill": "docker",
  "progress": 50,
  "stage": "Intermediate"
}
```

## Error Shape

Errors use a consistent JSON format:

```json
{
  "error": "Bad Request",
  "message": "course_id is required."
}
```
