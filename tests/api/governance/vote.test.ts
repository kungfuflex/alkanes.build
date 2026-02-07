import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// Mock alkanes-client module - must be before imports
vi.mock("@/lib/alkanes-client", () => ({
  alkanesClient: {
    getDieselBalanceAtBlock: vi.fn().mockResolvedValue(BigInt('1000000')), // Default: has DIESEL
  },
}));

// Mock prisma module - must be before imports
vi.mock("@/lib/prisma", () => {
  return {
    prisma: {
      proposal: {
        findUnique: vi.fn(),
        update: vi.fn(),
      },
      vote: {
        findUnique: vi.fn(),
        create: vi.fn(),
      },
    },
    default: {
      proposal: { findUnique: vi.fn(), update: vi.fn() },
      vote: { findUnique: vi.fn(), create: vi.fn() },
    },
  };
});

import { POST } from "@/app/api/governance/vote/route";
import { prisma } from "@/lib/prisma";
import { alkanesClient } from "@/lib/alkanes-client";

// Type assertions for mocks
const mockProposal = prisma.proposal as any;
const mockVote = prisma.vote as any;
const mockAlkanesClient = alkanesClient as any;

const mockActiveProposal = {
  id: "prop-1",
  title: "Test Proposal",
  choices: ["For", "Against", "Abstain"],
  author: "bc1qauthor",
  state: "ACTIVE",
  snapshot: 900000,
  start: new Date(Date.now() - 86400000), // Started yesterday
  end: new Date(Date.now() + 86400000), // Ends tomorrow
  scores: ["100", "50", "25"],
  totalVotes: "175", // String to avoid BigInt serialization
};

const mockPendingProposal = {
  ...mockActiveProposal,
  id: "prop-pending",
  state: "PENDING",
  start: new Date(Date.now() + 86400000), // Starts tomorrow
};

const mockClosedProposal = {
  ...mockActiveProposal,
  id: "prop-closed",
  state: "CLOSED",
  end: new Date(Date.now() - 86400000), // Ended yesterday
};

const mockProposalWithEmptyScores = {
  ...mockActiveProposal,
  id: "prop-empty-scores",
  scores: [], // Empty scores array - first vote will use || "0" fallback
  totalVotes: "0",
};

