import { NextRequest, NextResponse } from 'next/server'
import { verifyToken } from '@/lib/auth'
import { getAllUsers, createUser, updateUser, deleteUser } from '@/lib/user-store'

// Verify super admin
function verifySuperAdmin(req: NextRequest): { ok: true; phone: string } | { ok: false; resp: NextResponse } {
  const token = req.cookies.get('auth_token')?.value
  if (!token) return { ok: false, resp: NextResponse.json({ error: '未登录' }, { status: 401 }) }
  const payload = verifyToken(token)
  if (!payload || payload.role !== 'super_admin') {
    return { ok: false, resp: NextResponse.json({ error: '权限不足' }, { status: 403 }) }
  }
  return { ok: true, phone: payload.phone }
}

// GET /api/admin/users — list all users
export async function GET(req: NextRequest) {
  const check = verifySuperAdmin(req)
  if (!check.ok) return check.resp
  const users = getAllUsers()
  return NextResponse.json({ users })
}

// POST /api/admin/users — create user
export async function POST(req: NextRequest) {
  const check = verifySuperAdmin(req)
  if (!check.ok) return check.resp

  const { phone, password, nickname, role } = await req.json()
  if (!phone || !password || !nickname) {
    return NextResponse.json({ error: '手机号、密码、昵称不能为空' }, { status: 400 })
  }
  if (!/^1[3-9]\d{9}$/.test(phone)) {
    return NextResponse.json({ error: '手机号格式不正确' }, { status: 400 })
  }
  if (password.length < 6) {
    return NextResponse.json({ error: '密码至少6位' }, { status: 400 })
  }
  if (role && !['user'].includes(role)) {
    return NextResponse.json({ error: '角色无效' }, { status: 400 })
  }

  const result = createUser({ phone, password, nickname, role: role || 'user' })
  if (!result.success) {
    return NextResponse.json({ error: result.error }, { status: 409 })
  }
  return NextResponse.json({ success: true, user: result.user }, { status: 201 })
}

// PUT /api/admin/users — update user
export async function PUT(req: NextRequest) {
  const check = verifySuperAdmin(req)
  if (!check.ok) return check.resp

  const { phone, nickname, status, password } = await req.json()
  if (!phone) return NextResponse.json({ error: '手机号不能为空' }, { status: 400 })
  // Cannot modify super admin
  if (phone === '15377731411') {
    return NextResponse.json({ error: '无法修改超级管理员' }, { status: 403 })
  }
  const result = updateUser(phone, { nickname, status, password })
  if (!result.success) {
    return NextResponse.json({ error: result.error }, { status: 404 })
  }
  return NextResponse.json({ success: true })
}

// DELETE /api/admin/users — delete user
export async function DELETE(req: NextRequest) {
  const check = verifySuperAdmin(req)
  if (!check.ok) return check.resp

  const { phone } = await req.json()
  if (!phone) return NextResponse.json({ error: '手机号不能为空' }, { status: 400 })
  if (phone === '15377731411') {
    return NextResponse.json({ error: '无法删除超级管理员' }, { status: 403 })
  }
  const result = deleteUser(phone)
  if (!result.success) {
    return NextResponse.json({ error: result.error }, { status: 404 })
  }
  return NextResponse.json({ success: true })
}
