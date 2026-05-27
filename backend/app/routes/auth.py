from flask import Blueprint, request, jsonify
from werkzeug.security import generate_password_hash, check_password_hash
from flask_jwt_extended import create_access_token, jwt_required, get_jwt_identity
from backend.app.models.models import db, User
import logging

auth_bp = Blueprint('auth', __name__)
logger = logging.getLogger(__name__)

@auth_bp.route('/register', methods=['POST'])
def register():
    try:
        data = request.json or {}
        username = data.get('username')
        password = data.get('password')
        name = data.get('name', '')

        if not username or not password:
            return jsonify({"error": "Bad Request", "message": "Username and password are required fields."}), 400

        # Check for existing user
        existing_user = User.query.filter_by(username=username).first()
        if existing_user:
            return jsonify({"error": "Conflict", "message": "Username already exists. Please choose a different name."}), 409

        # Hash password and store user
        hashed_password = generate_password_hash(password)
        new_user = User(
            username=username,
            password_hash=hashed_password,
            name=name
        )
        db.session.add(new_user)
        db.session.commit()

        logger.info(f"Registered new secure user account: {username}")
        return jsonify({"message": "User registered successfully."}), 201

    except Exception as e:
        logger.error(f"Error during user registration: {str(e)}")
        return jsonify({"error": "Server Error", "message": "An unexpected error occurred. Please try again."}), 500


@auth_bp.route('/login', methods=['POST'])
def login():
    try:
        data = request.json or {}
        username = data.get('username')
        password = data.get('password')

        if not username or not password:
            return jsonify({"error": "Bad Request", "message": "Username and password are required fields."}), 400

        user = User.query.filter_by(username=username).first()
        if not user or not check_password_hash(user.password_hash, password):
            return jsonify({"error": "Unauthorized", "message": "Invalid username or password credentials."}), 401

        # Create access token (JWT)
        # We can store the username as the identity
        access_token = create_access_token(identity=str(user.id))
        
        logger.info(f"User logged in successfully: {username}")
        return jsonify({
            "token": access_token,
            "user": user.to_dict()
        }), 200

    except Exception as e:
        logger.error(f"Error during user login: {str(e)}")
        return jsonify({"error": "Server Error", "message": "An unexpected error occurred. Please try again."}), 500


@auth_bp.route('/profile', methods=['GET'])
@jwt_required()
def profile():
    try:
        user_id = get_jwt_identity()
        user = User.query.get(int(user_id))
        
        if not user:
            return jsonify({"error": "Not Found", "message": "User profile not found."}), 404

        return jsonify(user.to_dict()), 200

    except Exception as e:
        logger.error(f"Error retrieving user profile: {str(e)}")
        return jsonify({"error": "Server Error", "message": "An unexpected error occurred."}), 500


@auth_bp.route('/profile', methods=['PUT'])
@jwt_required()
def update_profile():
    try:
        user_id = get_jwt_identity()
        user = User.query.get(int(user_id))
        
        if not user:
            return jsonify({"error": "Not Found", "message": "User profile not found."}), 404

        data = request.json or {}
        if 'name' in data:
            user.name = data['name']
        if 'interests' in data:
            user.interests = data['interests'].lower()
        if 'target_role' in data:
            user.target_role = data['target_role']

        db.session.commit()
        logger.info(f"Updated profile details for user ID: {user_id}")
        return jsonify(user.to_dict()), 200

    except Exception as e:
        logger.error(f"Error updating user profile: {str(e)}")
        return jsonify({"error": "Server Error", "message": "An unexpected error occurred."}), 500
