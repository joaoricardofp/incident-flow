// @vitest-environment jsdom
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const push = vi.fn();
const refresh = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push, refresh }),
  usePathname: () => "/acme",
}));

vi.mock("@/modules/workspace/actions", () => ({
  renameWorkspace: vi.fn(),
}));

import { renameWorkspace } from "@/modules/workspace/actions";
import { RenameWorkspaceDialog } from "@/modules/workspace/components/rename-workspace-dialog";

const mockedRenameWorkspace = vi.mocked(renameWorkspace);

describe("RenameWorkspaceDialog", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  function openDialog() {
    render(
      <RenameWorkspaceDialog
        workspaceId="workspace-1"
        workspaceSlug="acme"
        currentName="Acme"
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: /rename workspace/i }));
    return screen.findByRole("dialog");
  }

  it("opens a dialog prefilled with the current workspace name", async () => {
    await openDialog();

    expect(screen.getByLabelText(/workspace name/i)).toHaveProperty(
      "value",
      "Acme",
    );
    expect(screen.getByRole("button", { name: /save changes/i })).toBeTruthy();
    expect(screen.getByRole("button", { name: /^cancel$/i })).toBeTruthy();
  });

  it("closes without persisting when cancel is clicked", async () => {
    await openDialog();

    fireEvent.click(screen.getByRole("button", { name: /^cancel$/i }));

    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    expect(mockedRenameWorkspace).not.toHaveBeenCalled();
  });

  it("calls renameWorkspace, closes and navigates to the new slug", async () => {
    mockedRenameWorkspace.mockResolvedValue({
      success: true,
      name: "New name",
      slug: "new-name-12345678",
    });
    await openDialog();

    const input = screen.getByLabelText(/workspace name/i);
    fireEvent.change(input, { target: { value: "New name" } });
    fireEvent.click(screen.getByRole("button", { name: /save changes/i }));

    await waitFor(() =>
      expect(mockedRenameWorkspace).toHaveBeenCalledWith({
        workspaceId: "workspace-1",
        name: "New name",
      }),
    );
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    await waitFor(() =>
      expect(push).toHaveBeenCalledWith("/new-name-12345678"),
    );
    expect(refresh).toHaveBeenCalled();
  });

  it("keeps the dialog open and shows an error on failure", async () => {
    mockedRenameWorkspace.mockResolvedValue({
      success: false,
      error: "Workspace name is invalid",
    });
    await openDialog();

    fireEvent.click(screen.getByRole("button", { name: /save changes/i }));

    await waitFor(() => expect(mockedRenameWorkspace).toHaveBeenCalledTimes(1));
    expect(screen.getByRole("dialog")).toBeTruthy();
  });
});
