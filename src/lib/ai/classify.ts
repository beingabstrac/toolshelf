import { generateObject } from "ai";
import { z } from "zod";
import { withGeminiRotate } from "@/lib/ai/google";
import { TOOL_CATEGORIES, type Source } from "@/lib/db/schema";
import { stripShowHnPrefix } from "@/lib/utils";

const classificationSchema = z.object({
  is_tool: z.boolean(),
  name: z.string().nullable(),
  url: z.string().nullable(),
  one_line_summary: z.string().nullable(),
  categories: z.array(z.enum(TOOL_CATEGORIES)).max(3),
  pricing: z.enum(["free", "paid", "freemium", "unknown"]),
  confidence: z.number().min(0).max(1),
  reason: z.string(),
});

export type Classification = z.infer<typeof classificationSchema>;

const SYSTEM = `You classify product launches for Toolshelf, a directory of product-building tools.

A TOOL is a product people use to build, ship, design, or operate software/products:
developer tools, design tools, product tools, infra, AI coding tools, no-code builders, analytics, security tooling, collaboration products, SDKs, CLIs, platforms.

NOT a tool: essays, news, research papers, politics, company drama, tutorials without a product, personal blogs, one-off art/toys with no reusable product, job posts, consumer gadgets, physical products, games, lifestyle apps, fashion, food, unless they are clearly builder/product tools.

If it is a tool, extract a clean product name (no "Show HN:" prefix), the best product website URL (not a discussion thread), a one-line summary (max 140 chars), 1-3 categories from the allowed list, pricing guess, and confidence 0-1.`;

export async function classifyLaunch(input: {
  source: Source;
  title: string;
  url: string | null;
  tagline?: string | null;
  isShowHn?: boolean;
  points: number;
  numComments: number;
  topics?: string[];
}): Promise<Classification> {
  const sourceLabel =
    input.source === "producthunt"
      ? "Product Hunt"
      : input.source === "lobsters"
        ? "Lobsters"
        : input.source === "uneed"
          ? "Uneed"
          : input.source === "devhunt"
            ? "DevHunt"
            : input.source === "reddit"
              ? "Reddit"
              : "Hacker News";

  return withGeminiRotate(async (model) => {
    const { object } = await generateObject({
      model,
      schema: classificationSchema,
      system: SYSTEM,
      prompt: `Classify this ${sourceLabel} launch:

Title: ${input.title}
Tagline: ${input.tagline ?? "(none)"}
URL: ${input.url ?? "(no url)"}
Show HN: ${input.isShowHn ?? false}
Topics: ${input.topics?.length ? input.topics.join(", ") : "(none)"}
Votes/points: ${input.points}
Comments: ${input.numComments}

Clean title hint: ${stripShowHnPrefix(input.title)}`,
    });
    return object;
  });
}

/** @deprecated use classifyLaunch */
export function classifyHnPost(input: {
  title: string;
  url: string | null;
  isShowHn: boolean;
  points: number;
  numComments: number;
}): Promise<Classification> {
  return classifyLaunch({ source: "hackernews", ...input });
}

export function meetsAcceptThreshold(
  c: Classification,
  source: Source = "hackernews",
): boolean {
  // Curated launch boards get a slightly lower bar; still require URL+name.
  const min =
    source === "producthunt" || source === "uneed" || source === "devhunt"
      ? 0.55
      : 0.62;
  return c.is_tool && c.confidence >= min && Boolean(c.name) && Boolean(c.url);
}
