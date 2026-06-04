// Admin routes: User management, logs, monitoring, reports
import { Router, Request, Response } from 'express';
import { supabaseAdmin } from '../config/supabase.js';
import { authenticateToken, requireRole, generateToken } from '../middleware/auth.js';
import { AuthRequest, UserRole } from '../models/types.js';

const router = Router();

// Middleware: Only admin can access
router.use(authenticateToken);
router.use(requireRole('admin'));

/**
 * GET /admin/users
 * List all users with pagination
 */
router.get('/users', async (req: Request, res: Response): Promise<void> => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const offset = (page - 1) * limit;

    const { data: users, error, count } = await supabaseAdmin
      .from('profiles')
      .select('*', { count: 'exact' })
      .range(offset, offset + limit - 1)
      .order('full_name', { ascending: true });

    if (error) {
      console.error('❌ Users Fetch Error:', error.message);
      res.status(500).json({ error: 'Gagal mengambil daftar pengguna.' });
      return;
    }

    res.json({
      users: users || [],
      pagination: {
        page,
        limit,
        total: count || 0,
        pages: Math.ceil((count || 0) / limit),
      },
    });
  } catch (error: any) {
    console.error('❌ Get Users Error:', error.message);
    res.status(500).json({ error: 'Terjadi kesalahan.' });
  }
});

/**
 * POST /admin/users
 * Create new user (admin can create any role)
 * Body: { email, password, full_name, role }
 */
router.post('/users', async (req: Request<{}, {}, AuthRequest & { role: UserRole }>, res: Response): Promise<void> => {
  try {
    const { email, password, full_name, role = 'customer' } = req.body;

    if (!email || !password || !full_name) {
      res.status(400).json({ error: 'Email, password, dan nama harus diisi.' });
      return;
    }

    if (!['customer', 'admin', 'customer_service'].includes(role)) {
      res.status(400).json({ error: 'Role tidak valid.' });
      return;
    }

    console.log(`🆕 Admin creating user: ${email} with role: ${role}`);

    // Create user in Auth
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      user_metadata: {
        full_name,
        role,
      },
      email_confirm: true,
    });

    if (authError) {
      console.error('❌ User Creation Error:', authError.message);
      res.status(400).json({ error: `Gagal membuat pengguna: ${authError.message}` });
      return;
    }

    const userId = authData.user.id;

    // Create profile with specified role
    const { error: profileError } = await supabaseAdmin
      .from('profiles')
      .insert({
        id: userId,
        email,
        full_name,
        role,
      });

    if (profileError && !profileError.message.includes('duplicate')) {
      console.error('❌ Profile Creation Error:', profileError.message);
      res.status(500).json({ error: 'Gagal membuat profil.' });
      return;
    }

    console.log(`✅ User created: ${userId} with role: ${role}`);

    res.status(201).json({
      message: 'Pengguna berhasil dibuat.',
      user: {
        id: userId,
        email,
        full_name,
        role,
      },
    });
  } catch (error: any) {
    console.error('❌ Create User Error:', error.message);
    res.status(500).json({ error: 'Terjadi kesalahan pada server.' });
  }
});

/**
 * GET /admin/users/:userId
 * Get user details
 */
router.get('/users/:userId', async (req: Request<{ userId: string }, {}, {}>, res: Response): Promise<void> => {
  try {
    const { userId } = req.params;

    const { data: user, error } = await supabaseAdmin
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (error || !user) {
      res.status(404).json({ error: 'Pengguna tidak ditemukan.' });
      return;
    }

    res.json({ user });
  } catch (error: any) {
    console.error('❌ Get User Error:', error.message);
    res.status(500).json({ error: 'Terjadi kesalahan.' });
  }
});

/**
 * PATCH /admin/users/:userId
 * Update user details or role
 * Body: { full_name?, email?, role? }
 */
router.patch(
  '/users/:userId',
  async (req: Request<{ userId: string }, {}, Partial<{ full_name: string; email: string; role: UserRole }>>, res: Response): Promise<void> => {
    try {
      const { userId } = req.params;
      const { full_name, email, role } = req.body;

      if (role && !['customer', 'admin', 'customer_service'].includes(role)) {
        res.status(400).json({ error: 'Role tidak valid.' });
        return;
      }

      console.log(`✏️  Admin updating user: ${userId}`);

      const updateData: any = {};
      if (full_name) updateData.full_name = full_name;
      if (email) updateData.email = email;
      if (role) updateData.role = role;

      const { error } = await supabaseAdmin
        .from('profiles')
        .update(updateData)
        .eq('id', userId);

      if (error) {
        console.error('❌ User Update Error:', error.message);
        res.status(500).json({ error: 'Gagal mengupdate pengguna.' });
        return;
      }

      console.log(`✅ User updated: ${userId}`);

      res.json({
        message: 'Pengguna berhasil diupdate.',
        user_id: userId,
      });
    } catch (error: any) {
      console.error('❌ Update User Error:', error.message);
      res.status(500).json({ error: 'Terjadi kesalahan.' });
    }
  }
);

