import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/**
 * POST /api/governance/vote
 * Cast a vote on a proposal
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { proposalId, voter, voterSig, choice, votingPower, reason } = body;

    // Validate required fields
    if (
      !proposalId ||
      !voter ||
      !voterSig ||
      choice === undefined ||
      !votingPower
    ) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Get proposal
    const proposal = await prisma.proposal.findUnique({
      where: { id: proposalId },
    });

    if (!proposal) {
      return NextResponse.json(
        { error: "Proposal not found" },
        { status: 404 }
      );
    }

    // Check proposal state
    const now = new Date();
    if (proposal.state === "PENDING" || now < proposal.start) {
      return NextResponse.json(
        { error: "Voting has not started yet" },
        { status: 400 }
      );
    }

    if (proposal.state === "CLOSED" || now >= proposal.end) {
      return NextResponse.json(
        { error: "Voting has ended" },
        { status: 400 }
      );
    }

    // Validate choice
    if (choice < 0 || choice >= proposal.choices.length) {
      return NextResponse.json({ error: "Invalid choice" }, { status: 400 });
    }

    // TODO: Verify BIP-322 signature
    // The signature should sign: JSON.stringify({ proposalId, choice, voter })

    // TODO: Verify voting power by querying DIESEL balance at snapshot block
    // For now, trust the provided voting power

    // Check if voter already voted
    const existingVote = await prisma.vote.findUnique({
      where: {
        proposalId_voter: {
          proposalId,
          voter,
        },
      },
    });

    if (existingVote) {
      return NextResponse.json(
        { error: "You have already voted on this proposal" },
        { status: 400 }
      );
    }

    // Create vote
    const vote = await prisma.vote.create({
      data: {
        proposalId,
        voter,
        voterSig,
        choice,
        votingPower: BigInt(votingPower),
        reason,
      },
    });

    // Update proposal scores
    const scores = proposal.scores as string[];
    scores[choice] = (
      BigInt(scores[choice] || "0") + BigInt(votingPower)
    ).toString();

    const totalVotes = BigInt(proposal.totalVotes) + BigInt(votingPower);

    await prisma.proposal.update({
      where: { id: proposalId },
      data: {
        scores,
        totalVotes,
      },
    });

    return NextResponse.json({ vote }, { status: 201 });
  } catch (error) {
    console.error("Error casting vote:", error);
    return NextResponse.json(
      { error: "Failed to cast vote" },
      { status: 500 }
    );
  }
}
