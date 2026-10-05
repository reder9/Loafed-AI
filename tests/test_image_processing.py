import io
import pytest
from PIL import Image
from starlette.datastructures import UploadFile
from fastapi import HTTPException
import app


class TestImageProcessing:
    """Tests image thumbnail creation and validation logic."""

    def test_create_thumbnail_from_rgb_jpeg(self):
        # Create a 1200x800 image
        img = Image.new("RGB", (1200, 800), color=(255, 100, 50))
        buf = io.BytesIO()
        img.save(buf, format="JPEG")
        raw_bytes = buf.getvalue()

        thumb_bytes = app.create_leaderboard_thumbnail(raw_bytes)
        assert len(thumb_bytes) > 0

        # Verify output is valid WebP and bounded to 600x600
        with Image.open(io.BytesIO(thumb_bytes)) as out_img:
            assert out_img.format == "WEBP"
            w, h = out_img.size
            assert w <= 600
            assert h <= 600
            assert w == 600  # scaled proportionally: 1200x800 -> 600x400
            assert h == 400

    def test_create_thumbnail_from_rgba_png_converts_cleanly(self):
        # RGBA with transparent alpha channel
        img = Image.new("RGBA", (400, 400), color=(0, 0, 0, 0))
        buf = io.BytesIO()
        img.save(buf, format="PNG")

        thumb_bytes = app.create_leaderboard_thumbnail(buf.getvalue())
        with Image.open(io.BytesIO(thumb_bytes)) as out_img:
            assert out_img.format == "WEBP"
            assert out_img.mode in ("RGB", "RGBA")

    def test_create_thumbnail_from_corrupted_bytes_raises_exception(self):
        with pytest.raises(Exception):
            app.create_leaderboard_thumbnail(b"not_an_image_at_all")


class TestReadAndValidateImage:
    """Tests the async read_and_validate_image upload guard."""

    @pytest.mark.anyio
    async def test_valid_jpeg_upload(self, sample_image_bytes):
        file = UploadFile(filename="cat.jpg", file=io.BytesIO(sample_image_bytes))
        content, mime = await app.read_and_validate_image(file)
        assert len(content) == len(sample_image_bytes)
        assert mime == "image/jpeg"

    @pytest.mark.anyio
    async def test_valid_png_upload(self, sample_png_bytes):
        file = UploadFile(filename="cat.png", file=io.BytesIO(sample_png_bytes))
        content, mime = await app.read_and_validate_image(file)
        assert len(content) == len(sample_png_bytes)
        assert mime == "image/png"

    @pytest.mark.anyio
    async def test_empty_file_returns_empty_tuple(self):
        file = UploadFile(filename="empty.jpg", file=io.BytesIO(b""))
        content, mime = await app.read_and_validate_image(file)
        assert content == b""
        assert mime == ""

    @pytest.mark.anyio
    async def test_fake_image_file_rejected(self):
        # Text file pretending to be JPEG
        fake_content = b"RIFF....WEBPVP8 ... fake text content"
        file = UploadFile(filename="fake.jpg", file=io.BytesIO(fake_content))
        with pytest.raises(HTTPException) as exc_info:
            await app.read_and_validate_image(file)
        assert exc_info.value.status_code == 400
        assert "not a valid" in exc_info.value.detail.lower()

    @pytest.mark.anyio
    async def test_oversized_file_rejected(self, monkeypatch):
        # Temporarily set max bytes small to test cap without allocating 15MB
        monkeypatch.setattr(app, "MAX_IMAGE_BYTES", 100)
        large_bytes = b"A" * 150
        file = UploadFile(filename="oversized.jpg", file=io.BytesIO(large_bytes))
        with pytest.raises(HTTPException) as exc_info:
            await app.read_and_validate_image(file)
        assert exc_info.value.status_code == 413

    @pytest.mark.anyio
    async def test_excessive_dimensions_rejected(self, monkeypatch):
        monkeypatch.setattr(app, "MAX_IMAGE_DIMENSION", 500)
        img = Image.new("RGB", (600, 400), color=(255, 255, 255))
        buf = io.BytesIO()
        img.save(buf, format="JPEG")

        file = UploadFile(filename="huge_dimension.jpg", file=io.BytesIO(buf.getvalue()))
        with pytest.raises(HTTPException) as exc_info:
            await app.read_and_validate_image(file)
        assert exc_info.value.status_code == 400
        assert "pixels per side" in exc_info.value.detail.lower()
