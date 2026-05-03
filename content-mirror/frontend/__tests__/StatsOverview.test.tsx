import { render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { vi, describe, it, expect, beforeEach } from "vitest";
import { StatsOverview } from "@/components/dashboard/StatsOverview";

// Mock the API module so no real HTTP calls are made
vi.mock("@/lib/api", () => ({
  api: {
    get: vi.fn(),
  },
}));

import { api } from "@/lib/api";

function wrapper({ children }: { children: React.ReactNode }) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
}

function makeUser(overrides = {}) {
  return {
    id: "1",
    name: "Test User",
    email: "test@example.com",
    plan: "free",
    analyses_used: 3,
    analyses_today: 3,
    daily_limit: 5,
    created_at: "2025-01-15T00:00:00Z",
    ...overrides,
  };
}

describe("StatsOverview", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("shows dashes while loading", () => {
    (api.get as ReturnType<typeof vi.fn>).mockReturnValue(new Promise(() => {}));
    render(<StatsOverview />, { wrapper });
    expect(screen.getAllByText("—").length).toBeGreaterThan(0);
  });

  it("displays usage count and limit when data loads", async () => {
    (api.get as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: makeUser({ analyses_today: 3, daily_limit: 5 }),
    });

    render(<StatsOverview />, { wrapper });

    expect(await screen.findByText("3")).toBeInTheDocument();
    expect(screen.getByText(/of 5 today/i)).toBeInTheDocument();
  });

  it("shows plan as capitalized text", async () => {
    (api.get as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: makeUser({ plan: "free" }),
    });

    render(<StatsOverview />, { wrapper });
    expect(await screen.findByText("free")).toBeInTheDocument();
  });

  it("shows Upgrade link for free plan users", async () => {
    (api.get as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: makeUser({ plan: "free" }),
    });

    render(<StatsOverview />, { wrapper });
    expect(await screen.findByText(/upgrade to pro/i)).toBeInTheDocument();
  });

  it("does not show Upgrade link for pro plan users", async () => {
    (api.get as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: makeUser({ plan: "pro", analyses_today: 10, daily_limit: 100 }),
    });

    render(<StatsOverview />, { wrapper });
    await screen.findByText("pro");
    expect(screen.queryByText(/upgrade to pro/i)).not.toBeInTheDocument();
  });

  it("shows formatted member-since date", async () => {
    (api.get as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: makeUser({ created_at: "2025-01-15T00:00:00Z" }),
    });

    render(<StatsOverview />, { wrapper });
    expect(await screen.findByText(/january 2025/i)).toBeInTheDocument();
  });
});
