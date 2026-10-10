export const SIDEBAR_COOKIE_NAME = "sidebar_state";

export function getSidebarDefaultOpen(
  cookieValue: string | undefined,
): boolean {
  return cookieValue !== "false";
}
