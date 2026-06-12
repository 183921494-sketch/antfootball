import fs from 'fs'
import path from 'path'
import { AuthUser, hashPassword, verifyPassword } from './auth'

const DATA_FILE = path.join(process.cwd(), 'data', 'users.json')

function readUsers(): AuthUser[] {
  try {
    const raw = fs.readFileSync(DATA_FILE, 'utf-8')
    return JSON.parse(raw).users || []
  } catch {
    return []
  }
}

function writeUsers(users: AuthUser[]): void {
  fs.writeFileSync(DATA_FILE, JSON.stringify({ users }, null, 2), 'utf-8')
}

export type SafeUser = Omit<AuthUser, 'passwordHash'>

export function getAllUsers(): SafeUser[] {
  return readUsers().map(u => ({ phone: u.phone, role: u.role, nickname: u.nickname, createdAt: u.createdAt, status: u.status }))
}

export function findUserByPhone(phone: string): AuthUser | null {
  const users = readUsers()
  return users.find(u => u.phone === phone) || null
}

export function createUser(data: {
  phone: string
  password: string
  nickname: string
  role?: 'super_admin' | 'user'
}): { success: true; user: SafeUser } | { success: false; error: string } {
  const users = readUsers()
  if (users.find(u => u.phone === data.phone)) {
    return { success: false, error: '该手机号已注册' }
  }
  const user: AuthUser = {
    phone: data.phone,
    passwordHash: hashPassword(data.password),
    role: data.role || 'user',
    nickname: data.nickname,
    createdAt: new Date().toISOString(),
    status: 'active'
  }
  users.push(user)
  writeUsers(users)
  return {
    success: true,
    user: { phone: user.phone, role: user.role, nickname: user.nickname, createdAt: user.createdAt, status: user.status }
  }
}

export function updateUser(
  phone: string,
  updates: { nickname?: string; status?: string; password?: string }
): { success: true } | { success: false; error: string } {
  const users = readUsers()
  const idx = users.findIndex(u => u.phone === phone)
  if (idx === -1) return { success: false, error: '用户不存在' }
  if (updates.nickname) users[idx].nickname = updates.nickname
  if (updates.status) users[idx].status = updates.status as 'active' | 'disabled'
  if (updates.password) users[idx].passwordHash = hashPassword(updates.password)
  writeUsers(users)
  return { success: true }
}

export function deleteUser(phone: string): { success: true } | { success: false; error: string } {
  const users = readUsers()
  const filtered = users.filter(u => u.phone !== phone)
  if (filtered.length === users.length) return { success: false, error: '用户不存在' }
  writeUsers(filtered)
  return { success: true }
}

export function validateUser(
  phone: string,
  password: string
): { success: true; user: SafeUser } | { success: false; error: string } {
  const user = findUserByPhone(phone)
  if (!user) return { success: false, error: '手机号或密码错误' }
  if (user.status !== 'active') return { success: false, error: '账号已被禁用' }
  if (!verifyPassword(password, user.passwordHash)) {
    return { success: false, error: '手机号或密码错误' }
  }
  return {
    success: true,
    user: { phone: user.phone, role: user.role, nickname: user.nickname, createdAt: user.createdAt, status: user.status }
  }
}

export function validateSuperAdmin(phone: string, password: string): boolean {
  return phone === '15377731411' && password === 'zhang168'
}
