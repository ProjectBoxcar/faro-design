"""
Content generation placeholders — captions, hashtags, platform visual variants.

Wire model API keys here later. Do not import brand ingestion IO.
"""

from __future__ import annotations

import uuid
from datetime import date
from typing import Iterable

from .models import (
    BrandProfile,
    ContentPost,
    GenerateMonthOptions,
    PlatformVariant,
    RawAsset,
)


def _placeholder_caption(profile: BrandProfile, day: int, asset: RawAsset | None) -> str:
    voice = ", ".join(profile.tone_of_voice[:3]) or "clear and human"
    name = profile.brand_name
    concept = profile.concept_statement or "what we stand for"
    media = asset.filename if asset else "this moment"
    return (
        f"{name} — day {day}. "
        f"Speaking in a {voice} voice about {concept}. "
        f"(Placeholder caption for {media}.)"
    )


def _placeholder_hashtags(profile: BrandProfile) -> list[str]:
    base = profile.brand_name.replace(" ", "").lower() or "brand"
    tags = [f"#{base}", "#brand", "#content"]
    for t in profile.personality_traits[:2]:
        tags.append("#" + "".join(c for c in t if c.isalnum()).lower())
    return tags[:8]


def generate_caption(
    profile: BrandProfile,
    asset: RawAsset | None,
    *,
    day_index: int,
    platform: str,
) -> str:
    """PLACEHOLDER — call caption LLM with profile + asset context."""
    # TODO: openai/anthropic caption call
    _ = platform
    return _placeholder_caption(profile, day_index, asset)


def generate_hashtags(profile: BrandProfile, caption: str) -> list[str]:
    """PLACEHOLDER — call hashtag model or rules engine."""
    _ = caption
    return _placeholder_hashtags(profile)


def generate_platform_variants(
    profile: BrandProfile,
    asset: RawAsset | None,
    platforms: Iterable[str],
) -> list[PlatformVariant]:
    """PLACEHOLDER — call crop/transform API per platform."""
    _ = profile
    _ = asset
    variants: list[PlatformVariant] = []
    ratio_map = {
        "instagram": ("1:1", "Centered square safe zone"),
        "tiktok": ("9:16", "Vertical; keep subject in upper two-thirds"),
        "linkedin": ("1.91:1", "Landscape; leave margin for UI chrome"),
    }
    for p in platforms:
        aspect, hint = ratio_map.get(p, ("1:1", "Default crop"))
        variants.append(
            PlatformVariant(
                platform=p,  # type: ignore[arg-type]
                aspect_ratio=aspect,
                crop_hint=hint,
                preview_uri=None,
            )
        )
    return variants


def build_posts_for_month(
    profile: BrandProfile,
    assets: list[RawAsset],
    options: GenerateMonthOptions,
) -> list[ContentPost]:
    """
    Scaffold monthly posts (even distribution). Not a real content strategy yet.
    """
    if not profile.locked:
        raise ValueError("Brand profile must be locked before generating content.")

    # Rough calendar length: posts_per_week * ~4 weeks
    total = max(1, options.posts_per_week * 4)
    posts: list[ContentPost] = []
    year, month = options.year, options.month

    for i in range(1, total + 1):
        day = min(28, 1 + ((i - 1) * 28) // total)
        date_iso = date(year, month, day).isoformat()
        asset = assets[(i - 1) % len(assets)] if assets else None
        primary = options.platforms[0] if options.platforms else "instagram"
        caption = generate_caption(profile, asset, day_index=i, platform=primary)
        hashtags = generate_hashtags(profile, caption)
        variants = generate_platform_variants(profile, asset, options.platforms)
        posts.append(
            ContentPost(
                id=str(uuid.uuid4()),
                day_index=i,
                date_iso=date_iso,
                platforms=list(options.platforms),
                caption=caption,
                hashtags=hashtags,
                variants=variants,
                source_asset_ids=[asset.id] if asset else [],
                status="draft",
            )
        )
    return posts
