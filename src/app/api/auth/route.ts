import { NextRequest, NextResponse } from 'next/server'
import { signToken, verifyToken } from '@/lib/auth'
import { validateUser, validateSuperAdmin } from '@/lib/user-store'

export async function POST(req: NextRequest) {
  try {
    const { phone, password, action } = await req.json()

    if (!phone || !password) {
      return NextResponse.json({ error: '手机号和密码不能为空' }, { status: 400 })
    }

    // Super admin login
    if (validateSuperAdmin(phone, password)) {
      const token = signToken({ phone, role: 'super_admin', nickname: '超级管理员' })
      const resp = NextResponse.json({
        success: true,
        user: { phone, role: 'super_admin', nickname: '超级管理员' }
      })
      resp.cookies.set('auth_token', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 60 * 60 * 24 * 7 // 7 days
      })
      return resp
    }

    // Regular user login
    const result = validateUser(phone, password)
    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 401 })
    }

    const token = signToken({
      phone: result.user.phone,
      role: result.user.role,
      nickname: result.user.nickname
    })

    const resp = NextResponse.json({
      success: true,
      user: {
        phone: result.user.phone,
        role: result.user.role,
        nickname: result.user.nickname
      }
    })
    resp.cookies.set('auth_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7
    })
    return resp
  } catch (e) {
    return NextResponse.json({ error: '服务器错误' }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  const resp = NextResponse.json({ success: true })
  resp.cookies.delete('auth_token')
  return resp
}

export async function GET(req: NextRequest) {
  const token = req.cookies.get('auth_token')?.value
  if (!token) {
    return NextResponse.json({ authenticated: false })
  }
  const payload = verifyToken(token)
  if (!payload) {
    return NextResponse.json({ authenticated: false })
  }
  return NextResponse.json({
    authenticated: true,
    user: payload
  })
}
