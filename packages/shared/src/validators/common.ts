import { z } from 'zod';

export const paginationSchema = z.object({
  page: z.coerce.number().int().positive().optional().default(1),
  limit: z.coerce.number().int().positive().max(100).optional().default(20),
  sort: z.string().optional(),
  order: z.enum(['asc', 'desc']).optional().default('desc'),
});

export const dateRangeSchema = z.object({
  from: z.string().datetime().optional(),
  to: z.string().datetime().optional(),
});

export const idSchema = z.string().uuid('Invalid ID format');

export const idsSchema = z.array(z.string().uuid('Invalid ID format'));

export const slugSchema = z
  .string()
  .min(1)
  .max(200)
  .regex(/^[a-z0-9-]+$/, 'Slug must contain only lowercase letters, numbers, and hyphens');

export const searchSchema = z.object({
  q: z.string().min(1).max(500),
  ...paginationSchema.shape,
});

export const statusSchema = z.enum(['active', 'inactive', 'archived', 'deleted']);

export const contentStatusSchema = z.enum(['draft', 'published', 'archived', 'scheduled']);
