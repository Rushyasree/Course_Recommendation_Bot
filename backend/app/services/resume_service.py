import re
from pypdf import PdfReader
import logging

logger = logging.getLogger(__name__)

# Master lists of standard tech skills mapped to catalog tags
TECH_SKILLS = {
    "python", "javascript", "react", "node.js", "mongodb", "sql", "databases", "java", 
    "html", "css", "git", "github", "docker", "containers", "devops", "ci/cd", "aws", 
    "cloud", "azure", "kubernetes", "cybersecurity", "security", "networks", "linux", 
    "terminal", "blockchain", "solidity", "ethereum", "web3", "machine learning", "ml", 
    "deep learning", "neural networks", "figma", "ux", "design", "android", "kotlin", 
    "swift", "ios", "excel", "finance", "economics", "marketing", "seo"
}

# Career Role Skill Sets (defines target requirements)
ROLE_REQUIRED_SKILLS = {
    "frontend developer": {"javascript", "react", "html", "css", "git", "github", "figma", "ux", "design"},
    "data scientist": {"python", "sql", "databases", "machine learning", "ml", "deep learning", "neural networks", "excel"},
    "backend developer": {"python", "javascript", "node.js", "mongodb", "sql", "databases", "java", "git"},
    "mobile developer": {"android", "kotlin", "swift", "ios", "git"},
    "devops engineer": {"docker", "containers", "devops", "ci/cd", "aws", "cloud", "linux", "terminal", "git"},
    "cybersecurity analyst": {"cybersecurity", "security", "networks", "linux", "terminal"},
    "blockchain developer": {"blockchain", "solidity", "ethereum", "web3", "git", "github", "javascript"}
}

def extract_text_from_pdf(file_stream):
    """Extracts raw text content from an uploaded PDF file stream."""
    try:
        reader = PdfReader(file_stream)
        text = ""
        for page in reader.pages:
            page_text = page.extract_text()
            if page_text:
                text += page_text + " "
        return text
    except Exception as e:
        logger.error(f"Error parsing PDF file: {str(e)}")
        return ""

def extract_skills_from_text(text):
    """Uses token boundary regex matching to find master list skills in raw text."""
    found_skills = set()
    cleaned_text = text.lower().strip()
    
    # Simple token matches
    for skill in TECH_SKILLS:
        # Match using word boundaries. Escape skill name just in case of special characters
        pattern = r'\b' + re.escape(skill) + r'\b'
        if re.search(pattern, cleaned_text):
            found_skills.add(skill)
            
    # Handle shorthand matches
    if "ml" in found_skills:
        found_skills.add("machine learning")
    if "machine learning" in found_skills:
        found_skills.add("ml")

    return list(found_skills)

def analyze_skill_gaps(user_skills, target_role):
    """
    Compares extracted user skills against a target career path to isolate missing skills.
    Defaults to matching standard Software Developer gaps if the target role is unrecognized.
    """
    role = target_role.lower().strip()
    
    # Try to find the closest matching role key
    matched_role = "backend developer" # default fallback
    for r_key in ROLE_REQUIRED_SKILLS.keys():
        if r_key in role or role in r_key:
            matched_role = r_key
            break

    required = ROLE_REQUIRED_SKILLS[matched_role]
    user_skills_set = set([s.lower().strip() for s in user_skills])

    missing_skills = list(required - user_skills_set)
    matched_skills = list(required & user_skills_set)

    return {
        "target_role": matched_role.title(),
        "matched_skills": matched_skills,
        "missing_skills": missing_skills,
        "completion_rate": int((len(matched_skills) / len(required)) * 100) if required else 100
    }
