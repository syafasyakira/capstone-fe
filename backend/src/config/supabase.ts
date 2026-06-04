// Supabase client configuration
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY!;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !supabaseAnonKey || !supabaseServiceRoleKey) {
  throw new Error('Missing required Supabase environment variables');
}

/**
 * Anon client - untuk operasi dengan auth user (limited scope)
 * Digunakan untuk chat, message operations
 */
export const supabaseClient = createClient(supabaseUrl, supabaseAnonKey);

/**
 * Service role client - admin operations (full access)
 * Digunakan untuk admin operations, user management, etc
 */
export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey);

export default supabaseClient;
