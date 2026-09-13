"""Brand DNA and Questionnaire domain schemas."""

from __future__ import annotations

from typing import Any, Literal
from pydantic import BaseModel, ConfigDict, Field


# ==============================================================================
# §6.3: BRAND DNA SCHEMA
# ==============================================================================

class ToneProfile(BaseModel):
    model_config = ConfigDict(extra="forbid")
    humour: int = Field(ge=0, le=10)
    formality: int = Field(ge=0, le=10)
    respectfulness: int = Field(ge=0, le=10)
    energy: int = Field(ge=0, le=10)
    voice_words: list[str] = Field(min_length=2, max_length=4)
    anti_voice_words: list[str] = Field(min_length=1, max_length=4)
    writing_rules: list[str] = Field(min_length=3, max_length=6)


class ContentPillar(BaseModel):
    model_config = ConfigDict(extra="forbid")
    name: str = Field(max_length=60)
    rationale: str = Field(max_length=200)
    answers_objection: str | None = Field(None, max_length=140)   # traces to B4
    example_angles: list[str] = Field(min_length=3, max_length=5)
    best_formats: list[Literal["reel", "poster", "carousel", "story"]]
    funnel_stage: Literal["reach", "authority", "conversion"]


class ProductionProfile(BaseModel):
    model_config = ConfigDict(extra="forbid")
    can_shoot_people: bool
    founder_on_camera: bool
    default_reel_style: Literal[
        "talking_head", "product_demo", "ugc_style", "voiceover_broll",
        "motion_graphics", "testimonial"
    ]
    feasible_formats: list[str]
    infeasible_formats: list[str]     # derived from E1/E2/E3/E7. HARD constraint.


class AudienceSegment(BaseModel):
    model_config = ConfigDict(extra="forbid")
    name: str = Field(max_length=60)
    description: str = Field(max_length=200)
    core_pain_point: str = Field(max_length=200)


class VisualDirection(BaseModel):
    model_config = ConfigDict(extra="forbid")
    styles: list[str] = Field(min_length=1, max_length=3)
    primary_colors: list[str] = Field(default_factory=list)
    visual_avoid: list[str] = Field(default_factory=list)


class LanguageRules(BaseModel):
    model_config = ConfigDict(extra="forbid")
    primary_languages: list[str] = Field(min_length=1)
    caption_script: Literal["english_only", "native_script", "roman_transliteration", "mixed"]
    on_screen_text_script: str


class BrandDNA(BaseModel):
    model_config = ConfigDict(extra="forbid")
    summary_line: str = Field(max_length=160)      # the portal one-liner
    positioning: str = Field(max_length=280)
    audience_segments: list[AudienceSegment] = Field(min_length=1, max_length=3)
    tone: ToneProfile
    content_pillars: list[ContentPillar] = Field(min_length=3, max_length=5)
    visual_direction: VisualDirection
    language_rules: LanguageRules
    production: ProductionProfile
    cta_bank: list[str] = Field(min_length=3, max_length=6)
    do_not: list[str] = Field(min_length=3)        # C6 + C7 + D7 + E7 + E10, VERBATIM
    confidence_notes: list[str] = Field(default_factory=list, max_length=5)


# ==============================================================================
# SECTION QUESTIONNAIRE SCHEMAS
# ==============================================================================

class SaveSectionRequest(BaseModel):
    section: Literal["a", "b", "c", "d", "e", "f", "g"]
    data: dict[str, Any]


class QuestionnaireStateResponse(BaseModel):
    client_id: str
    section_a: dict[str, Any]
    section_b: dict[str, Any]
    section_c: dict[str, Any]
    section_d: dict[str, Any]
    section_e: dict[str, Any]
    section_f: dict[str, Any]
    section_g: dict[str, Any]
    core_completed: bool
    extended_completed: bool
    version: int


class BrandDNAStatusResponse(BaseModel):
    status: Literal["generating", "ready", "template", "pending"]
    brand_dna: BrandDNA | None = None
    brand_dna_source: str = "template"
    brand_dna_version: int = 1
    summary_line: str | None = None


class UpdateBrandDNARequest(BaseModel):
    brand_dna: dict[str, Any]
