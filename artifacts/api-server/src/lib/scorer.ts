import type { LinkedInRawData } from "./scraper.js";

export interface ScoredCategory {
  name: string;
  key: string;
  score: number;
  max_score: number;
  label: "elite" | "strong" | "developing" | "weak";
  fixes: string[];
}

export interface ScoreOutput {
  overall_score: number;
  percentile: number;
  archetype: string;
  archetype_description: string;
  categories: ScoredCategory[];
}

/**
 * Headline Quality (0–25)
 * Measures specificity, authority markers, metric usage, and absence of weak phrases.
 */
function scoreHeadline(data: LinkedInRawData): ScoredCategory {
  const headlineRaw = data.headline ?? "";
  const headline = headlineRaw.toLowerCase();
  let score = 8; // baseline if no headline available
  const fixes: string[] = [];

  if (!data.headline) {
    score = 0;
    fixes.push(
      "Add a compelling headline — it's the first thing people read",
      "Include your title, industry, and one specific outcome you drive",
      "Avoid generic phrases like 'Experienced Professional'",
    );
    return { name: "Headline Quality", key: "headline", score, max_score: 25, label: "weak", fixes };
  }

  // Length check (ideal: 60–120 chars)
  if (data.headline.length >= 60 && data.headline.length <= 180) score += 4;
  else if (data.headline.length >= 30) score += 2;
  else fixes.push("Expand your headline — use all 220 characters LinkedIn allows");

  // Authority markers
  const authorityMarkers = [
    "ceo", "cto", "cfo", "coo", "vp", "vice president", "director",
    "head of", "founder", "co-founder", "partner", "managing",
    "principal", "executive", "president", "chief",
  ];
  if (authorityMarkers.some((m) => headline.includes(m))) score += 4;
  else fixes.push("Add a clear authority marker (title, seniority level, or domain expertise)");

  // Metric/specificity signals
  const metricPatterns = [
    /\d+[mk%+]?/, /\$[\d,.]+/, /\d+\+?\s*(years?|yrs?)/i,
    /grew|scaled|built|launched|led|managed|drove|generated/i,
  ];
  if (metricPatterns.some((p) => p.test(headlineRaw))) score += 5;
  else fixes.push("Add a specific metric or outcome (e.g., 'scaled to $50M ARR' or 'led 120-person org')");

  // Specificity / industry signals
  const industries = [
    "fintech", "saas", "b2b", "enterprise", "healthcare", "ai", "ml",
    "product", "growth", "revenue", "strategy", "operations", "vc",
    "private equity", "consulting", "investment",
  ];
  if (industries.some((i) => headline.includes(i))) score += 3;
  else fixes.push("Name your specific industry or domain — generic headlines get lost");

  // Weak phrase penalties
  const weakPhrases = [
    "seeking opportunities",
    "open to work",
    "job seeker",
    "looking for",
    "unemployed",
    "between roles",
    "available for",
    "experienced professional",
    "seasoned",
    "results-driven",
    "passionate about",
    "dynamic",
    "synergy",
  ];
  const weakFound = weakPhrases.filter((p) => headline.includes(p));
  score -= weakFound.length * 2;
  if (weakFound.includes("seeking opportunities") || weakFound.includes("open to work"))
    fixes.push("Remove 'open to work' signals from headline — signal authority, not availability");
  if (weakFound.some((p) => ["results-driven", "passionate about", "dynamic", "synergy"].includes(p)))
    fixes.push("Remove clichéd phrases ('results-driven', 'passionate') — replace with specifics");

  score = Math.max(0, Math.min(25, score));
  return buildCategory("Headline Quality", "headline", score, 25, fixes);
}

/**
 * Visual Authority (0–20)
 * Banner image, profile photo quality signals, featured section.
 */
