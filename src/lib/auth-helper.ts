import { verifyToken, getTokenFromCookies } from '@/lib/auth'

// 从 cookie 解析用户 tier，未登录默认按 VIP 限制处理
export function getUserTier(request: Request): 'vip' | 'svip' | 'super_admin' {
  const token = getTokenFromCookies(request.headers.get('cookie'))
  if (!token) return 'vip' // 未登录按 VIP 限制（实际不会到达，因为 proxy 已拦截）
  const payload = verifyToken(token)
  if (!payload) return 'vip'
  if (payload.role === 'super_admin') return 'super_admin'
  return payload.tier || 'vip'
}
