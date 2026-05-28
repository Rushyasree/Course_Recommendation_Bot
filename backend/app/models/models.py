from flask_sqlalchemy import SQLAlchemy
from datetime import datetime
import json

db = SQLAlchemy()

class User(db.Model):
    __tablename__ = 'users'
    
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(80), unique=True, nullable=True)
    password_hash = db.Column(db.String(256), nullable=True)
    session_id = db.Column(db.String(120), unique=True, nullable=True)  # For anonymous tracking
    name = db.Column(db.String(100), nullable=True)
    interests = db.Column(db.String(500), nullable=True)
    skills = db.Column(db.Text, nullable=True)  # Comma-separated or JSON string of skills
    target_role = db.Column(db.String(100), nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    # Relationships
    chat_history = db.relationship('ChatHistory', backref='user', lazy=True, cascade="all, delete-orphan")
    saved_recommendations = db.relationship('SavedRecommendation', backref='user', lazy=True, cascade="all, delete-orphan")

    def to_dict(self):
        return {
            "id": self.id,
            "username": self.username,
            "session_id": self.session_id,
            "name": self.name,
            "interests": self.interests,
            "skills": self.skills.split(",") if self.skills else [],
            "target_role": self.target_role
        }


class Course(db.Model):
    __tablename__ = 'courses'
    
    id = db.Column(db.Integer, primary_key=True)
    title = db.Column(db.String(200), nullable=False)
    category = db.Column(db.String(100), nullable=False)
    level = db.Column(db.String(50), nullable=False)
    provider = db.Column(db.String(100), nullable=False)
    tags = db.Column(db.String(500), nullable=False)  # Stored as comma-separated tags
    link = db.Column(db.String(500), nullable=False)
    embedding = db.Column(db.Text, nullable=True)  # JSON-serialized array of floats for vector search

    def to_dict(self):
        return {
            "id": self.id,
            "title": self.title,
            "category": self.category,
            "level": self.level,
            "provider": self.provider,
            "tags": [tag.strip() for tag in self.tags.split(",") if tag.strip()],
            "link": self.link
        }

    def set_embedding(self, embedding_list):
        self.embedding = json.dumps(embedding_list)

    def get_embedding(self):
        return json.loads(self.embedding) if self.embedding else None


class ChatHistory(db.Model):
    __tablename__ = 'chat_history'
    
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id', ondelete='CASCADE'), nullable=False)
    sender = db.Column(db.String(20), nullable=False)  # 'user' or 'bot'
    text = db.Column(db.Text, nullable=False)
    stage = db.Column(db.String(50), nullable=True)  # The state-machine stage at this message
    timestamp = db.Column(db.DateTime, default=datetime.utcnow)

    def to_dict(self):
        return {
            "id": self.id,
            "sender": self.sender,
            "text": self.text,
            "stage": self.stage,
            "timestamp": self.timestamp.isoformat()
        }


class SavedRecommendation(db.Model):
    __tablename__ = 'saved_recommendations'
    
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id', ondelete='CASCADE'), nullable=False)
    course_id = db.Column(db.Integer, db.ForeignKey('courses.id', ondelete='CASCADE'), nullable=False)
    timestamp = db.Column(db.DateTime, default=datetime.utcnow)

    # Relationship to easily fetch course details
    course = db.relationship('Course', backref='saves')

    def to_dict(self):
        return {
            "id": self.id,
            "user_id": self.user_id,
            "course": self.course.to_dict() if self.course else None,
            "timestamp": self.timestamp.isoformat()
        }


class RoadmapProgress(db.Model):
    __tablename__ = 'roadmap_progress'

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id', ondelete='CASCADE'), nullable=False)
    skill = db.Column(db.String(120), nullable=False)
    stage = db.Column(db.String(50), default="Beginner")
    progress = db.Column(db.Integer, default=0)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class AnalyticsSnapshot(db.Model):
    __tablename__ = 'analytics'

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id', ondelete='CASCADE'), nullable=False)
    career_readiness_score = db.Column(db.Integer, default=0)
    roadmap_completion = db.Column(db.Integer, default=0)
    payload = db.Column(db.Text, nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)


class UploadedResume(db.Model):
    __tablename__ = 'uploaded_resumes'

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id', ondelete='CASCADE'), nullable=True)
    filename = db.Column(db.String(255), nullable=False)
    target_role = db.Column(db.String(120), nullable=False)
    extracted_skills = db.Column(db.Text, nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)


class RecommendationFeedback(db.Model):
    __tablename__ = 'recommendation_feedback'

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id', ondelete='CASCADE'), nullable=True)
    course_id = db.Column(db.Integer, db.ForeignKey('courses.id', ondelete='CASCADE'), nullable=False)
    rating = db.Column(db.Integer, nullable=True)
    feedback = db.Column(db.String(500), nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    course = db.relationship('Course', backref='feedback')
