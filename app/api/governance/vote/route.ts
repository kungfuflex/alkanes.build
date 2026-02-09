import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { alkanesClient } from "@/lib/alkanes-client";
import { serializeBigInt } from "@/lib/serialize";
import { verifyMessageSignature } from "@/lib/bip322";

/**
 * POST /api/governance/vote
 * Cast a vote on a proposal
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { proposalId, voter, voterSig, voterPubkey, choice, reason } = body;

    // Validate required fields
    if (
      !proposalId ||
      !voter ||
      !voterSig ||
      choice === undefined
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

    // BIP-322 signature verification
    const { timestamp } = body;
    const messageToVerify = JSON.stringify({
      proposalId,
      choice,
      timestamp: timestamp || Date.now(),
    });

    const network = process.env.NEXT_PUBLIC_NETWORK as 'mainnet' | 'testnet' | 'regtest' || 'mainnet';

    console.log('[Vote] Verifying signature:', {
      voter,
      messageToVerify,
      sigLength: voterSig?.length,
      pubkeyLength: voterPubkey?.length,
      network
    });

    const isValidSignature = await verifyMessageSignature(
      messageToVerify,
      voter,
      voterSig,
      network,
      voterPubkey
    );

    console.log('[Vote] Signature verification result:', isValidSignature);

    if (!isValidSignature) {
      console.warn('[Vote] Signature verification failed');
      return NextResponse.json(
        { error: "Invalid signature" },
        { status: 401 }
      );
    }

    // Verify voting power by querying DIESEL balance at snapshot block
    const serverVotingPower = await alkanesClient.getDieselBalanceAtBlock(voter, proposal.snapshot);
    if (serverVotingPower <= BigInt(0)) {
      return NextResponse.json(
        { error: "No DIESEL balance at snapshot block" },
        { status: 403 }
      );
    }

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

    // Create vote with server-verified voting power
    const vote = await prisma.vote.create({
      data: {
        proposalId,
        voter,
        voterSig,
        choice,
        votingPower: serverVotingPower,
        reason,
      },
    });

    // Update proposal scores using server-verified voting power
    const scores = proposal.scores as string[];
    scores[choice] = (
      BigInt(scores[choice] || "0") + serverVotingPower
    ).toString();

    const totalVotes = BigInt(proposal.totalVotes) + serverVotingPower;

    await prisma.proposal.update({
      where: { id: proposalId },
      data: {
        scores,
        totalVotes,
      },
    });

    return NextResponse.json({
      vote: serializeBigInt(vote),
      _debug: {
        signatureVerified: isValidSignature,
        message: messageToVerify,
        sigBytes: Buffer.from(voterSig, 'base64').length
      }
    }, { status: 201 });
  } catch (error) {
    console.error("Error casting vote:", error);
    return NextResponse.json(
      { error: "Failed to cast vote" },
      { status: 500 }
    );
  }
}
