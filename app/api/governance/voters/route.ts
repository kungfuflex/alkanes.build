import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { serializeBigInt } from "@/lib/serialize";

/**
 * GET /api/governance/voters
 * Get list of all voters with aggregated voting power
 */
export async function GET(request: NextRequest) {
  try {
    // Aggregate votes by voter address
    const votes = await prisma.vote.findMany({
      select: {
        voter: true,
        votingPower: true,
        proposalId: true,
      },
    });

    // Group by voter and aggregate
    const voterMap = new Map<
      string,
      { totalVotingPower: bigint; voteCount: number; proposals: Set<string> }
    >();

    for (const vote of votes) {
      const existing = voterMap.get(vote.voter);
      if (existing) {
        existing.totalVotingPower += vote.votingPower;
        existing.voteCount += 1;
        existing.proposals.add(vote.proposalId);
      } else {
        voterMap.set(vote.voter, {
          totalVotingPower: vote.votingPower,
          voteCount: 1,
          proposals: new Set([vote.proposalId]),
        });
      }
    }

    // Convert to array and sort by voting power (descending)
    const voters = Array.from(voterMap.entries())
      .map(([voter, data]) => ({
        voter,
        totalVotingPower: data.totalVotingPower.toString(),
        voteCount: data.voteCount,
        proposalCount: data.proposals.size,
      }))
      .sort((a, b) => {
        const aPower = BigInt(a.totalVotingPower);
        const bPower = BigInt(b.totalVotingPower);
        if (bPower > aPower) return 1;
        if (bPower < aPower) return -1;
        return 0;
      });

    return NextResponse.json({
      voters: serializeBigInt(voters),
      total: voters.length,
    });
  } catch (error) {
    console.error("Error fetching voters:", error);
    // Return empty results instead of 500 so frontend renders gracefully
    return NextResponse.json({ voters: [], total: 0 });
  }
}
