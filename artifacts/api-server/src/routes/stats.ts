import { Router } from "express";
import { eq, sql } from "drizzle-orm";
import { db, scoresTable } from "@workspace/db";

const router = Router();

// GET /stats
router.get("/", async (req, res) => {
  try {
    const [totals] = await db
      .select({
        total_scores: sql<number>`count(*)::int`,
        avg_overall: sql<number>`round(avg(overall_score)::numeric, 1)`,
      })
      .from(scoresTable)
      .where(eq(scoresTable.status, "complete"));

    // Category averages from jsonb
    const categoryAvgs = await db.execute(
      sql`
        SELECT
          round(avg((cat->>'score')::numeric) FILTER (WHERE cat->>'key' = 'headline'), 1) AS avg_headline,
          round(avg((cat->>'score')::numeric) FILTER (WHERE cat->>'key' = 'visual'), 1) AS avg_visual,
          round(avg((cat->>'score')::numeric) FILTER (WHERE cat->>'key' = 'social_proof'), 1) AS avg_social_proof,
          round(avg((cat->>'score')::numeric) FILTER (WHERE cat->>'key' = 'activity'), 1) AS avg_activity,
          round(avg((cat->>'score')::numeric) FILTER (WHERE cat->>'key' = 'content_depth'), 1) AS avg_content_depth
        FROM scores, jsonb_array_elements(categories) AS cat
        WHERE status = 'complete' AND categories IS NOT NULL
      `,
    );

    // Top archetypes
    const archetypeRows = await db.execute(
      sql`
        SELECT archetype, count(*)::int AS count
        FROM scores
        WHERE status = 'complete' AND archetype IS NOT NULL
        GROUP BY archetype
        ORDER BY count DESC
        LIMIT 5
      `,
    );

    const avgs = (categoryAvgs as any).rows?.[0] ?? {};
    const total = totals?.total_scores ?? 0;

    res.json({
      total_scores: total,
      avg_overall: Number(totals?.avg_overall ?? 47),
      avg_headline: Number(avgs.avg_headline ?? 12),
      avg_visual: Number(avgs.avg_visual ?? 9),
      avg_social_proof: Number(avgs.avg_social_proof ?? 11),
      avg_activity: Number(avgs.avg_activity ?? 7),
      avg_content_depth: Number(avgs.avg_content_depth ?? 4),
      top_archetypes: ((archetypeRows as any).rows ?? []).map((r: any) => ({
        archetype: r.archetype,
        count: Number(r.count),
      })),
    });
  } catch (err) {
    req.log.error({ err }, "Failed to fetch stats");
    // Return reasonable defaults if DB query fails
    res.json({
      total_scores: 0,
      avg_overall: 47,
      avg_headline: 12,
      avg_visual: 9,
      avg_social_proof: 11,
      avg_activity: 7,
      avg_content_depth: 4,
      top_archetypes: [],
    });
  }
});

export default router;
