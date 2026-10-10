import { describe, expect, it } from "vitest";
import {
  getSidebarDefaultOpen,
  SIDEBAR_COOKIE_NAME,
} from "@/lib/sidebar-state";

describe("sidebar state persistence", () => {
  it("uses the documented cookie name shared with the sidebar provider", () => {
    expect(SIDEBAR_COOKIE_NAME).toBe("sidebar_state");
  });

  it("defaults to open when no cookie is present (first visit)", () => {
    expect(getSidebarDefaultOpen(undefined)).toBe(true);
  });

  it("restores the collapsed state across refreshes and navigation", () => {
    expect(getSidebarDefaultOpen("false")).toBe(false);
  });

  it("restores the expanded state across refreshes and navigation", () => {
    expect(getSidebarDefaultOpen("true")).toBe(true);
  });

  it("ignores unexpected cookie values instead of collapsing", () => {
    expect(getSidebarDefaultOpen("")).toBe(true);
    expect(getSidebarDefaultOpen("0")).toBe(true);
  });
});
