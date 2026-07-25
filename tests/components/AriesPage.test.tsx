import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import AriesPage from "@/app/[locale]/aries/page";

describe("AriesPage", () => {
  it("renders the Aries definitional line", () => {
    render(<AriesPage />);

    expect(
      screen.getByText(
        /Aries is the AI-native front door for building on Alkanes and utilizing SUBFROST as a developer\./
      )
    ).toBeDefined();
  });

  it("shows the MCP endpoint and connect snippets", () => {
    render(<AriesPage />);

    expect(screen.getByText("https://aries.bragi.build/mcp")).toBeDefined();
    expect(
      screen.getByText(/claude mcp add --transport http aries/)
    ).toBeDefined();
    expect(screen.getByText(/"mcpServers"/)).toBeDefined();
  });

  it("links early access to the Telegram group", () => {
    render(<AriesPage />);

    const links = screen
      .getAllByRole("link")
      .filter((a) => a.getAttribute("href") === "https://t.me/+DLc96-DPNJRlZTgx");
    expect(links.length).toBeGreaterThan(0);
  });

  it("mentions read-only design and the Orbitals line", () => {
    render(<AriesPage />);

    expect(
      screen.getByText(/never signs, never broadcasts, and never touches wallets/)
    ).toBeDefined();
    expect(
      screen.getByText(/you can buy the art; you can('|’)t buy the record/)
    ).toBeDefined();
  });
});
