/**
 * Astro Content Collections — schemas for structured content.
 *
 *   experience  — one Markdown file per role, chronological.
 *   projects    — one Markdown file per project, filterable.
 *   skills      — single YAML file with grouped skill lists.
 *   blog        — MDX collection, empty at launch; route stays hidden
 *                 until first non-draft entry lands.
 */

import { defineCollection } from 'astro:content';
import { file, glob } from 'astro/loaders';
import { z } from 'zod';

const experience = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/experience' }),
  schema: z.object({
    company: z.string().min(1),
    role: z.string().min(1),
    location: z.string().min(1),
    type: z.enum(['Full-time', 'Contract', 'Internship', 'Freelance']),
    startDate: z.coerce.date(),
    endDate: z.coerce.date().nullable().default(null),
    companyUrl: z.url().optional(),
    summary: z.string().max(400),
    stack: z.array(z.string()).default([]),
    highlights: z.array(z.string()).default([]),
    featured: z.boolean().default(true),
    order: z.number().optional(),
  }),
});

const projects = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/projects' }),
  schema: ({ image }) =>
    z.object({
      title: z.string().min(1),
      category: z.enum(['Android Native', 'Flutter']),
      sector: z.enum(['Real Estate', 'Healthcare', 'Education', 'Government', 'Other']),
      description: z.string().max(200),
      longDescription: z.string().optional(),
      cover: image(),
      screenshots: z.array(image()).default([]),
      tech: z.array(z.string()).default([]),
      links: z
        .object({
          github: z.url().optional(),
          playStore: z.url().optional(),
          website: z.url().optional(),
        })
        .default({}),
      status: z.enum(['shipped', 'in-progress', 'archived']).default('shipped'),
      downloads: z.number().nonnegative().optional(),
      featured: z.boolean().default(false),
      publishedAt: z.coerce.date(),
      order: z.number().optional(),
    }),
});

const skills = defineCollection({
  loader: file('./src/content/skills/index.yaml'),
  schema: z.object({
    order: z.number(),
    name: z.string(),
    items: z.array(z.string()),
  }),
});

const blog = defineCollection({
  loader: glob({ pattern: '**/*.{md,mdx}', base: './src/content/blog' }),
  schema: ({ image }) =>
    z.object({
      title: z.string().min(1),
      description: z.string().max(160),
      publishedAt: z.coerce.date(),
      updatedAt: z.coerce.date().optional(),
      draft: z.boolean().default(true),
      tags: z.array(z.string()).default([]),
      cover: image().optional(),
      ogImage: image().optional(),
    }),
});

export const collections = { experience, projects, skills, blog };
