import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { VotingProgressBar } from "@/components/governance/VotingProgressBar";

describe("VotingProgressBar", () => {
  it("renders grey bar when no votes", () => {
    const { container } = render(
      <VotingProgressBar forPercentage={0} hasVotes={false} />
    );

    // Should show dash instead of percentage
    expect(screen.getByText("—")).toBeDefined();

    // Background should be grey (#2a2a2a)
    const bar = container.querySelector(".h-1\\.5");
    expect(bar).toBeDefined();
    expect(bar?.getAttribute("style")).toContain("#2a2a2a");
  });

  it("renders green/red bar when votes exist", () => {
    const { container } = render(
      <VotingProgressBar
        forPercentage={75}
        hasVotes={true}
        forVotes={BigInt("7500000")}
        againstVotes={BigInt("2500000")}
      />
    );

    // Should show percentage
    expect(screen.getByText("75%")).toBeDefined();

    // Should show vote labels
    expect(screen.getByText("7.5 For")).toBeDefined();
    expect(screen.getByText("2.5 Against")).toBeDefined();

    // Green bar should exist with 75% width
    const greenBar = container.querySelector('[style*="width: 75%"]');
    expect(greenBar).toBeDefined();
    expect(greenBar?.getAttribute("style")).toContain("#34d058");
  });

  it("formats large vote amounts with K suffix", () => {
    render(
      <VotingProgressBar
        forPercentage={60}
        hasVotes={true}
        forVotes={BigInt("5000000000")} // 5000 DIESEL (6 decimals in formatCompactDiesel)
        againstVotes={BigInt("3000000000")}
      />
    );

    expect(screen.getByText("5.00K For")).toBeDefined();
    expect(screen.getByText("3.00K Against")).toBeDefined();
  });

  it("formats very large vote amounts with M suffix", () => {
    render(
      <VotingProgressBar
        forPercentage={50}
        hasVotes={true}
        forVotes={BigInt("2000000000000")} // 2M DIESEL
        againstVotes={BigInt("2000000000000")}
      />
    );

    expect(screen.getByText("2.00M For")).toBeDefined();
    expect(screen.getByText("2.00M Against")).toBeDefined();
  });

  it("shows zero votes correctly", () => {
    render(
      <VotingProgressBar
        forPercentage={100}
        hasVotes={true}
        forVotes={BigInt("1000000")}
        againstVotes={BigInt(0)}
      />
    );

    expect(screen.getByText("0 Against")).toBeDefined();
  });

  it("hides label when showLabel is false", () => {
    render(
      <VotingProgressBar
        forPercentage={50}
        hasVotes={true}
        showLabel={false}
      />
    );

    // Should not show percentage label
    expect(screen.queryByText("50%")).toBeNull();
  });

  it("hides vote labels when forVotes/againstVotes not provided", () => {
    render(
      <VotingProgressBar forPercentage={50} hasVotes={true} />
    );

    // Should show percentage but not vote counts
    expect(screen.getByText("50%")).toBeDefined();
    expect(screen.queryByText("For")).toBeNull();
  });

  it("does not render green bar when forPercentage is 0 but hasVotes", () => {
    const { container } = render(
      <VotingProgressBar
        forPercentage={0}
        hasVotes={true}
        forVotes={BigInt(0)}
        againstVotes={BigInt("1000000")}
      />
    );

    // Should show 0%
    expect(screen.getByText("0%")).toBeDefined();

    // Green bar should not exist (forPercentage is 0)
    const greenBar = container.querySelector('[style*="width: 0%"]');
    expect(greenBar).toBeNull();
  });

  it("renders 100% for bar correctly", () => {
    const { container } = render(
      <VotingProgressBar
        forPercentage={100}
        hasVotes={true}
        forVotes={BigInt("5000000")}
        againstVotes={BigInt(0)}
      />
    );

    expect(screen.getByText("100%")).toBeDefined();
    const greenBar = container.querySelector('[style*="width: 100%"]');
    expect(greenBar).toBeDefined();
  });
});
