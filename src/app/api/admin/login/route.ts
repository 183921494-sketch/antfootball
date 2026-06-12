// Redirect old admin login to new unified auth
import { NextRequest, NextResponse } from 'next/server'
import { signToken, verifyToken } from '@/lib/auth'
import { validateSuperAdmin } from '@/lib/user-store'

export async function POST(req: NextRequest) {
  const { phone, password } = await req.json()
  if (!phone || !password) {
    return NextResponse.json({ error: '手机号和密码不能为空' }, { status: 400 })
  }
  if (!validateSuperAdmin(phone, password)) {
    return NextResponse.json({ error: '手机号或密码错误' }, { status: 401 })
  }
  const token = signToken({ phone, role: 'super_admin', nickname: '超级管理员' })
  const resp = NextResponse.json({ success: true, user: { phone, role: 'super_admin', nickname: '超级管理员' } })
  resp.cookies.set('auth_token', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 7
  })
  return resp
}

export async function GET(req: NextRequest) {
  const token = req.cookies.get('auth_token')?.value
  if (!token) return NextResponse.json({ authenticated: false })
  const payload = verifyToken(token)
  if (!payload || payload.role !== 'super_admin') return NextResponse.json({ authenticated: false })
  return NextResponse.json({ authenticated: true, user: payload })
}
