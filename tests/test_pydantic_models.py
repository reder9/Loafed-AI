import pytest
from pydantic import ValidationError
import app


class TestPydanticSchemas:
    """Tests Pydantic models for request payloads and AI structured response schema."""

    def test_loaf_analysis_result_valid(self, valid_loaf_analysis):
        # Build full payload matching LoafAnalysisResult
        payload = {
            "is_cat": True,
            "rejection_reason": None,
            "cat_name": "Oliver",
            "overall_score": 92,
            "grade_letter": "A",
            "loaf_rank": "Master Artisan Loaf",
            "bread_classification": "Toasted Golden Brioche",
            "summary_critique": "Solid compactness and aerodynamic form.",
            "paw_tuck": {
                "score": 24,
                "status": "Hidden Peet",
                "critique": "No paws visible.",
                "observations": ["Undercarriage clear"]
            },
            "tail_tuck": {
                "score": 23,
                "status": "Flank Hug",
                "critique": "Tail wrapped tightly.",
                "observations": ["Flush to flank"]
            },
            "elbow_compactness": {
                "score": 22,
                "status": "Tight Fold",
                "critique": "No flare.",
                "observations": ["Chest curve smooth"]
            },
            "crust_symmetry": {
                "score": 23,
                "status": "Uniform Crust",
                "critique": "Even coat coloring.",
                "observations": ["Dorsal symmetry even"]
            },
            "drag_coefficient": 0.05,
            "oar_detected": False,
            "face_loaf": False,
            "multi_angle_bonus": 3,
            "badges": ["Stealth Peet", "Aero Master"],
            "fun_tips_for_cat": ["Keep resting like this"],
            "angle_notes": {
                "front": "Paws tucked",
                "side": "Sleek contour"
            },
            "best_thumbnail_index": 0,
            "angle_classifications": ["front", "side"]
        }

        result = app.LoafAnalysisResult(**payload)
        assert result.is_cat is True
        assert result.cat_name == "Oliver"
        assert result.overall_score == 92
        assert result.grade_letter == "A"
        assert result.drag_coefficient == 0.05
        assert result.paw_tuck.score == 24
        assert len(result.badges) == 2

    def test_loaf_analysis_rejection_for_non_cat(self):
        payload = {
            "is_cat": False,
            "rejection_reason": "Subject identified as a golden retriever, not a feline.",
            "cat_name": "Doggo",
            "overall_score": 0,
            "grade_letter": "F",
            "loaf_rank": "Non-Feline Entity",
            "bread_classification": "Not Bread",
            "summary_critique": "Disqualified.",
            "paw_tuck": {"score": 0, "status": "Visible", "critique": "Paws visible", "observations": []},
            "tail_tuck": {"score": 0, "status": "Wagging", "critique": "Tail out", "observations": []},
            "elbow_compactness": {"score": 0, "status": "Flared", "critique": "Flared", "observations": []},
            "crust_symmetry": {"score": 0, "status": "Uneven", "critique": "Uneven", "observations": []},
            "drag_coefficient": 0.99,
            "oar_detected": False,
            "face_loaf": False,
            "multi_angle_bonus": 0,
            "badges": [],
            "fun_tips_for_cat": [],
            "angle_notes": {}
        }
        result = app.LoafAnalysisResult(**payload)
        assert result.is_cat is False
        assert "retriever" in result.rejection_reason

    def test_missing_required_fields_raises_validation_error(self):
        with pytest.raises(ValidationError):
            # Missing paw_tuck, tail_tuck, etc.
            app.LoafAnalysisResult(cat_name="Incomplete")

    def test_email_auth_requests(self):
        # EmailSignUpRequest
        signup = app.EmailSignUpRequest(
            email="baker@example.com",
            password="StrongPassword123!",
            display_name="Chef Mochi"
        )
        assert signup.email == "baker@example.com"
        assert signup.display_name == "Chef Mochi"

        # EmailSignInRequest
        signin = app.EmailSignInRequest(email="baker@example.com", password="SecretPassword123!")
        assert signin.email == "baker@example.com"

        # EmailConfirmRequest
        confirm = app.EmailConfirmRequest(email="baker@example.com", code="123456")
        assert confirm.code == "123456"

        # ForgotPasswordRequest & ConfirmForgotPasswordRequest
        forgot = app.ForgotPasswordRequest(email="baker@example.com")
        assert forgot.email == "baker@example.com"

        confirm_forgot = app.ConfirmForgotPasswordRequest(
            email="baker@example.com",
            code="654321",
            new_password="NewStrongPassword456!"
        )
        assert confirm_forgot.new_password == "NewStrongPassword456!"

    def test_update_profile_and_report_requests(self):
        profile = app.UpdateProfileRequest(display_name="Master Baker")
        assert profile.display_name == "Master Baker"

        report = app.LeaderboardReportRequest(entry_id="loaf_12345", reason="Inappropriate image", score=92.24)
        assert report.entry_id == "loaf_12345"
        assert report.reason == "Inappropriate image"
        assert report.score == 92.24

    def test_loaf_analysis_result_decimal_scores(self):
        payload = {
            "is_cat": True,
            "rejection_reason": None,
            "cat_name": "Oliver",
            "overall_score": 92.24,
            "grade_letter": "A",
            "loaf_rank": "Master Artisan Loaf",
            "bread_classification": "Toasted Golden Brioche",
            "summary_critique": "Solid compactness and aerodynamic form.",
            "paw_tuck": {
                "score": 24.55,
                "status": "Hidden Peet",
                "critique": "No paws visible.",
                "observations": ["Undercarriage clear"]
            },
            "tail_tuck": {
                "score": 23.10,
                "status": "Flank Hug",
                "critique": "Tail wrapped tightly.",
                "observations": ["Flush to flank"]
            },
            "elbow_compactness": {
                "score": 22.35,
                "status": "Tight Fold",
                "critique": "No flare.",
                "observations": ["Chest curve smooth"]
            },
            "crust_symmetry": {
                "score": 22.24,
                "status": "Uniform Crust",
                "critique": "Even coat coloring.",
                "observations": ["Dorsal symmetry even"]
            },
            "drag_coefficient": 0.05,
            "oar_detected": False,
            "face_loaf": False,
            "multi_angle_bonus": 2.50,
            "badges": ["Stealth Peet", "Aero Master"],
            "fun_tips_for_cat": ["Keep resting like this"],
            "angle_notes": {
                "front": "Paws tucked",
                "side": "Sleek contour"
            },
            "best_thumbnail_index": 0,
            "angle_classifications": ["front", "side"]
        }
        result = app.LoafAnalysisResult(**payload)
        assert result.overall_score == 92.24
        assert result.paw_tuck.score == 24.55
        assert result.tail_tuck.score == 23.10
        assert result.elbow_compactness.score == 22.35
        assert result.crust_symmetry.score == 22.24
        assert result.multi_angle_bonus == 2.50
