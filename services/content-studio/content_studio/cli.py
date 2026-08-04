"""Minimal CLI for smoke-checking the scaffold."""

from __future__ import annotations

import argparse
import json
from datetime import date

from .engine import generate_month, resolve_profile_from_footage
from .models import GenerateMonthOptions, RawAsset


def main() -> None:
    parser = argparse.ArgumentParser(description="FARO Content Studio scaffold CLI")
    parser.add_argument("--brand-name", default="Untitled")
    parser.add_argument("--year", type=int, default=date.today().year)
    parser.add_argument("--month", type=int, default=date.today().month)
    args = parser.parse_args()

    assets = [
        RawAsset(
            id="demo-1",
            filename="clip.mp4",
            mime_type="video/mp4",
            kind="video",
        )
    ]
    profile = resolve_profile_from_footage(assets, brand_name=args.brand_name)
    calendar = generate_month(
        profile,
        assets,
        GenerateMonthOptions(year=args.year, month=args.month, posts_per_week=3),
        profile_id="demo-profile",
    )
    print(json.dumps(calendar.model_dump(), indent=2)[:2000])
    print(f"\n… {len(calendar.posts)} posts (scaffold placeholders)")


if __name__ == "__main__":
    main()