describe("POST /api/governance/vote", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("casts a valid vote with server-verified voting power", async () => {
    mockAlkanesClient.getDieselBalanceAtBlock.mockResolvedValue(BigInt('1000000'));
    mockProposal.findUnique.mockResolvedValue(mockActiveProposal);
    mockVote.findUnique.mockResolvedValue(null);
    mockVote.create.mockResolvedValue({
      id: "vote-1",
      proposalId: "prop-1",
      voter: "bc1qvoter",
      voterSig: "sig",
      choice: 0,
      votingPower: BigInt('1000000'),
    });
    mockProposal.update.mockResolvedValue({
      ...mockActiveProposal,
      scores: ["1000100", "50", "25"],
      totalVotes: "1000175",
    });

    const request = new NextRequest("http://localhost/api/governance/vote", {
      method: "POST",
      body: JSON.stringify({
        proposalId: "prop-1",
        voter: "bc1qvoter",
        voterSig: "signature123",
        choice: 0,
        reason: "I support this proposal",
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(201);
    expect(data.vote).toBeDefined();
    expect(mockAlkanesClient.getDieselBalanceAtBlock).toHaveBeenCalledWith("bc1qvoter", 900000);
    expect(mockProposal.update).toHaveBeenCalled();
  });

  it("handles first vote on a choice (empty scores)", async () => {
    mockAlkanesClient.getDieselBalanceAtBlock.mockResolvedValue(BigInt('1000000'));
    mockProposal.findUnique.mockResolvedValue(mockProposalWithEmptyScores);
    mockVote.findUnique.mockResolvedValue(null);
    mockVote.create.mockResolvedValue({
      id: "vote-1",
      proposalId: "prop-empty-scores",
      voter: "bc1qvoter",
      voterSig: "sig",
      choice: 0,
      votingPower: BigInt('1000000'),
    });
    mockProposal.update.mockResolvedValue({
      ...mockProposalWithEmptyScores,
      scores: ["1000000"],
      totalVotes: "1000000",
    });

    const request = new NextRequest("http://localhost/api/governance/vote", {
      method: "POST",
      body: JSON.stringify({
        proposalId: "prop-empty-scores",
        voter: "bc1qvoter",
        voterSig: "signature123",
        choice: 0,
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(201);
    expect(data.vote).toBeDefined();
    // Verify scores started from "0" (the fallback)
    expect(mockProposal.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          scores: ["1000000"], // 0 + 1000000
        }),
      })
    );
  });

  it("returns 400 for missing required fields", async () => {
    const request = new NextRequest("http://localhost/api/governance/vote", {
      method: "POST",
      body: JSON.stringify({
        proposalId: "prop-1",
        // Missing voter, voterSig, choice
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe("Missing required fields");
  });

  it("returns 404 for non-existent proposal", async () => {
    mockProposal.findUnique.mockResolvedValue(null);

    const request = new NextRequest("http://localhost/api/governance/vote", {
      method: "POST",
      body: JSON.stringify({
        proposalId: "non-existent",
        voter: "bc1qvoter",
        voterSig: "sig",
        choice: 0,
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.error).toBe("Proposal not found");
  });

  it("returns 400 when voting hasn't started (PENDING state)", async () => {
    mockProposal.findUnique.mockResolvedValue(mockPendingProposal);

    const request = new NextRequest("http://localhost/api/governance/vote", {
      method: "POST",
      body: JSON.stringify({
        proposalId: "prop-pending",
        voter: "bc1qvoter",
        voterSig: "sig",
        choice: 0,
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe("Voting has not started yet");
  });

  it("returns 400 when voting has ended", async () => {
    mockProposal.findUnique.mockResolvedValue(mockClosedProposal);

    const request = new NextRequest("http://localhost/api/governance/vote", {
      method: "POST",
      body: JSON.stringify({
        proposalId: "prop-closed",
        voter: "bc1qvoter",
        voterSig: "sig",
        choice: 0,
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe("Voting has ended");
  });

  it("returns 400 for invalid choice index", async () => {
    mockProposal.findUnique.mockResolvedValue(mockActiveProposal);

    const request = new NextRequest("http://localhost/api/governance/vote", {
      method: "POST",
      body: JSON.stringify({
        proposalId: "prop-1",
        voter: "bc1qvoter",
        voterSig: "sig",
        choice: 10, // Invalid - only 3 choices exist
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe("Invalid choice");
  });

  it("returns 400 for negative choice index", async () => {
    mockProposal.findUnique.mockResolvedValue(mockActiveProposal);

    const request = new NextRequest("http://localhost/api/governance/vote", {
      method: "POST",
      body: JSON.stringify({
        proposalId: "prop-1",
        voter: "bc1qvoter",
        voterSig: "sig",
        choice: -1,
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe("Invalid choice");
  });

  it("returns 403 when voter has no DIESEL at snapshot block", async () => {
    mockAlkanesClient.getDieselBalanceAtBlock.mockResolvedValue(BigInt(0));
    mockProposal.findUnique.mockResolvedValue(mockActiveProposal);

    const request = new NextRequest("http://localhost/api/governance/vote", {
      method: "POST",
      body: JSON.stringify({
        proposalId: "prop-1",
        voter: "bc1qnocoins",
        voterSig: "sig",
        choice: 0,
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(403);
    expect(data.error).toBe("No DIESEL balance at snapshot block");
    expect(mockAlkanesClient.getDieselBalanceAtBlock).toHaveBeenCalledWith("bc1qnocoins", 900000);
  });

  it("returns 400 when voter already voted", async () => {
    mockAlkanesClient.getDieselBalanceAtBlock.mockResolvedValue(BigInt('1000000'));
    mockProposal.findUnique.mockResolvedValue(mockActiveProposal);
    mockVote.findUnique.mockResolvedValue({
      id: "existing-vote",
      proposalId: "prop-1",
      voter: "bc1qvoter",
      choice: 1,
    });

    const request = new NextRequest("http://localhost/api/governance/vote", {
      method: "POST",
      body: JSON.stringify({
        proposalId: "prop-1",
        voter: "bc1qvoter",
        voterSig: "sig",
        choice: 0,
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe("You have already voted on this proposal");
  });

  it("handles database errors", async () => {
    mockProposal.findUnique.mockRejectedValue(new Error("DB error"));

    const request = new NextRequest("http://localhost/api/governance/vote", {
      method: "POST",
      body: JSON.stringify({
        proposalId: "prop-1",
        voter: "bc1qvoter",
        voterSig: "sig",
        choice: 0,
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe("Failed to cast vote");
  });

  it("correctly updates proposal scores with server-verified power", async () => {
    mockAlkanesClient.getDieselBalanceAtBlock.mockResolvedValue(BigInt('500000'));
    // Use fresh mock data for this test to avoid state from previous tests
    const freshProposal = {
      id: "prop-score-test",
      title: "Score Test Proposal",
      choices: ["For", "Against", "Abstain"],
      author: "bc1qauthor",
      state: "ACTIVE",
      snapshot: 900000,
      start: new Date(Date.now() - 86400000),
      end: new Date(Date.now() + 86400000),
      scores: ["100", "50", "25"],
      totalVotes: "175",
    };

    mockProposal.findUnique.mockResolvedValue(freshProposal);
    mockVote.findUnique.mockResolvedValue(null);
    mockVote.create.mockResolvedValue({ id: "vote-1" });
    mockProposal.update.mockResolvedValue({});

    const request = new NextRequest("http://localhost/api/governance/vote", {
      method: "POST",
      body: JSON.stringify({
        proposalId: "prop-score-test",
        voter: "bc1qvoter",
        voterSig: "sig",
        choice: 1, // Vote for "Against"
      }),
    });

    await POST(request);

    expect(mockProposal.update).toHaveBeenCalledWith({
      where: { id: "prop-score-test" },
      data: expect.objectContaining({
        scores: ["100", "500050", "25"], // "50" + "500000" = "500050"
      }),
    });
  });
});
