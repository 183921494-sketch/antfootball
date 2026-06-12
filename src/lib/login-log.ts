/**
 * 登录日志模块
 * 记录用户登录时间、IP、User-Agent、设备信息
 */

import { createClient } from '@supabase/supabase-js'

export interface LoginLog {
  id?: string
  phone: string
  login_at: string
  ip_address?: string
  user_agent?: string
  device?: string
  browser?: string
  os?: string
  country?: string
  city?: string
}

/**
 * 记录登录日志
 */
export async function logLogin(params: {
  phone: string
  req?: Request
}): Promise<void> {
  const { phone, req } = params
  
  // 解析 User-Agent
  const ua = req?.headers.get('user-agent') || 'Unknown'
  const { device, browser, os } = parseUserAgent(ua)
  
  // 获取 IP（Vercel 会放在 x-forwarded-for）
  const ip = req?.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 
             req?.headers.get('x-real-ip') || 
             'Unknown'
  
  const log: LoginLog = {
    phone,
    login_at: new Date().toISOString(),
    ip_address: ip,
    user_agent: ua,
    device,
    browser,
    os,
  }
  
  // 写入 Supabase login_logs 表
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )
    
    await supabase.from('login_logs').insert([log])
  } catch (e) {
    console.error('[login-log] Failed to write log:', e)
  }
}

/**
 * 解析 User-Agent
 */
function parseUserAgent(ua: string): { device: string; browser: string; os: string } {
  let device = 'Desktop'
  let browser = 'Unknown'
  let os = 'Unknown'
  
  // 设备判断
  if (/mobile|android|iphone|ipad|ipod/i.test(ua)) {
    device = /ipad/i.test(ua) ? 'iPad' : /iphone/i.test(ua) ? 'iPhone' : /android/i.test(ua) ? 'Android' : 'Mobile'
  } else if (/tablet/i.test(ua)) {
    device = 'Tablet'
  }
  
  // 浏览器判断
  if (/edg/i.test(ua)) browser = 'Edge'
  else if (/chrome/i.test(ua)) browser = 'Chrome'
  else if (/safari/i.test(ua) && !/chrome/i.test(ua)) browser = 'Safari'
  else if (/firefox/i.test(ua)) browser = 'Firefox'
  else if (/opera|opr/i.test(ua)) browser = 'Opera'
  
  // 操作系统判断
  if (/windows/i.test(ua)) os = 'Windows'
  else if (/mac os x/i.test(ua)) os = 'macOS'
  else if (/linux/i.test(ua)) os = 'Linux'
  else if (/android/i.test(ua)) os = 'Android'
  else if (/ios|iphone|ipad/i.test(ua)) os = 'iOS'
  
  return { device, browser, os }
}

/**
 * 获取用户登录历史
 */
export async function getLoginHistory(phone: string, limit = 20): Promise<LoginLog[]> {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )
    
    const { data, error } = await supabase
      .from('login_logs')
      .select('*')
      .eq('phone', phone)
      .order('login_at', { ascending: false })
      .limit(limit)
    
    if (error) throw error
    return data || []
  } catch (e) {
    console.error('[login-log] Failed to get history:', e)
    return []
  }
}
