import { z } from 'zod';

export const createAuditSchema = z.object({
  url: z.string().trim().min(4).max(500),
  clientId: z.string().trim().min(4).max(80).optional().or(z.literal('')),
  clientName: z.string().trim().min(2).max(120).optional().or(z.literal('')),
  businessType: z.string().trim().min(2).max(80),
  city: z.string().trim().min(2).max(80),
  state: z.string().trim().min(2).max(80),
  targetKeyword: z.string().trim().min(2).max(120),
  email: z.string().trim().email().max(160).optional().or(z.literal('')),
  phone: z.string().trim().max(40).optional().or(z.literal('')),
});

export const createClientSchema = z.object({
  name: z.string().trim().min(2).max(120),
  email: z.string().trim().email().max(160).optional().or(z.literal('')),
  phone: z.string().trim().max(40).optional().or(z.literal('')),
});

export function zodErrorMessage(error) {
  const issue = error.issues?.[0];
  if (!issue) return 'Invalid input';
  const path = issue.path?.length ? `${issue.path.join('.')}: ` : '';
  return `${path}${issue.message}`;
}
