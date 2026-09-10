/**
 * API types for Creo platform.
 * In production / future phases, this file is generated from /openapi.json.
 */

export interface HealthResponse {
  status: "ok" | "degraded";
  db: string;
  redis: string;
  version: string;
  details?: Record<string, string>;
}

export interface ApiErrorResponse {
  error: {
    code: string;
    message: string;
    details: Record<string, unknown>;
  };
}

// ── Onboarding ──────────────────────────────────────────────────────────────

export interface AssignedTeamMember {
  id: string;
  name: string;
  role: string;
  avatar?: string;
  email?: string;
}

export interface OnboardingStatus {
  stage: number; // 0-5, derived from v_client_onboarding
  stage_name: string;
  checklist: {
    email_verified: boolean;
    terms_accepted: boolean;
    subscription_active: boolean;
    questionnaire_submitted: boolean;
    onboarding_completed: boolean;
  };
  deadline: string | null;
  company_name: string | null;
  instagram_username: string | null;
  assigned_team?: AssignedTeamMember[];
}

export interface Plan {
  id: string;
  name: string;
  display_name: string;
  price_minor: number;
  currency: string;
  monthly_price: string;
  poster_quota: number;
  reel_quota: number;
  story_quota: number;
  revision_rounds: number;
  has_dedicated_manager: boolean;
  highlights: string[];
  is_recommended: boolean;
}

export interface CreateOrderResponse {
  order_id: string;
  amount: number;
  currency: string;
  gateway: "razorpay" | "stripe";
  checkout_payload: Record<string, unknown>;
  amount_minor?: number;
  key_id?: string;
}

export interface BrandDNA {
  company_name?: string;
  tone: string;
  target_audience: string;
  palette: string[];
  recommended_formats: string[];
  /** Backend field name from BrandDNASummary */
  ai_summary_line: string;
  /** Convenience alias populated from brand_summary in the status response */
  summary?: string;
  audience_persona?: string;
  goal_alignment?: string;
  content_themes?: string[];
}

export interface BrandDNAStatus {
  status: "pending" | "completed" | "failed";
  brand_dna: BrandDNA | null;
}

export interface QuestionnairePayload {
  company_name: string;
  industry?: string;
  official_logo_assets?: string;
  website_url?: string;
  business_description?: string;
  instagram_username: string;
  primary_goal?: string;
  target_audience: string;
  audience_age_range?: string;
  audience_gender?: string;
  audience_location?: string;
  audience_problems_solved?: string;
  tone_keywords: string[];
  color_palette: string[];
  content_goals: string[];
  style_references?: string[];
  competitors?: string[];
  content_focus?: string[];
  topics_to_avoid?: string;
  notes?: string;
}

export interface OnboardingCompleteResponse {
  status: string;
  onboarding_completed_at: string;
  assigned_team: AssignedTeamMember[];
}


// ── Deliverables (Phase 4) ──────────────────────────────────────────────────

export type DeliverableStatusType =
  | "draft"
  | "in_production"
  | "pending_qa"
  | "qa_rejected"
  | "pending_approval"
  | "revision_requested"
  | "approved"
  | "scheduled"
  | "publishing"
  | "published"
  | "publish_failed"
  | "archived";

export interface DeliverableItem {
  id: string;
  root_id: string;
  version: number;
  status: DeliverableStatusType;
  file_url: string;
  file_type: string;
  revision_round: number;
  rejection_comment: string | null;
  approved_at: string | null;
  scheduled_at: string | null;
  created_at: string | null;
}

export interface PortalDeliverablesResponse {
  items: DeliverableItem[];
  has_more: boolean;
  waiting_on_you: number;
  limit: number;
}

// ── Announcements & Broadcasts ──────────────────────────────────────────────

export interface Announcement {
  id: string;
  title: string;
  content: string;
  type: "system" | "broadcast" | "maintenance" | string;
  target_departments: string[];
  author?: string;
  created_at: string | null;
}

// ── Support Tickets ─────────────────────────────────────────────────────────

export interface TicketItem {
  id: string;
  title: string;
  description: string;
  status: "open" | "in_progress" | "resolved" | "closed";
  priority: "low" | "medium" | "high" | "urgent";
  created_at: string;
  message_count?: number;
  assigned_to?: string | null;
  assignee_name?: string | null;
  assignee_role?: string | null;
  deliverable_id?: string | null;
  deliverable_title?: string | null;
  deliverable_file_url?: string | null;
  deliverable_file_type?: string | null;
}

// ── Creative Intelligence & Blueprints ──────────────────────────────────────

export interface BlueprintHook {
  angle: "curiosity_gap" | "pain_point" | "contrarian" | "story" | "demo";
  text: string;
  rationale: string;
}

export interface BlueprintBeat {
  timestamp_range: string;
  shot_type: string;
  visual_cue: string;
  script_line: string;
}

export interface AudioDirection {
  genre_mood: string;
  bpm_range: string;
  vocal_rules: string;
}

export interface CreativeBlueprint {
  hooks: BlueprintHook[];
  premise: string;
  beats: BlueprintBeat[];
  audio_direction: AudioDirection;
  on_screen_text: string[];
  cta: string;
  funnel_stage: "reach" | "authority" | "conversion";
  respects: string[];
}

export interface CalendarEntryItem {
  id: string;
  deliverable_id: string | null;
  type: string;
  format_label: string;
  topic: string;
  title: string;
  date: string;
  scheduled_at: string;
  scheduled_time: string;
  status: string;
  calendar_status: "draft" | "approved";
  is_locked: boolean;
  slot_kind: string | null;
  slot_strategy: "anchor" | "flex" | "swapped";
  flex_deadline: string | null;
  concept_status: "concept_pending" | "concept_revision" | "concept_approved" | "approved";
  blueprint: CreativeBlueprint | null;
  selected_hook: BlueprintHook | null;
  thumbnail_url?: string | null;
  file_url?: string | null;
  caption: string;
}

