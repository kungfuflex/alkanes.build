import { NextResponse } from 'next/server';
import { cacheGet, cacheSet } from '@/lib/redis';

// Cache key for SDK version
const CACHE_KEY = 'sdk:version:latest';
// Cache for 10 minutes
const CACHE_TTL_SECONDS = 600;

interface GitHubCommit {
  sha: string;
  commit: {
    message: string;
    author: {
      name: string;
      date: string;
    };
  };
}

interface PackageJson {
  version: string;
  name: string;
}

interface SdkVersionData {
  version: string;
  shortHash: string;
  fullHash: string;
  versionWithHash: string;
  packageUrl: string;
  commitMessage: string;
  commitDate: string;
  branch: string;
  repository: string;
  cachedAt: string;
}

/**
 * Fetch package.json from the ts-sdk directory in alkanes-rs
 */
async function fetchPackageJson(): Promise<PackageJson> {
  const response = await fetch(
    'https://raw.githubusercontent.com/kungfuflex/alkanes-rs/develop/ts-sdk/package.json',
    {
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'alkanes.build',
        ...(process.env.GITHUB_TOKEN && {
          'Authorization': `Bearer ${process.env.GITHUB_TOKEN}`,
        }),
      },
    }
  );

  if (!response.ok) {
    throw new Error(`Failed to fetch package.json: ${response.status}`);
  }

  return response.json();
}

/**
 * Fetch latest commit from the develop branch
 */
async function fetchLatestCommit(): Promise<GitHubCommit> {
  const response = await fetch(
    'https://api.github.com/repos/kungfuflex/alkanes-rs/commits/develop',
    {
      headers: {
        'Accept': 'application/vnd.github.v3+json',
        'User-Agent': 'alkanes.build',
        ...(process.env.GITHUB_TOKEN && {
          'Authorization': `Bearer ${process.env.GITHUB_TOKEN}`,
        }),
      },
    }
  );

  if (!response.ok) {
    throw new Error(`GitHub API returned ${response.status}: ${response.statusText}`);
  }

  return response.json();
}

/**
 * GET /api/sdk-version
 * Returns the latest @alkanes/ts-sdk version info from the develop branch
 * Version format: {semver}-{shortHash} (e.g., 0.1.1-0bcdeabc)
 *
 * Caches result in Redis for 10 minutes
 */
export async function GET() {
  try {
    // Check Redis cache first
    const cached = await cacheGet<SdkVersionData>(CACHE_KEY);
    if (cached) {
      return NextResponse.json({
        success: true,
        data: cached,
        cached: true,
      });
    }

    // Fetch package.json and latest commit in parallel
    const [packageJson, commit] = await Promise.all([
      fetchPackageJson(),
      fetchLatestCommit(),
    ]);

    // Get short commit hash (7 characters)
    const shortHash = commit.sha.substring(0, 7);

    // Build version string: {semver}-{shortHash}
    const versionWithHash = `${packageJson.version}-${shortHash}`;

    // Build the package URL
    const packageUrl = `https://pkg.alkanes.build/dist/@alkanes/ts-sdk?v=${versionWithHash}`;

    const versionData: SdkVersionData = {
      version: packageJson.version,
      shortHash,
      fullHash: commit.sha,
      versionWithHash,
      packageUrl,
      commitMessage: commit.commit.message.split('\n')[0], // First line only
      commitDate: commit.commit.author.date,
      branch: 'develop',
      repository: 'kungfuflex/alkanes-rs',
      cachedAt: new Date().toISOString(),
    };

    // Cache in Redis
    await cacheSet(CACHE_KEY, versionData, CACHE_TTL_SECONDS);

    return NextResponse.json({
      success: true,
      data: versionData,
      cached: false,
    });
  } catch (error) {
    console.error('SDK version API error:', error);

    // Return a fallback response with a static version
    // This ensures docs still render even if GitHub API is unavailable
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch SDK version',
        // Provide fallback data so the UI can still function
        fallback: {
          packageUrl: 'https://pkg.alkanes.build/dist/@alkanes/ts-sdk',
          note: 'Using base URL without version pin. Check GitHub for latest version.',
        },
      },
      { status: 500 }
    );
  }
}
