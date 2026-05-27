import numpy as np
import json
import logging
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity
from backend.app.models.models import db, Course
from backend.app.services.openai_service import get_openai_client

logger = logging.getLogger(__name__)

def generate_openai_embedding(text):
    """Generates 1536-dimensional text-embedding-3-small vector using OpenAI."""
    client = get_openai_client()
    if not client:
        return None
    try:
        response = client.embeddings.create(
            model="text-embedding-3-small",
            input=[text]
        )
        return response.data[0].embedding
    except Exception as e:
        logger.error(f"Error generating embedding from OpenAI: {str(e)}")
        return None

def compute_cosine_similarity(v1, v2):
    """Utility to calculate cosine similarity between two numeric lists."""
    arr1 = np.array(v1)
    arr2 = np.array(v2)
    dot_product = np.dot(arr1, arr2)
    norm1 = np.linalg.norm(arr1)
    norm2 = np.linalg.norm(arr2)
    if norm1 == 0 or norm2 == 0:
        return 0.0
    return float(dot_product / (norm1 * norm2))

def build_course_document(course):
    """Helper to convert a course object into a clean search document."""
    return f"{course.title} {course.category} {course.tags} {course.provider}".lower()

def local_tfidf_recommendations(query, level, limit=3):
    """
    Robust 100% offline fallback recommendation engine using TF-IDF and Cosine Similarity.
    Matches queries by level and keyword similarity.
    """
    try:
        logger.info(f"Running offline TF-IDF fallback matcher for query: '{query}' [level={level}]")
        
        # 1. Fetch courses filtered by level
        courses = Course.query.filter_by(level=level).all()
        if not courses:
            # If no course matches the level, search all courses
            courses = Course.query.all()
            
        if not courses:
            return []

        # 2. Extract documents
        documents = [build_course_document(c) for c in courses]
        
        # 3. Fit TF-IDF Vectorizer
        vectorizer = TfidfVectorizer(stop_words='english')
        tfidf_matrix = vectorizer.fit_transform(documents)
        query_vector = vectorizer.transform([query.lower()])

        # 4. Calculate Cosine Similarities
        similarities = cosine_similarity(query_vector, tfidf_matrix).flatten()

        # 5. Rank and retrieve
        ranked_indices = np.argsort(similarities)[::-1]
        
        results = []
        for idx in ranked_indices:
            score = float(similarities[idx])
            # Only include elements with some similarity or return top matches anyway if all are 0
            if score >= 0.01 or len(results) < limit:
                results.append((courses[idx], score))
                if len(results) >= limit:
                    break
        
        return [item[0] for item in results]

    except Exception as e:
        logger.error(f"Error during TF-IDF calculations: {str(e)}")
        # Ultimate fallback: return simple substring filter matching level
        return Course.query.filter(
            (Course.level == level) & 
            (Course.category.ilike(f"%{query}%") | Course.tags.ilike(f"%{query}%"))
        ).limit(limit).all()

def semantic_recommendations(query, level, limit=3):
    """
    Semantic hybrid recommendation engine.
    1. Tries to generate vector embeddings using OpenAI.
    2. Runs cosine-similarity against course pre-computed embeddings.
    3. Falls back to local TF-IDF if OpenAI fails or key is missing.
    """
    client = get_openai_client()
    if not client:
        return local_tfidf_recommendations(query, level, limit)

    query_embedding = generate_openai_embedding(query)
    if not query_embedding:
        logger.warning("Failed to generate query embedding. Falling back to TF-IDF.")
        return local_tfidf_recommendations(query, level, limit)

    try:
        # Fetch courses filtered by level
        courses = Course.query.filter_by(level=level).all()
        if not courses:
            courses = Course.query.all()
            
        if not courses:
            return []

        # Ensure embeddings are pre-computed. If a course is missing embedding, generate it dynamically!
        scored_courses = []
        for course in courses:
            c_emb = course.get_embedding()
            if not c_emb:
                # Dynamically generate and save course embedding (lazy computation)
                logger.info(f"Dynamically generating embedding for course ID {course.id}: '{course.title}'")
                doc = build_course_document(course)
                c_emb = generate_openai_embedding(doc)
                if c_emb:
                    course.set_embedding(c_emb)
                    db.session.add(course)
                    db.session.commit()
            
            if c_emb:
                score = compute_cosine_similarity(query_embedding, c_emb)
                scored_courses.append((course, score))

        if not scored_courses:
            return local_tfidf_recommendations(query, level, limit)

        # Sort by similarity score descending
        scored_courses.sort(key=lambda x: x[1], reverse=True)
        
        logger.info(f"Semantic match found. Top score: {scored_courses[0][1]:.4f} for '{scored_courses[0][0].title}'")
        return [item[0] for item in scored_courses[:limit]]

    except Exception as e:
        logger.error(f"Error during semantic recommendation vector matching: {str(e)}")
        return local_tfidf_recommendations(query, level, limit)

def precompute_all_course_embeddings(app):
    """Utility function to pre-compute and store vector embeddings for all seeded courses."""
    with app.app_context():
        client = get_openai_client()
        if not client:
            logger.warning("Cannot pre-compute embeddings: OpenAI key is missing.")
            return

        courses = Course.query.all()
        updated_count = 0
        
        logger.info("Starting batch pre-computation of course embeddings...")
        for c in courses:
            if not c.embedding:
                doc = build_course_document(c)
                emb = generate_openai_embedding(doc)
                if emb:
                    c.set_embedding(emb)
                    db.session.add(c)
                    updated_count += 1
        
        if updated_count > 0:
            db.session.commit()
            logger.info(f"Successfully computed and stored {updated_count} course embeddings.")
        else:
            logger.info("All courses already have embeddings. Seeding skipped.")
