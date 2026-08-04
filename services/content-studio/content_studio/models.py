"""Shared data contracts for brand profile + content calendar."""

from __future__ import annotations

from enum import Enum
from typing import Any, Literal, Optional

from pydantic import BaseModel, Field


Platform = Literal["instagram", "tiktok", "linkedin"]
PostStatus = Literal["draft", "approved", "rejected"]


class BrandProfileSource(str, Enum):
    PROJECT = "project"  # Workflow A — locked FARO package
    INFERRED = "inferred"  # Workflow B — from footage


class ColorToken(BaseModel):
    name: str
    hex: str


class BrandProfile(BaseModel):
    """Locked input to content generation. Never regenerated mid-calendar without explicit re-lock."""

    source: BrandProfileSource
    project_id: Optional[str] = None
    brand_name: str
    concept_statement: Optional[str] = None
    tone_of_voice: list[str] = Field(default_factory=list)
    personality_traits: list[str] = Field(default_factory=list)
    promise: Optional[str] = None
    palette: list[ColorToken] = Field(default_factory=list)
    typography: dict[str, Any] = Field(default_factory=dict)
    logo_asset_id: Optional[str] = None
    logo_svg_preview: Optional[str] = None
    design_system_id: Optional[str] = None
    locked: bool = True
    notes: Optional[str] = None


class RawAsset(BaseModel):
    id: str
    filename: str
    mime_type: str
    kind: Literal["image", "video", "unknown"] = "unknown"
    local_path: Optional[str] = None
    duration_seconds: Optional[float] = None
    width: Optional[int] = None
    height: Optional[int] = None
    metadata: dict[str, Any] = Field(default_factory=dict)


class PlatformVariant(BaseModel):
    platform: Platform
    aspect_ratio: str  # e.g. "1:1", "9:16", "1.91:1"
    crop_hint: str
    # Placeholder path or data-URI once generation is wired
    preview_uri: Optional[str] = None


class ContentPost(BaseModel):
    id: str
    day_index: int  # 1..N within the calendar month
    date_iso: str
    platforms: list[Platform]
    caption: str
    hashtags: list[str]
    variants: list[PlatformVariant]
    source_asset_ids: list[str] = Field(default_factory=list)
    status: PostStatus = "draft"
    notes: Optional[str] = None


class ContentCalendar(BaseModel):
    id: str
    profile_id: str
    year: int
    month: int
    posts: list[ContentPost] = Field(default_factory=list)
    status: Literal["draft", "generating", "ready", "exported"] = "draft"


class GenerateMonthOptions(BaseModel):
    year: int
    month: int
    posts_per_week: int = 4
    platforms: list[Platform] = Field(
        default_factory=lambda: ["instagram", "tiktok", "linkedin"]
    )
