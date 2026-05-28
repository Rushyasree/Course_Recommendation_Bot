from backend.app.services.resume_service import analyze_skill_gaps, build_radar_coordinates, extract_skills_from_text


def test_skill_extraction_normalizes_machine_learning_aliases():
    skills = set(extract_skills_from_text("Built Python and ML projects with SQL dashboards."))

    assert "python" in skills
    assert "sql" in skills
    assert "ml" in skills
    assert "machine learning" in skills


def test_gap_analysis_includes_radar_coordinates():
    analysis = analyze_skill_gaps(["python", "sql", "git"], "Data Scientist")

    assert analysis["target_role"] == "Data Scientist"
    assert "radar_coordinates" in analysis
    assert set(analysis["radar_coordinates"]) == {"programming", "data_science", "cloud", "cybersecurity"}
    assert 0 <= analysis["completion_rate"] <= 100


def test_radar_coordinates_are_bounded_percentages():
    coordinates = build_radar_coordinates({"python", "javascript", "docker", "linux", "security"})

    assert all(0 <= score <= 100 for score in coordinates.values())
    assert coordinates["programming"] > 0
    assert coordinates["cloud"] > 0
    assert coordinates["cybersecurity"] > 0
