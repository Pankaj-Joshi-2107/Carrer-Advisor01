import { z } from 'zod';

export const JobTitleSchema = z.string()
  .min(3, { message: "Job title must be at least 3 characters long" })
  .max(50, { message: "Job title cannot exceed 50 characters" })
  .trim()
  .regex(/^[a-zA-Z\s\/-]+$/, { message: "Job title can only contain Latin alphabet letters (a-z, A-Z), spaces, hyphens, and forward slashes" });