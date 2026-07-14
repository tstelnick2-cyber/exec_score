import { logger } from "./logger.js";

export interface LinkedInRawData {
  headline: string | null;
  name: string | null;
  hasBanner: boolean;
  hasProfilePhoto: boolean;
  hasFeaturedSection: boolean;
  connectionTier: "unknown" | "lt_500" | "500plus" | "5000plus";
  recommendationCount: number;
  postCount: number; // approximation from visible posts
  hasArticles: boolean;
  hasNewsletter: boolean;
  aboutText: string | null;
  scraped: boolean; // false = used fallback/demo
}

const LINKEDIN_URL_REGEX =
  /^https?:\/\/(www\.)?linkedin\.com\/in\/[a-zA-Z0-9\-_%]+\/?(\?.*)?$/;

export function validateLinkedInUrl(url: string): boolean {
  return LINKEDIN_URL_REGEX.test(url.trim());
}

export async function scrapeLinkedInProfile(
  linkedinUrl: string,
): Promise<LinkedInRawData> {
  const normalizedUrl = linkedinUrl.trim().split("?")[0];

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);

    const response = await fetch(normalizedUrl, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        Accept:
          "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.5",
        "Cache-Control": "no-cache",
        Pragma: "no-cache",
      },
      signal: controller.signal,
    });

    clearTimeout(timeout);

    if (!response.ok) {
      logger.info(
        { status: response.status, url: normalizedUrl },
        "LinkedIn returned non-200, using analysis mode",
      );
      return buildAnalysisModeData(normalizedUrl);
    }

    const html = await response.text();

    // LinkedIn often returns a gate page — detect it
    const isGated =
      html.includes("authwall") ||
      html.includes("login") ||
      html.includes("sign-in") ||
      html.includes("join-linkedin") ||
      html.length < 5000;

    if (isGated) {
      logger.info(
        { url: normalizedUrl },
        "LinkedIn gated response, using analysis mode",
      );
      return buildAnalysisModeData(normalizedUrl);
    }

    return parseLinkedInHtml(html, normalizedUrl);
  } catch (err) {
    logger.warn({ err, url: normalizedUrl }, "Scrape failed, using analysis mode");
    return buildAnalysisModeData(normalizedUrl);
  }
}

function parseLinkedInHtml(html: string, url: string): LinkedInRawData {
  // Extract from JSON-LD if present
  const jsonLdMatch = html.match(
    /<script type="application\/ld\+json">([\s\S]*?)<\/script>/i,
  );

  let name: string | null = null;
  let headline: string | null = null;

  if (jsonLdMatch) {
    try {
      const jsonLd = JSON.parse(jsonLdMatch[1]);
      name = jsonLd.name || null;
      headline = jsonLd.description || null;
    } catch {
      // ignore parse errors
    }
  }

  // Meta tags fallback
  if (!headline) {
    const descMatch = html.match(/<meta[^>]+name="description"[^>]+content="([^"]+)"/i);
    if (descMatch) headline = descMatch[1];
  }

  if (!name) {
    const titleMatch = html.match(/<title>([^<]+)<\/title>/i);
    if (titleMatch) {
      name = titleMatch[1].replace(/ \| LinkedIn$/, "").replace(/ - LinkedIn$/, "");
    }
  }

  const hasBanner =
    html.includes("profile-background-image") ||
    html.includes("background-image") ||
    html.includes("cover-image");

  const hasProfilePhoto =
    html.includes("profile-photo") ||
    html.includes("pv-top-card__photo") ||
    html.includes("evi-image");

  const hasFeaturedSection =
    html.includes("featured") ||
    html.includes("pv-featured-section") ||
    html.includes("featured-section");

  const hasNewsletter =
    html.includes("newsletter") || html.includes("Newsletter");

  const hasArticles =
    html.includes("article") || html.includes("pulse-article");

  const connectionTier: LinkedInRawData["connectionTier"] = html.includes(
    "5,000",
  )
    ? "5000plus"
    : html.includes("500+") || html.includes("500 connections")
      ? "500plus"
      : "lt_500";

  // Approximate recommendation count from HTML mentions
  const recMatches = html.match(/recommendation/gi);
  const recommendationCount = recMatches ? Math.min(recMatches.length, 10) : 0;

  const postCount = html.includes("activity") ? 5 : 2;

  const aboutMatch = html.match(/about[^>]*>([\s\S]{0,500})<\/section/i);
  const aboutText = aboutMatch ? aboutMatch[1].replace(/<[^>]+>/g, "").trim().slice(0, 300) : null;

  return {
    headline,
    name,
    hasBanner,
    hasProfilePhoto,
    hasFeaturedSection,
    connectionTier,
    recommendationCount,
    postCount,
    hasArticles,
    hasNewsletter,
    aboutText,
    scraped: true,
  };
}

/**
 * When LinkedIn blocks us, we do a URL-based heuristic analysis.
 * We use the URL slug length and structure as a weak signal.
 * In production, this is replaced with Bright Data / proxied scraping.
 */
function buildAnalysisModeData(url: string): LinkedInRawData {
  const slug = url.split("/in/")[1]?.replace(/\/$/, "") || "";
  const slugLen = slug.length;

  // Deterministic pseudo-random based on slug characters
  const seed = slug
    .split("")
    .reduce((acc, c) => acc + c.charCodeAt(0), 0);
  const rand = (min: number, max: number) => {
    const x = Math.sin(seed * 9301 + 49297) * 233280;
    const r = x - Math.floor(x);
    return Math.floor(min + r * (max - min + 1));
  };

  // Short slugs (vanity URLs) tend to be senior/established profiles
  const isSenior = slugLen <= 12;

  return {
    headline: null,
    name: null,
    hasBanner: isSenior || rand(0, 1) === 1,
    hasProfilePhoto: true,
    hasFeaturedSection: isSenior || rand(0, 2) > 0,
    connectionTier: isSenior ? "500plus" : rand(0, 1) === 1 ? "500plus" : "lt_500",
    recommendationCount: isSenior ? rand(5, 15) : rand(0, 8),
    postCount: rand(1, 12),
    hasArticles: isSenior || rand(0, 2) > 1,
    hasNewsletter: isSenior && rand(0, 1) === 1,
    aboutText: null,
    scraped: false,
  };
}
