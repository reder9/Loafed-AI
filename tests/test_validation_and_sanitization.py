import pytest
from fastapi import HTTPException
import app


class TestProfanityFilter:
    """Tests the is_profane utility against various clean and offensive strings."""

    @pytest.mark.parametrize("clean_name", [
        "Buttercup",
        "Professor Whiskers",
        "Chonks",
        "Flash the Cat",
        "Mochi & Sesame",
        "Brioche Boule",
        "Captain Fluffy-Paws",
        "Sir Reginald O'Malley",
        "Milo",
        "Luna",
        "Bella",
        "Oliver",
        "Tater Tot",
    ])
    def test_clean_names_pass(self, clean_name):
        assert not app.is_profane(clean_name), f"Expected '{clean_name}' to be clean"

    def test_empty_or_none_returns_false(self):
        assert not app.is_profane("")
        assert not app.is_profane(None)

    @pytest.mark.parametrize("profane_input", [
        "fuck",
        "shit",
        "bitch",
        "asshole",
        "cunt",
        "nigger",
        "faggot",
        "f.u.c.k",
        "s-h-i-t",
        "fuuuck",
        "f*ck",
        "heil hitler",
    ])
    def test_profane_strings_detected(self, profane_input):
        assert app.is_profane(profane_input), f"Expected '{profane_input}' to be flagged as profane"


class TestValidateAndSanitizeName:
    """Tests validate_and_sanitize_name across valid inputs and security edge cases."""

    def test_valid_cat_and_baker_names(self):
        assert app.validate_and_sanitize_name("Buttercup", "Cat Name") == "Buttercup"
        assert app.validate_and_sanitize_name("  Professor Whiskers  ", "Cat Name") == "Professor Whiskers"
        assert app.validate_and_sanitize_name("Mochi-Roll", "Cat Name") == "Mochi-Roll"
        assert app.validate_and_sanitize_name("O'Malley", "Cat Name") == "O'Malley"
        assert app.validate_and_sanitize_name("Cat & Dog", "Cat Name") == "Cat & Dog"
        assert app.validate_and_sanitize_name("Baker_Pro.1", "Baker Name") == "Baker_Pro.1"

    def test_hash_is_allowed_for_cat_names(self):
        assert app.validate_and_sanitize_name("C#", "Cat Name", allow_hash=True) == "C#"
        assert app.validate_and_sanitize_name("#Toast", "Cat Name", allow_hash=True) == "#Toast"

    def test_hash_remains_rejected_for_baker_names(self):
        with pytest.raises(HTTPException):
            app.validate_and_sanitize_name("Baker#1", "Baker Name")

    def test_missing_or_empty_name_raises_400(self):
        with pytest.raises(HTTPException) as exc_info:
            app.validate_and_sanitize_name("", "Baker Name")
        assert exc_info.value.status_code == 400
        assert "Baker Name is required" in exc_info.value.detail

        with pytest.raises(HTTPException):
            app.validate_and_sanitize_name(None, "Cat Name")

    def test_injection_characters_rejected(self):
        malicious = [
            "<script>alert(1)</script>",
            "cat; DROP TABLE users;--",
            "cat{test}",
            "cat`eval()`",
            "cat/slash",
            'cat"quotes"',
            "cat$variable",
        ]
        for bad in malicious:
            with pytest.raises(HTTPException) as exc_info:
                app.validate_and_sanitize_name(bad, "Cat Name")
            assert exc_info.value.status_code == 400
            assert "invalid characters" in exc_info.value.detail.lower()

    def test_length_boundaries(self):
        # Min length is 2 by default
        with pytest.raises(HTTPException) as exc_info:
            app.validate_and_sanitize_name("A", "Cat Name")
        assert exc_info.value.status_code == 400
        assert "at least 2 characters" in exc_info.value.detail

        # Max length is 30 by default
        long_name = "A" * 31
        with pytest.raises(HTTPException) as exc_info:
            app.validate_and_sanitize_name(long_name, "Cat Name")
        assert exc_info.value.status_code == 400
        assert "cannot exceed 30 characters" in exc_info.value.detail

    def test_placeholder_names_rejected(self):
        placeholders = ["anonymous", "placeholder", "unknown", "na", "untitled", "test", "none"]
        for p in placeholders:
            with pytest.raises(HTTPException) as exc_info:
                app.validate_and_sanitize_name(p, "Cat Name")
            assert exc_info.value.status_code == 400
            assert "generic placeholder" in exc_info.value.detail.lower()

    def test_reserved_names_rejected(self):
        reserved = ["admin", "administrator", "system", "moderator", "loafed", "redersoft", "official", "support"]
        for r in reserved:
            with pytest.raises(HTTPException) as exc_info:
                app.validate_and_sanitize_name(r, "Baker Name")
            assert exc_info.value.status_code == 400
            assert "reserved title" in exc_info.value.detail.lower()

    def test_profane_name_rejected(self):
        with pytest.raises(HTTPException) as exc_info:
            app.validate_and_sanitize_name("BadAssCat Bitch", "Cat Name")
        assert exc_info.value.status_code == 400
        assert "inappropriate or offensive language" in exc_info.value.detail.lower()

    def test_name_without_alphanumeric_rejected(self):
        with pytest.raises(HTTPException) as exc_info:
            app.validate_and_sanitize_name("---...", "Cat Name")
        assert exc_info.value.status_code == 400
        assert "at least one letter or number" in exc_info.value.detail.lower()


class TestSanitizeCatName:
    """Tests the lightweight sanitize_cat_name used during grading."""

    def test_valid_input(self):
        assert app.sanitize_cat_name("Buttercup") == "Buttercup"
        assert app.sanitize_cat_name("  Mochi  ") == "Mochi"

    def test_none_or_empty(self):
        assert app.sanitize_cat_name(None) is None
        assert app.sanitize_cat_name("") is None
        assert app.sanitize_cat_name("   ") is None

    def test_truncation_to_max_length(self):
        long_name = "X" * (app.MAX_CAT_NAME_LENGTH + 20)
        sanitized = app.sanitize_cat_name(long_name)
        assert len(sanitized) == app.MAX_CAT_NAME_LENGTH
