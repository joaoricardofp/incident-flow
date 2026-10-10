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

vi.mock("@/modules/workspace/actions", () => ({
  createWorkspace: vi.fn(),
}));

import { SidebarProvider } from "@/components/ui/sidebar";
import { WorkspaceSwitcher } from "@/components/workspace-switcher";
import { createWorkspace } from "@/modules/workspace/actions";

const mockedCreateWorkspace = vi.mocked(createWorkspace);

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

const workspaces = [
  { id: "workspace-1", name: "Acme", slug: "acme" },
  { id: "workspace-2", name: "Globex", slug: "globex" },
];

describe("WorkspaceSwitcher creation option", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    stubMatchMedia(false);
  });

  afterEach(() => {
    cleanup();
  });

  async function openMenu() {
    render(
      <SidebarProvider>
        <WorkspaceSwitcher workspace={workspaces[0]} workspaces={workspaces} />
      </SidebarProvider>,
    );
    fireEvent.click(screen.getByRole("button", { name: /acme/i }));
    await screen.findByText("Create workspace");
  }

  it("shows a visible creation option next to the workspace list", async () => {
    await openMenu();

    expect(screen.getAllByText("Acme").length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText("Globex")).toBeTruthy();
    expect(screen.getByText("Create workspace")).toBeTruthy();
  });

  it("reuses createWorkspace and navigates to the new workspace", async () => {
    mockedCreateWorkspace.mockResolvedValue({
      success: true,
      slug: "new-slug",
    });
    await openMenu();

    fireEvent.click(screen.getByText("Create workspace"));

    await waitFor(() => expect(mockedCreateWorkspace).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(push).toHaveBeenCalledWith("/new-slug"));
  });

  it("keeps working on mobile viewports without breaking the menu", async () => {
    stubMatchMedia(true);
    mockedCreateWorkspace.mockResolvedValue({
      success: true,
      slug: "new-slug",
    });

    render(
      <SidebarProvider>
        <WorkspaceSwitcher workspace={workspaces[0]} workspaces={workspaces} />
      </SidebarProvider>,
    );
    fireEvent.click(screen.getByRole("button", { name: /acme/i }));
    await screen.findByText("Create workspace");

    fireEvent.click(screen.getByText("Create workspace"));

    await waitFor(() => expect(mockedCreateWorkspace).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(push).toHaveBeenCalledWith("/new-slug"));
  });
});
