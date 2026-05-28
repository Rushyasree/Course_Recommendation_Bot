from backend.app.services.personalization_service import adjust_readiness_score, build_personalization_profile


def test_empty_personalization_profile_is_stable():
    profile = build_personalization_profile(None)

    assert profile["signal_count"] == 0
    assert profile["top_interests"] == []
    assert profile["progress_average"] == 0
    assert "next_action" in profile


def test_readiness_adjustment_is_bounded():
    profile = {
        "progress_average": 100,
        "feedback_count": 20,
        "saved_count": 20,
    }

    assert adjust_readiness_score(95, profile) == 100
    assert adjust_readiness_score(40, profile) == 60
