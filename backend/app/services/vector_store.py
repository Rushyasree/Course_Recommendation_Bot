import logging
import os

logger = logging.getLogger(__name__)

COLLECTION_NAME = "elevateai_courses"


def is_chroma_enabled():
    return os.getenv("CHROMA_ENABLED", "false").lower() in {"1", "true", "yes"}


def get_collection():
    if not is_chroma_enabled():
        return None

    try:
        import chromadb

        client = chromadb.PersistentClient(path=os.getenv("CHROMA_PATH", "./chroma_data"))
        return client.get_or_create_collection(name=COLLECTION_NAME, metadata={"hnsw:space": "cosine"})
    except Exception as exc:
        logger.warning(f"ChromaDB unavailable, using SQL embedding fallback: {exc}")
        return None


def upsert_course_embedding(course, embedding):
    collection = get_collection()
    if not collection or not embedding:
        return False

    collection.upsert(
        ids=[str(course.id)],
        embeddings=[embedding],
        documents=[f"{course.title} {course.category} {course.tags} {course.provider}"],
        metadatas=[
            {
                "course_id": course.id,
                "title": course.title,
                "level": course.level,
                "category": course.category,
                "provider": course.provider,
            }
        ],
    )
    return True


def query_course_ids(query_embedding, level=None, limit=4):
    collection = get_collection()
    if not collection or not query_embedding:
        return []

    where = {"level": level} if level else None
    try:
        result = collection.query(query_embeddings=[query_embedding], n_results=limit, where=where)
        ids = result.get("ids", [[]])[0]
        return [int(course_id) for course_id in ids]
    except Exception as exc:
        logger.warning(f"ChromaDB query failed, using SQL embedding fallback: {exc}")
        return []
