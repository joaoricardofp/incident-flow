// @vitest-environment jsdom
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const push = vi.fn();
const refresh = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push, refresh }),
  usePathname: () => "/acme",
}));

vi.mock("@/modules/workspace/actions", () => ({
  leaveWorkspace: vi.fn(),
  removeMember: vi.fn(),
  renameWorkspace: vi.fn(),
  rotateInviteToken: vi.fn(),
  updateMemberRole: vi.fn(),
}));

import { SidebarProvider } from "@/components/ui/sidebar";
import {
  leaveWorkspace,
  renameWorkspace,
  updateMemberRole,
} from "@/modules/workspace/actions";
import { WorkspaceSettingsDialog } from "@/modules/workspace/components/workspace-settings-dialog";

const mockedLeaveWorkspace = vi.mocked(leaveWorkspace);
const mockedRenameWorkspace = vi.mocked(renameWorkspace);
const mockedUpdateMemberRole = vi.mocked(updateMemberRole);

function stubMatchMedia(matches: boolean) {
  Object.defineProperty(window, "matchMedia", {
    writable: true,
    value: vi.fn().mockImplementation(() => ({
      matches,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    })),
  });
}

const members = [
  {
    id: "membership-admin",
    role: "ADMIN" as const,
    user: { id: "user-admin", name: "Ada Admin", email: "ada@example.com" },
  },
  {
    id: "membership-viewer",
    role: "VIEWER" as const,
    user: { id: "user-viewer", name: "Vic Viewer", email: "vic@example.com" },
  },
];