function scoreVisualAuthority(data: LinkedInRawData): ScoredCategory {
  let score = 0;
  const fixes: string[] = [];

  // Profile photo
  if (data.hasProfilePhoto) score += 5;
  else {
    fixes.push("Add a professional headshot — profiles with photos get 21x more views");
  }

  // Banner image
  if (data.hasBanner) score += 8;
  else {
    score += 0;
    fixes.push(
      "Add a custom banner image — 95% of executives at Director+ level have one",
      "Use your banner to reinforce your brand: company logo, speaking photo, or tagline",
    );
  }

  // Featured section
  if (data.hasFeaturedSection) score += 7;
  else {
    fixes.push(
      "Add a Featured section — pin a case study, media mention, or key article",
      "Executives with Featured sections receive 3x more profile views from decision-makers",
    );
  }

  score = Math.max(0, Math.min(20, score));
  return buildCategory("Visual Authority", "visual", score, 20, fixes);
}

/**
 * Social Proof (0–25)
 * Connections, recommendations, endorsements.
 */
function scoreSocialProof(data: LinkedInRawData): ScoredCategory {
  let score = 0;
  const fixes: string[] = [];

  // Connection tier
  if (data.connectionTier === "5000plus") score += 10;
  else if (data.connectionTier === "500plus") score += 7;
  else {
    score += 2;
    fixes.push(
      "Grow to 500+ connections — the threshold signals credibility to visitors",
      "Connect with peers in your industry weekly (10–15 targeted invites)",
    );
  }

  // Recommendations
  if (data.recommendationCount >= 10) score += 10;
  else if (data.recommendationCount >= 5) score += 7;
  else if (data.recommendationCount >= 2) score += 4;
  else {
    score += 0;
    fixes.push(
      "Request recommendations from 3 senior colleagues or clients this week",
      "A profile with 5+ recommendations is 7x more likely to appear in recruiter searches",
    );
  }

  if (data.recommendationCount > 0 && data.recommendationCount < 5) {
    fixes.push("Aim for 10+ recommendations — especially from people at your level or above");
  }

  // About section as social proof signal
  if (data.aboutText && data.aboutText.length > 150) score += 5;
  else {
    fixes.push(
      "Write an About section that reads like an executive bio, not a job description",
      "Include: who you serve, your specific impact, and one compelling proof point",
    );
  }

  score = Math.max(0, Math.min(25, score));
  return buildCategory("Social Proof", "social_proof", score, 25, fixes);
}

/**
 * Activity Score (0–20)
 * Post frequency, consistency, engagement signals.
 */
function scoreActivity(data: LinkedInRawData): ScoredCategory {
  let score = 0;
  const fixes: string[] = [];

  if (data.postCount >= 12) {
    score = 18;
  } else if (data.postCount >= 8) {
    score = 14;
  } else if (data.postCount >= 4) {
    score = 9;
    fixes.push(
      "Post 3–4x per week — consistency matters more than virality",
    );
  } else if (data.postCount >= 1) {
    score = 4;
    fixes.push(
      "You're barely visible — executives who post weekly receive 5x the profile views",
      "Start with one post per week sharing a lesson from your work",
    );
  } else {
    score = 0;
    fixes.push(
      "No recent activity detected — LinkedIn's algorithm penalizes dormant profiles",
      "Commit to 2 posts per week for 30 days to rebuild algorithmic visibility",
      "Engage on 5 posts daily (comments > likes) to amplify your reach without creating content",
    );
  }

  score = Math.max(0, Math.min(20, score));
  return buildCategory("Activity", "activity", score, 20, fixes);
}

/**
 * Content Depth (0–10)
 * Articles, newsletter, media mentions in About.
 */
function scoreContentDepth(data: LinkedInRawData): ScoredCategory {
  let score = 0;
  const fixes: string[] = [];

  if (data.hasArticles) score += 5;
  else fixes.push("Publish at least one LinkedIn article — long-form content signals domain authority");

  if (data.hasNewsletter) score += 4;
  else fixes.push("Launch a LinkedIn Newsletter — even a monthly cadence builds a subscriber base that compounds over time");

  // About section depth
  if (data.aboutText && data.aboutText.length > 100) score += 1;

  score = Math.max(0, Math.min(10, score));
  return buildCategory("Content Depth", "content_depth", score, 10, fixes);
}

