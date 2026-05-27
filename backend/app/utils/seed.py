import json
import os
from backend.app.models.models import db, Course
import logging

logger = logging.getLogger(__name__)

def seed_database(app):
    with app.app_context():
        # Find paths dynamically
        base_dir = os.path.abspath(os.path.dirname(os.path.dirname(os.path.dirname(__file__))))
        courses_json_path = os.path.join(base_dir, 'courses.json')

        if not os.path.exists(courses_json_path):
            logger.error(f"Seeding failed: {courses_json_path} does not exist.")
            return

        try:
            with open(courses_json_path, 'r') as file:
                courses_data = json.load(file)

            seeded_count = 0
            for item in courses_data:
                # Check for existing course
                existing = Course.query.filter_by(title=item['title']).first()
                if not existing:
                    course = Course(
                        title=item['title'],
                        category=item['category'],
                        level=item['level'],
                        provider=item['provider'],
                        tags=", ".join(item['tags']),
                        link=item['link']
                    )
                    db.session.add(course)
                    seeded_count += 1
            
            db.session.commit()
            logger.info(f"Database seeding complete. Seeded {seeded_count} new courses.")
        except Exception as e:
            db.session.rollback()
            logger.error(f"Error seeding database: {str(e)}")

if __name__ == '__main__':
    from backend.app import create_app
    app = create_app()
    seed_database(app)
