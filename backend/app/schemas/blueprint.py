"""Pydantic schemas for Creative Intelligence Blueprints."""

from typing import Literal
from pydantic import BaseModel, ConfigDict, Field


class Hook(BaseModel):
    model_config = ConfigDict(extra="forbid")

    angle: Literal["curiosity_gap", "pain_point", "contrarian", "story", "demo"]
    text: str = Field(max_length=140)
    rationale: str = Field(max_length=200)


class Beat(BaseModel):
    model_config = ConfigDict(extra="forbid")

    timestamp_range: str = Field(max_length=20)  # e.g. "0:00-0:03"
    shot_type: Literal[
        "talking_head",
        "screen_demo",
        "b_roll",
        "text_overlay",
        "motion_graphic",
        "product_shot",
    ]
    visual_cue: str = Field(max_length=280)
    script_line: str = Field(max_length=280)


class AudioDirection(BaseModel):
    model_config = ConfigDict(extra="forbid")

    genre_mood: str = Field(max_length=100)  # e.g. "Warm lo-fi, thoughtful and crisp"
    bpm_range: str = Field(max_length=30)  # e.g. "85-95 BPM"
    vocal_rules: str = Field(max_length=200)  # e.g. "No vocals in first 3s to prioritize speech"


class Blueprint(BaseModel):
    model_config = ConfigDict(extra="forbid")

    hooks: list[Hook] = Field(min_length=3, max_length=3)  # Exactly 3 (A/B/C)
    premise: str = Field(max_length=280)
    beats: list[Beat] = Field(min_length=3, max_length=6)  # Shot-by-shot beats
    audio_direction: AudioDirection
    on_screen_text: list[str] = Field(max_length=8)
    cta: str = Field(max_length=120)
    funnel_stage: Literal["reach", "authority", "conversion"]
    respects: list[str] = Field(min_length=1)  # Echoes at least 1 brand do_not rule
