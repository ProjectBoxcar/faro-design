"""
Shared content generation engine.

Workflow A and B both:
  1) obtain a locked BrandProfile (ingest or infer)
  2) process raw assets
  3) call generate_month(profile, assets, options)
"""

from __future__ import annotations

import uuid

from .asset_processing import validate_batch
from .brand_profile import ingest_from_project_export, infer_from_assets
from .generation import build_posts_for_month
from .models import (
    BrandProfile,
    ContentCalendar,
    GenerateMonthOptions,
    RawAsset,
)


def resolve_profile_from_project(project_export: dict) -> BrandProfile:
    """Workflow A entry: locked profile from completed FARO package."""
    return ingest_from_project_export(project_export)


def resolve_profile_from_footage(
    assets: list[RawAsset], brand_name: str = "Untitled"
) -> BrandProfile:
    """Workflow B entry: infer then lock starter profile."""
    return infer_from_assets(assets, brand_name=brand_name)


def generate_month(
    profile: BrandProfile,
    assets: list[RawAsset],
    options: GenerateMonthOptions,
    *,
    calendar_id: str | None = None,
    profile_id: str | None = None,
) -> ContentCalendar:
    """
    Shared engine — both workflows call this after a BrandProfile is locked.
    """
    issues = validate_batch(assets)
    if issues:
        # Soft: still allow generation with warnings encoded in calendar status notes later
        pass

    posts = build_posts_for_month(profile, assets, options)
    return ContentCalendar(
        id=calendar_id or str(uuid.uuid4()),
        profile_id=profile_id or "unbound",
        year=options.year,
        month=options.month,
        posts=posts,
        status="ready",
    )
