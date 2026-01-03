
import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config();

const envSchema = z.object({
  PORT: z.string().default('3000'),
  SUPABASE_URL: z.string().url(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
  REDIS_HOST: z.string().default('localhost'),
  REDIS_PORT: z.string().default('6379'),
  WHATSMEOW_URL: z.string().url(),
  EVOLUTION_API_URL: z.string().url().optional(),
  EVOLUTION_API_KEY: z.string().optional(),
  WEBHOOK_SECRET: z.string().min(1),
  API_BASE_URL: z.string().url() // URL pública desta API (https://apitech...)
});

export const env = envSchema.parse(process.env);
