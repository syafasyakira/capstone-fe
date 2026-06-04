// Authentication routes: Register, Login
import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { supabaseAdmin } from '../config/supabase.js';
import { generateToken } from '../middleware/auth.js';
import { AuthRequest } from '../models/types.js';

const router = Router();

/**
 * POST /auth/register
 * Register new customer account
 * Body: { email, password, full_name }
 */
router.post('/register', async (req: Request<{}, {}, AuthRequest>, res: Response): Promise<void> => {
  try {
    const { email, password, full_name } = req.body;

    // Validation
    if (!email || !password || !full_name) {
      res.status(400).json({ error: 'Email, password, dan nama lengkap harus diisi.' });
      return;
    }

    // Email format validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      res.status(400).json({ error: 'Format email tidak valid.' });
      return;
    }

    // Password strength check
    if (password.length < 6) {
      res.status(400).json({ error: 'Password minimal 6 karakter.' });
      return;
    }

    console.log(`📝 Registering new user: ${email}`);

    // Create user in Supabase Auth
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      user_metadata: {
        full_name,
      },
      email_confirm: true, // Auto-confirm for dev; remove in production
    });

    if (authError) {
      console.error('❌ Auth Creation Error:', authError.message);
      res.status(400).json({ error: `Registrasi gagal: ${authError.message}` });
      return;
    }

    const userId = authData.user.id;
    console.log(`✅ User created in Auth: ${userId}`);

    // Create profile in profiles table
    // (Trigger should handle this automatically, but we ensure it here)
    const { error: profileError } = await supabaseAdmin
      .from('profiles')
      .insert({
        id: userId,
        email,
        full_name,
        role: 'customer', // Default role for new registrations
      });

    if (profileError && !profileError.message.includes('duplicate')) {
      console.error('❌ Profile Creation Error:', profileError.message);
      res.status(500).json({ error: 'Gagal membuat profil pengguna.' });
      return;
    }

    console.log(`✅ Profile created for user: ${userId}`);

    // Generate JWT token
    const token = generateToken(userId, email, 'customer');

    res.status(201).json({
      message: 'Registrasi berhasil!',
      token,
      user: {
        id: userId,
        email,
        full_name,
        role: 'customer',
      },
    });
  } catch (error: any) {
    console.error('❌ Register Error:', error.message);
    res.status(500).json({ error: 'Terjadi kesalahan pada server.' });
  }
});

/**
 * POST /auth/login
 * Login with email and password
 * Body: { email, password }
 */
router.post('/login', async (req: Request<{}, {}, AuthRequest>, res: Response): Promise<void> => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      res.status(400).json({ error: 'Email dan password harus diisi.' });
      return;
    }

    console.log(`🔐 Login attempt: ${email}`);

    // Authenticate with Supabase
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.signInWithPassword({
      email,
      password,
    });

    if (authError || !authData.user) {
      console.error('❌ Auth Error:', authError?.message || 'User not found');
      res.status(401).json({ error: 'Email atau password salah.' });
      return;
    }

    const userId = authData.user.id;

    // Get user profile from profiles table
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (profileError || !profile) {
      console.error('❌ Profile Not Found:', profileError?.message);
      res.status(500).json({ error: 'Data pengguna tidak ditemukan.' });
      return;
    }

    console.log(`✅ Login successful: ${email} (Role: ${profile.role})`);

    // Generate JWT token
    const token = generateToken(userId, email, profile.role);

    res.json({
      message: 'Login berhasil!',
      token,
      user: {
        id: userId,
        email: profile.email,
        full_name: profile.full_name,
        role: profile.role,
      },
    });
  } catch (error: any) {
    console.error('❌ Login Error:', error.message);
    res.status(500).json({ error: 'Terjadi kesalahan pada server.' });
  }
});

/**
 * POST /auth/logout
 * Logout (frontend should clear token)
 */
router.post('/logout', (req: Request, res: Response): void => {
  res.json({ message: 'Logout berhasil. Silakan hapus token dari sisi klien.' });
});

export default router;
