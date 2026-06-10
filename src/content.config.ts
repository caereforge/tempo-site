import { defineCollection, z } from "astro:content";
import { glob } from "astro/loaders";

const blog = defineCollection({
  loader: glob({ pattern: "**/*.md", base: "./src/content/blog" }),
  schema: z.object({
    title: z.string(),
    description: z.string().optional(),
    pubDate: z.coerce.date(),
    updatedDate: z.coerce.date().optional(),
    tags: z.array(z.string()).optional(),
    draft: z.boolean().default(false),
  }),
});

const scores = defineCollection({
  loader: glob({ pattern: "**/*.md", base: "./src/content/scores" }),
  schema: z.object({
    title: z.string(),
    description: z.string(),
    providerIdentifier: z.string(),
    color: z.string(),
    version: z.string(),
    file: z.string().optional(),
    compatibility: z.array(z.string()).optional(),
    pubDate: z.coerce.date(),
    updatedDate: z.coerce.date().optional(),
    // Flip to true once Tempo v1 ships; until then the page renders the
    // download button disabled with a "coming with v1" notice, so visitors
    // don't grab an orphan .tempo-score with no app to install it into.
    downloadable: z.boolean().default(false),
    // Built-in sources (UniFi, Kopia, Uptime Kuma, etc.) ship with Tempo
    // and have no .tempo-score to download. The page renders a "built-in"
    // notice in place of the download button.
    builtIn: z.boolean().default(false),
    draft: z.boolean().default(false),
  }),
});

const userguide = defineCollection({
  loader: glob({ pattern: "**/*.md", base: "./src/content/userguide" }),
  schema: z.object({
    title: z.string(),
    description: z.string(),
    chapter: z.number(),
    order: z.number(),
    draft: z.boolean().default(false),
    pubDate: z.coerce.date(),
    updatedDate: z.coerce.date().optional(),
  }),
});

const tips = defineCollection({
  loader: glob({ pattern: "**/*.md", base: "./src/content/tips" }),
  schema: z.object({
    title: z.string(),
    description: z.string(),
    // Sort order within the tips list (lower = earlier).
    order: z.number(),
    // Grouping label shown in the index (e.g. "Sources", "Presentation").
    category: z.string().optional(),
    pubDate: z.coerce.date(),
    updatedDate: z.coerce.date().optional(),
    draft: z.boolean().default(false),
  }),
});

export const collections = { blog, scores, userguide, tips };
