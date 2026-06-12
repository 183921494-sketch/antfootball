import { NextRequest, NextResponse } from 'next/server'
import { verifyToken } from '@/lib/auth'
import { createClient } from '@supabase/supabase-js'

// Verify super admin
function verifySuperAdmin(req: NextRequest): boolean {
  const token = req.cookies.get('auth_token')?.value
  if (!token) return false
  const payload = verifyToken(token)
  return payload?.role === 'super_admin'
}

// GET /api/admin/login-logs
export async function GET(req: NextRequest) {
  if (!verifySuperAdmin(req)) {
    return NextResponse.json({ error: '权限不足' }, { status: 403 })
  }

  try {
    const { searchParams } = new URL(req.url)
    const phone = searchParams.get('phone')
    const limit = parseInt(searchParams.get('limit') || '100')

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    let query = supabase
      .from('login_logs')
      .select('*')
      .order('login_at', { ascending: false })
      .limit(limit)

    if (phone) {
      query = query.eq('phone', phone)
    }

    const { data, error } = await query

    if (error) {
      // 表不存在时返回空数组
      if (error.code === '42P01') {
        return NextResponse.json({ logs: [] })
      }
      throw error
    }

    return NextResponse.json({ logs: data || [] })
  } catch (error: any) {
    console.error('[login-logs] Error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