function buildCategory(
  name: string,
  key: string,
  score: number,
  max: number,
  fixes: string[],
): ScoredCategory {
  const pct = score / max;
  const label: ScoredCategory["label"] =
    pct >= 0.85 ? "elite" : pct >= 0.65 ? "strong" : pct >= 0.4 ? "developing" : "weak";

  // Cap fixes to top 3
  return { name, key, score, max_score: max, label, fixes: fixes.slice(0, 3) };
}

const ARCHETYPES: Array<{
  name: string;
  description: string;
  minHeadline: number;
  minVisual: number;
  minSocial: number;
  minActivity: number;
}> = [
  {
    name: "The Thought Leader",
    description:
      "You've built a consistent, visible body of work. Decision-makers seek your perspective — your profile signals ideas, not just credentials.",
    minHeadline: 18,
    minVisual: 14,
    minSocial: 15,
    minActivity: 14,
  },
  {
    name: "The Deal Maker",
    description:
      "Your profile telegraphs results and relationships. You close rooms, not just conversations. Senior buyers recognize you as someone who moves capital and decisions.",
    minHeadline: 17,
    minVisual: 12,
    minSocial: 18,
    minActivity: 10,
  },
  {
    name: "The Operator",
    description:
      "You run things at scale. Your presence signals execution credibility — boards and hiring committees see a leader who ships, not just a leader who talks.",
    minHeadline: 15,
    minVisual: 10,
    minSocial: 14,
    minActivity: 8,
  },
  {
    name: "The Connector",
    description:
      "Your network is your superpower. You're the person people call to get in the right room. Your profile works best when it leads with relationship capital.",
    minHeadline: 12,
    minVisual: 8,
    minSocial: 20,
    minActivity: 6,
  },
  {
    name: "The Rising Executive",
    description:
      "You have the experience — your profile hasn't caught up yet. With targeted improvements to your headline, visual assets, and content cadence, you could leapfrog most of your peers within 90 days.",
    minHeadline: 0,
    minVisual: 0,
    minSocial: 0,
    minActivity: 0,
  },
];

function assignArchetype(categories: ScoredCategory[]): { archetype: string; archetype_description: string } {
  const byKey = Object.fromEntries(categories.map((c) => [c.key, c.score]));

  for (const archetype of ARCHETYPES) {
    if (
      (byKey["headline"] ?? 0) >= archetype.minHeadline &&
      (byKey["visual"] ?? 0) >= archetype.minVisual &&
      (byKey["social_proof"] ?? 0) >= archetype.minSocial &&
      (byKey["activity"] ?? 0) >= archetype.minActivity
    ) {
      return { archetype: archetype.name, archetype_description: archetype.description };
    }
  }

  return {
    archetype: "The Rising Executive",
    archetype_description: ARCHETYPES[ARCHETYPES.length - 1].description,
  };
}

function calculatePercentile(overallScore: number): number {
  // Empirical distribution: most profiles score between 25-65
  // This models a realistic bell curve skewed lower
  if (overallScore >= 90) return 99;
  if (overallScore >= 80) return 95;
  if (overallScore >= 72) return 88;
  if (overallScore >= 65) return 80;
  if (overallScore >= 57) return 70;
  if (overallScore >= 50) return 58;
  if (overallScore >= 42) return 45;
  if (overallScore >= 35) return 32;
  if (overallScore >= 28) return 20;
  if (overallScore >= 20) return 12;
  return 5;
}

export function scoreProfile(data: LinkedInRawData): ScoreOutput {
  const categories = [
    scoreHeadline(data),
    scoreVisualAuthority(data),
    scoreSocialProof(data),
    scoreActivity(data),
    scoreContentDepth(data),
  ];

  const overall_score = categories.reduce((sum, c) => sum + c.score, 0);
  const percentile = calculatePercentile(overall_score);
  const { archetype, archetype_description } = assignArchetype(categories);

  return {
    overall_score,
    percentile,
    archetype,
    archetype_description,
    categories,
  };
}
