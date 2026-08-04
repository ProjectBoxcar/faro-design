"""
Brand profile ingestion — Workflow A (project) and B (infer from footage).

Keep pure: no content-generation calls here.
"""

from __future__ import annotations

from typing import Any, Optional

from .models import BrandProfile, BrandProfileSource, ColorToken, RawAsset


def ingest_from_project_export(payload: dict[str, Any]) -> BrandProfile:
    """
    Build a locked BrandProfile from a FARO project export JSON.

    Expected shape (flexible / best-effort):
      {
        "project": { "id", "name" },
        "strategy": { "concept", "tone", "personality", "promise", ... },
        "logo": { "assetId", "svg" },
        "visual": { "palette": [{name, hex}], "typography": {...}, "designSystemId" }
      }
    """
    project = payload.get("project") or {}
    strategy = payload.get("strategy") or {}
    logo = payload.get("logo") or {}
    visual = payload.get("visual") or {}

    palette_raw = visual.get("palette") or []
    palette: list[ColorToken] = []
    for p in palette_raw:
        if isinstance(p, dict) and p.get("hex"):
            palette.append(
                ColorToken(name=str(p.get("name") or "color"), hex=str(p["hex"]))
            )

    tone = strategy.get("tone") or strategy.get("tone_of_voice") or []
    if isinstance(tone, str):
        tone = [tone]
    personality = strategy.get("personality") or strategy.get("personality_traits") or []
    if isinstance(personality, str):
        personality = [personality]

    return BrandProfile(
        source=BrandProfileSource.PROJECT,
        project_id=project.get("id"),
        brand_name=str(project.get("name") or "Brand"),
        concept_statement=strategy.get("concept") or strategy.get("concept_statement"),
        tone_of_voice=list(tone),
        personality_traits=list(personality),
        promise=strategy.get("promise"),
        palette=palette,
        typography=dict(visual.get("typography") or {}),
        logo_asset_id=logo.get("assetId") or logo.get("asset_id"),
        logo_svg_preview=logo.get("svg"),
        design_system_id=visual.get("designSystemId") or visual.get("design_system_id"),
        locked=True,
        notes="Ingested from completed FARO brand package.",
    )


def infer_from_assets(assets: list[RawAsset], brand_name: str = "Untitled") -> BrandProfile:
    """
    Workflow B: lightweight starter brand from footage mood.

    Placeholder — inspect asset metadata only. Wire vision/video models later.
    """
    # TODO: call vision model on keyframes / stills for palette + mood adjectives
    kinds = {a.kind for a in assets}
    mood = ["documentary", "authentic"]
    if "video" in kinds:
        mood.append("motion-led")
    if "image" in kinds:
        mood.append("still-first")

    # Placeholder palette (neutral starter — replace with inferred swatches)
    palette = [
        ColorToken(name="ink", hex="#1A1A1A"),
        ColorToken(name="paper", hex="#F7F4EF"),
        ColorToken(name="accent", hex="#C45C26"),
    ]

    return BrandProfile(
        source=BrandProfileSource.INFERRED,
        project_id=None,
        brand_name=brand_name,
        concept_statement="A working voice inferred from uploaded media (refine anytime).",
        tone_of_voice=mood,
        personality_traits=["approachable", "visual-first"],
        promise=None,
        palette=palette,
        typography={"heading": "system-ui", "body": "system-ui"},
        locked=True,
        notes=(
            "Inferred starter profile from raw assets. "
            "Not a full FARO strategy — suitable for content consistency only."
        ),
    )


def lock_profile(profile: BrandProfile) -> BrandProfile:
    """Explicit re-lock after owner edits (scaffold)."""
    return profile.model_copy(update={"locked": True})
