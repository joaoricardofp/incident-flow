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
}));

vi.mock("@/modules/incident/actions", () => ({
  renameIncident: vi.fn(),
}));

import { renameIncident } from "@/modules/incident/actions";
import { RenameIncidentDialog } from "@/modules/incident/components/rename-incident-dialog";

const mockedRenameIncident = vi.mocked(renameIncident);

describe("RenameIncidentDialog", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  function openDialog() {
    render(
      <RenameIncidentDialog
        incidentId="incident-1"
        workspaceId="workspace-1"
        currentTitle="API outage"
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: /rename incident/i }));
    return screen.findByRole("dialog");
  }

  it("opens a dialog prefilled with the current incident title", async () => {
    await openDialog();

    expect(screen.getByLabelText(/incident title/i)).toHaveProperty(
      "value",
      "API outage",
    );
    expect(screen.getByRole("button", { name: /save changes/i })).toBeTruthy();
    expect(screen.getByRole("button", { name: /^cancel$/i })).toBeTruthy();
  });

  it("closes without persisting when cancel is clicked", async () => {
    await openDialog();

    fireEvent.click(screen.getByRole("button", { name: /^cancel$/i }));

    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    expect(mockedRenameIncident).not.toHaveBeenCalled();
  });

  it("calls renameIncident with workspace scope and closes on success", async () => {
    mockedRenameIncident.mockResolvedValue({
      success: true,
      title: "New title",
    });
    await openDialog();

    const input = screen.getByLabelText(/incident title/i);
    fireEvent.change(input, { target: { value: "New title" } });
    fireEvent.click(screen.getByRole("button", { name: /save changes/i }));

    await waitFor(() =>
      expect(mockedRenameIncident).toHaveBeenCalledWith(
        { incidentId: "incident-1", workspaceId: "workspace-1" },
        expect.objectContaining({ title: "New title" }),
      ),
    );
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    expect(refresh).toHaveBeenCalled();
  });

  it("keeps the dialog open on failure", async () => {
    mockedRenameIncident.mockResolvedValue({
      success: false,
      error: "Incident not found",
    });
    await openDialog();

    fireEvent.click(screen.getByRole("button", { name: /save changes/i }));

    await waitFor(() => expect(mockedRenameIncident).toHaveBeenCalledTimes(1));
    expect(screen.getByRole("dialog")).toBeTruthy();
  });
});