describe("WorkspaceSettingsDialog", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    stubMatchMedia(false);
  });

  afterEach(() => {
    cleanup();
  });

  function openDialog(
    currentRole: "ADMIN" | "VIEWER",
    workspaceInviteToken?: string,
  ) {
    render(
      <SidebarProvider>
        <WorkspaceSettingsDialog
          workspaceId="workspace-1"
          workspaceSlug="acme"
          workspaceName="Acme"
          workspaceInviteToken={workspaceInviteToken}
          members={members}
          currentUserId="user-admin"
          currentRole={currentRole}
        />
      </SidebarProvider>,
    );
    fireEvent.click(screen.getByRole("button", { name: /^settings$/i }));
    return screen.findByRole("dialog");
  }

  function stubClipboard(writeText: () => Promise<void>) {
    Object.defineProperty(window.navigator, "clipboard", {
      configurable: true,
      value: { writeText: vi.fn(writeText) },
    });
    return vi.mocked(window.navigator.clipboard.writeText);
  }

  async function openInviteTab(workspaceInviteToken?: string) {
    await openDialog("ADMIN", workspaceInviteToken);
    fireEvent.click(screen.getByRole("tab", { name: "Invite" }));
    await screen.findByRole("button", { name: /rotate invite link/i });
  }

  function getGeneralPanel() {
    return screen.getByRole("tabpanel");
  }

  async function openMembersTab(currentRole: "ADMIN" | "VIEWER") {
    await openDialog(currentRole);
    fireEvent.click(screen.getByRole("tab", { name: "Members" }));
    await screen.findByText("vic@example.com");
  }

  it("shows the three tabs with the correct content for ADMIN", async () => {
    await openDialog("ADMIN");

    expect(screen.getByRole("tab", { name: "General" })).toBeTruthy();
    expect(screen.getByRole("tab", { name: "Members" })).toBeTruthy();
    expect(screen.getByRole("tab", { name: "Invite" })).toBeTruthy();
    // General tab is active by default.
    expect(screen.getByText("Acme")).toBeTruthy();
    expect(within(getGeneralPanel()).getByRole("button")).toBeTruthy();
  });

  it("hides the invite tab from VIEWER", async () => {
    await openDialog("VIEWER");

    expect(screen.getByRole("tab", { name: "General" })).toBeTruthy();
    expect(screen.getByRole("tab", { name: "Members" })).toBeTruthy();
    expect(screen.queryByRole("tab", { name: "Invite" })).toBeNull();
    expect(within(getGeneralPanel()).queryByRole("button")).toBeNull();
    expect(
      screen.queryByRole("button", { name: /rotate invite link/i }),
    ).toBeNull();
  });

  it("keeps the dialog open while switching tabs", async () => {
    await openDialog("ADMIN");

    fireEvent.click(screen.getByRole("tab", { name: "Members" }));
    await screen.findByText("vic@example.com");
    expect(screen.getByRole("dialog")).toBeTruthy();

    fireEvent.click(screen.getByRole("tab", { name: "Invite" }));
    await screen.findByRole("button", { name: /rotate invite link/i });
    expect(screen.getByRole("dialog")).toBeTruthy();

    fireEvent.click(screen.getByRole("tab", { name: "General" }));
    await screen.findByText("Acme");
    expect(screen.getByRole("dialog")).toBeTruthy();
  });

  it("supports keyboard navigation between tabs", async () => {
    await openDialog("ADMIN");

    const generalTab = screen.getByRole("tab", { name: "General" });
    generalTab.focus();
    fireEvent.keyDown(generalTab, { key: "ArrowRight" });

    await waitFor(() =>
      expect(screen.getByRole("tab", { name: "Members" })).toHaveProperty(
        "tabIndex",
        0,
      ),
    );
  });

  it("renames from the General tab and navigates to the new slug", async () => {
    mockedRenameWorkspace.mockResolvedValue({
      success: true,
      name: "New name",
      slug: "new-name-12345678",
    });
    await openDialog("ADMIN");

    fireEvent.click(within(getGeneralPanel()).getByRole("button"));
    const input = screen.getByLabelText(/workspace name/i);
    fireEvent.change(input, { target: { value: "New name" } });
    fireEvent.click(screen.getByRole("button", { name: /save changes/i }));

    await waitFor(() =>
      expect(mockedRenameWorkspace).toHaveBeenCalledWith({
        workspaceId: "workspace-1",
        name: "New name",
      }),
    );
    await waitFor(() =>
      expect(push).toHaveBeenCalledWith("/new-name-12345678"),
    );
  });

  it("shows promote and remove actions in the member menu for ADMIN", async () => {
    await openMembersTab("ADMIN");

    fireEvent.click(
      screen.getByRole("button", { name: /actions to vic viewer/i }),
    );
    const menu = await screen.findByRole("menu");
    const items = within(menu).getAllByRole("menuitem");

    expect(items.map((item) => item.textContent)).toEqual([
      "Promote to administrator",
      "Remove from workspace",
    ]);
  });

  it("shows only leave in the own member menu", async () => {
    await openMembersTab("ADMIN");

    fireEvent.click(
      screen.getByRole("button", { name: /actions to ada admin/i }),
    );
    // Own row: only leave is available.
    const ownMenu = await screen.findByRole("menu");
    expect(
      within(ownMenu).getByRole("menuitem", { name: "Leave the workspace" }),
    ).toBeTruthy();
  });

  it("confirms privilege changes before calling the action", async () => {
    mockedUpdateMemberRole.mockResolvedValue({ success: true });
    await openMembersTab("ADMIN");

    fireEvent.click(
      screen.getByRole("button", { name: /actions to vic viewer/i }),
    );
    const menu = await screen.findByRole("menu");
    fireEvent.click(
      within(menu).getByRole("menuitem", { name: "Promote to administrator" }),
    );

    const confirmDialog = await screen.findByRole("dialog", {
      name: /promote to administrator\?/i,
    });
    expect(confirmDialog).toBeTruthy();
    fireEvent.click(
      within(confirmDialog).getByRole("button", { name: /^confirm$/i }),
    );

    await waitFor(() =>
      expect(mockedUpdateMemberRole).toHaveBeenCalledWith({
        workspaceId: "workspace-1",
        membershipId: "membership-viewer",
        role: "ADMIN",
      }),
    );
  });

  it("hides member menus from VIEWER except their own leave action", async () => {
    await openMembersTab("VIEWER");

    expect(
      screen.queryByRole("button", { name: /actions to vic viewer/i }),
    ).toBeNull();
    // Own row (Ada is the current user here) only offers leaving.
    fireEvent.click(
      screen.getByRole("button", { name: /actions to ada admin/i }),
    );
    const menu = await screen.findByRole("menu");
    const items = within(menu).getAllByRole("menuitem");
    expect(items.map((item) => item.textContent)).toEqual([
      "Leave the workspace",
    ]);
  });

  it("leaves through the existing action and navigates to /dashboard", async () => {
    mockedLeaveWorkspace.mockResolvedValue({ success: true });
    await openMembersTab("VIEWER");

    fireEvent.click(
      screen.getByRole("button", { name: /actions to ada admin/i }),
    );
    const menu = await screen.findByRole("menu");
    fireEvent.click(
      within(menu).getByRole("menuitem", { name: "Leave the workspace" }),
    );

    const confirmDialog = await screen.findByRole("dialog", {
      name: /leave workspace\?/i,
    });
    expect(confirmDialog).toBeTruthy();

    const leaveButtons = within(confirmDialog).getAllByRole("button", {
      name: /^leave$/i,
    });
    fireEvent.click(leaveButtons[leaveButtons.length - 1]);

    await waitFor(() =>
      expect(mockedLeaveWorkspace).toHaveBeenCalledWith({
        workspaceId: "workspace-1",
      }),
    );
    await waitFor(() => expect(push).toHaveBeenCalledWith("/dashboard"));
  });

  function expectedInviteUrl(token: string) {
    const base =
      process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ||
      window.location.origin;
    return `${base}/invite/${token}`;
  }

  it("shows the current invite link and copies it to the clipboard", async () => {
    const writeText = stubClipboard(async () => {});
    await openInviteTab("token-123");

    const input = screen.getByDisplayValue(expectedInviteUrl("token-123"));
    expect(input).toBeTruthy();

    const copyButton = input.parentElement?.querySelector("button");
    expect(copyButton).toBeTruthy();
    fireEvent.click(copyButton as HTMLButtonElement);

    await waitFor(() =>
      expect(writeText).toHaveBeenCalledWith(expectedInviteUrl("token-123")),
    );
  });

  it("handles clipboard failures without closing the dialog", async () => {
    stubClipboard(async () => {
      throw new Error("denied");
    });
    await openInviteTab("token-123");

    const input = screen.getByDisplayValue(expectedInviteUrl("token-123"));
    const copyButton = input.parentElement?.querySelector("button");
    fireEvent.click(copyButton as HTMLButtonElement);

    await waitFor(() => expect(screen.getByRole("dialog")).toBeTruthy());
  });

  it("hides the copy field when no invite token is available", async () => {
    await openInviteTab(undefined);

    expect(screen.queryByDisplayValue(/\/invite\//)).toBeNull();
  });
});