/**
 * DELETE /admin/users/:userId
 * Delete user (soft delete from profiles)
 */
router.delete('/users/:userId', async (req: Request<{ userId: string }, {}, {}>, res: Response): Promise<void> => {
  try {
    const { userId } = req.params;

    console.log(`🗑️  Admin deleting user: ${userId}`);

    // Option 1: Soft delete (just mark as deleted)
    // const { error } = await supabaseAdmin
    //   .from('profiles')
    //   .update({ deleted_at: new Date().toISOString() })
    //   .eq('id', userId);

    // Option 2: Hard delete
    const { error: profileError } = await supabaseAdmin
      .from('profiles')
      .delete()
      .eq('id', userId);

    if (profileError) {
      console.error('❌ User Delete Error:', profileError.message);
      res.status(500).json({ error: 'Gagal menghapus pengguna.' });
      return;
    }

    // Also delete from Auth
    await supabaseAdmin.auth.admin.deleteUser(userId);

    console.log(`✅ User deleted: ${userId}`);

    res.json({
      message: 'Pengguna berhasil dihapus.',
      user_id: userId,
    });
  } catch (error: any) {
    console.error('❌ Delete User Error:', error.message);
    res.status(500).json({ error: 'Terjadi kesalahan.' });
  }
});

/**
 * GET /admin/chats
 * View all chats (monitoring dashboard)
 */
router.get('/chats', async (req: Request, res: Response): Promise<void> => {
  try {
    const status = req.query.status as string | undefined;
    const role = req.query.role as string | undefined;

    let query = supabaseAdmin
      .from('chats')
      .select(
        `
        id,
        customer_id,
        cs_id,
        title,
        preview,
        status,
        created_at,
        profiles:customer_id (full_name, email),
        cs_profile:cs_id (full_name, email)
      `
      );

    if (status) {
      query = query.eq('status', status);
    }

    const { data: chats, error, count } = await query
      .order('created_at', { ascending: false })
      .limit(100);

    if (error) {
      console.error('❌ Admin Chats Fetch Error:', error.message);
      res.status(500).json({ error: 'Gagal mengambil daftar chat.' });
      return;
    }

    // Compute statistics
    const stats = {
      total: chats?.length || 0,
      ai: chats?.filter((c: any) => c.status === 'ai').length || 0,
      waiting_cs: chats?.filter((c: any) => c.status === 'waiting_cs').length || 0,
      with_cs: chats?.filter((c: any) => c.status === 'with_cs').length || 0,
      solved: chats?.filter((c: any) => c.status === 'solved').length || 0,
    };

    res.json({
      chats: chats || [],
      stats,
    });
  } catch (error: any) {
    console.error('❌ Get Admin Chats Error:', error.message);
    res.status(500).json({ error: 'Terjadi kesalahan.' });
  }
});

/**
 * GET /admin/monitoring
 * Dashboard monitoring data
 */
router.get('/monitoring', async (req: Request, res: Response): Promise<void> => {
  try {
    // Get total users
    const { count: totalUsers } = await supabaseAdmin
      .from('profiles')
      .select('*', { count: 'exact' });

    // Get users by role
    const { data: usersByRole } = await supabaseAdmin.rpc('get_users_by_role' as any);

    // Get chat statistics
    const { data: chats } = await supabaseAdmin
      .from('chats')
      .select('status');

    const chatStats = {
      total: chats?.length || 0,
      ai: chats?.filter((c: any) => c.status === 'ai').length || 0,
      waiting_cs: chats?.filter((c: any) => c.status === 'waiting_cs').length || 0,
      with_cs: chats?.filter((c: any) => c.status === 'with_cs').length || 0,
      solved: chats?.filter((c: any) => c.status === 'solved').length || 0,
    };

    // Get message count
    const { count: totalMessages } = await supabaseAdmin
      .from('messages')
      .select('*', { count: 'exact' });

    res.json({
      users: {
        total: totalUsers || 0,
        by_role: usersByRole || {},
      },
      chats: chatStats,
      messages: {
        total: totalMessages || 0,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('❌ Monitoring Error:', error.message);
    res.status(500).json({
      message: 'Monitoring dashboard siap, tapi beberapa data mungkin belum tersedia.',
      error: error.message,
    });
  }
});

export default router;
