import { createHmac } from 'crypto'

const JWT_SECRET = process.env.JWT_SECRET || 'antfootball-2026-secret-key'
const TOKEN_EXPIRY_SEC = 7 * 24 * 60 * 60 // 7 days

export interface TokenPayload {
  phone: string
  role: 'super_admin' | 'user'
  nickname?: string
  iat: number
  exp: number
}

export interface AuthUser {
  phone: string
  passwordHash: string
  role: 'super_admin' | 'user'
  nickname: string
  createdAt: string
  status: 'active' | 'disabled'
}

// Simple HMAC-based token (no external dependency)
export function signToken(payload: Omit<TokenPayload, 'iat' | 'exp'>): string {
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url')
  const now = Math.floor(Date.now() / 1000)
  const body: TokenPayload = { ...payload, iat: now, exp: now + TOKEN_EXPIRY_SEC }
  const bodyB64 = Buffer.from(JSON.stringify(body)).toString('base64url')
  const sig = createHmac('sha256', JWT_SECRET).update(`${header}.${bodyB64}`).digest('base64url')
  return `${header}.${bodyB64}.${sig}`
}

export function verifyToken(token: string): TokenPayload | null {
  try {
    const parts = token.split('.')
    if (parts.length !== 3) return null
    const [header, body, sig] = parts
    const expectedSig = createHmac('sha256', JWT_SECRET).update(`${header}.${body}`).digest('base64url')
    if (sig !== expectedSig) return null
    const payload: TokenPayload = JSON.parse(Buffer.from(body, 'base64url').toString())
    const now = Math.floor(Date.now() / 1000)
    if (payload.exp < now) return null
    return payload
  } catch {
    return null
  }
}

export function getTokenFromCookies(cookieHeader: string | null): string | null {
  if (!cookieHeader) return null
  const match = cookieHeader.match(/auth_token=([^;]+)/)
  return match ? match[1] : null
}

// Simple password hash for JSON-file based auth
export function hashPassword(password: string): string {
  const salt = 'antfootball_salt_2026'
  let hash = 0
  const salted = password + salt
  for (let i = 0; i < salted.length; i++) {
    const char = salted.charCodeAt(i)
    hash = ((hash << 5) - hash) + char
    hash = hash & hash
  }
  return 'AF_' + Math.abs(hash).toString(16).padStart(8, '0') + '_' + Buffer.from(salted).toString('base64url')
}

export function verifyPassword(password: string, storedHash: string): boolean {
  return hashPassword(password) === storedHash
}
