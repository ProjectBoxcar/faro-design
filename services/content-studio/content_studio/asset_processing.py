"""
Raw asset processing — normalize uploads and extract lightweight signals.

No caption generation here. Placeholders for frame extraction / encoding.
"""

from __future__ import annotations

import mimetypes
import uuid
from pathlib import Path
from typing import Optional

from .models import RawAsset


def classify_mime(mime_type: str) -> str:
    if mime_type.startswith("image/"):
        return "image"
    if mime_type.startswith("video/"):
        return "video"
    return "unknown"


def register_upload(
    filename: str,
    mime_type: Optional[str] = None,
    local_path: Optional[str] = None,
    *,
    asset_id: Optional[str] = None,
) -> RawAsset:
    """Create a RawAsset record after the file is stored on disk/object storage."""
    guessed, _ = mimetypes.guess_type(filename)
    mime = mime_type or guessed or "application/octet-stream"
    kind = classify_mime(mime)
    return RawAsset(
        id=asset_id or str(uuid.uuid4()),
        filename=filename,
        mime_type=mime,
        kind=kind,  # type: ignore[arg-type]
        local_path=local_path,
        metadata={},
    )


def extract_keyframes(asset: RawAsset, max_frames: int = 8) -> list[str]:
    """
    Placeholder: return paths/URIs of extracted frames for video assets.
    Wire ffmpeg / model-ready sampling later.
    """
    if asset.kind != "video":
        return [asset.local_path] if asset.local_path else []
    # TODO: ffmpeg -i ... extract max_frames evenly spaced stills
    return []


def normalize_for_platform(asset: RawAsset, platform: str) -> dict:
    """
    Placeholder crop/resize plan per platform.
    Returns a recipe, not a finished file.
    """
    ratios = {
        "instagram": "1:1",
        "tiktok": "9:16",
        "linkedin": "1.91:1",
    }
    return {
        "asset_id": asset.id,
        "platform": platform,
        "target_aspect_ratio": ratios.get(platform, "1:1"),
        "status": "placeholder",
        "message": "Wire image/video transform API here.",
    }


def validate_batch(assets: list[RawAsset]) -> list[str]:
    """Return human-readable issues (empty = ok)."""
    issues: list[str] = []
    if not assets:
        issues.append("Upload at least one photo or video.")
    for a in assets:
        if a.kind == "unknown":
            issues.append(f"Unsupported type for {a.filename}")
    return issues
