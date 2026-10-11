/**
 * Creative role definitions, asset format eligibility, and task scoping helpers.
 */

import type { PodTask } from "./ops-api";

export type DeliverableFormat = "reel" | "story" | "shoot_day" | "static_post" | "carousel";

/** Formats handled by video editors. */
export const VIDEO_FORMATS: readonly string[] = ["reel", "story", "shoot_day"];

/** Formats handled by graphic designers. */
export const GRAPHIC_FORMATS: readonly string[] = ["static_post", "carousel"];

export function isEditorRole(role?: string | null): boolean {
  if (!role) return false;
  const normalized = role.toLowerCase().trim();
  return normalized === "editor" || normalized === "video_editor";
}

export function isDesignerRole(role?: string | null): boolean {
  if (!role) return false;
  const normalized = role.toLowerCase().trim();
  return normalized === "designer" || normalized === "graphic_designer";
}

export function isCreativeRole(role?: string | null): boolean {
  return isEditorRole(role) || isDesignerRole(role) || role?.toLowerCase().trim() === "team_member";
}

/**
 * Returns the list of deliverable format types eligible for a given creative role.
 * If the role is non-creative or non-specialized (e.g. admin, lead, general team member),
 * returns null (meaning unrestricted / all formats).
 */
export function getEligibleDeliverableTypes(role?: string | null): readonly string[] | null {
  if (isEditorRole(role)) {
    return VIDEO_FORMATS;
  }
  if (isDesignerRole(role)) {
    return GRAPHIC_FORMATS;
  }
  return null;
}

/**
 * Checks whether a given deliverable format is eligible for the specified role.
 */
export function isDeliverableTypeEligibleForRole(
  deliverableType?: string | null,
  role?: string | null,
): boolean {
  const eligible = getEligibleDeliverableTypes(role);
  if (!eligible) return true;
  if (!deliverableType) return false;
  return eligible.includes(deliverableType.toLowerCase().trim());
}

/**
 * Robustly checks if a task is assigned to a specific user by comparing ID, assignee.id,
 * assignee.email, or assignee_name.
 */
export function isTaskAssignedToUser(
  task?: {
    assigned_to?: string | null;
    assignee?: { id?: string | null; email?: string | null } | null;
    assignee_name?: string | null;
  } | null,
  user?: {
    id?: string | null;
    email?: string | null;
    full_name?: string | null;
  } | null,
): boolean {
  if (!task || !user) return false;
  if (task.assigned_to && user.id && task.assigned_to === user.id) return true;
  if (task.assignee?.id && user.id && task.assignee.id === user.id) return true;
  if (
    task.assignee?.email &&
    user.email &&
    task.assignee.email.toLowerCase() === user.email.toLowerCase()
  ) {
    return true;
  }
  if (
    task.assignee_name &&
    user.full_name &&
    task.assignee_name.toLowerCase() === user.full_name.toLowerCase()
  ) {
    return true;
  }
  return false;
}

/**
 * Board scoping rule:
 * - If user is not a creative (lead, admin): show all tasks.
 * - If task is assigned to this user: always show.
 * - If task is unassigned: show only if deliverable format matches the creative's role.
 * - If task is assigned to another user: do not include in this creative's personal backlog.
 */
export function shouldShowTaskForUser(
  task: PodTask,
  user?: {
    id?: string | null;
    role?: string | null;
    email?: string | null;
    full_name?: string | null;
  } | null,
): boolean {
  if (!user) return false;
  if (!isCreativeRole(user.role)) return true;

  if (isTaskAssignedToUser(task, user)) return true;

  const isUnassigned = !task.assigned_to && !task.assignee?.id;
  if (isUnassigned) {
    return isDeliverableTypeEligibleForRole(task.deliverable_type, user.role);
  }

  return false;
}
