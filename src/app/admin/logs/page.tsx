'use client'
import { useEffect, useState } from 'react'

interface LoginLog {
  id: string
  phone: string
  login_at: string
  ip_address: string
  user_agent: string
  device: string
  browser: string
  os: string
}

export default function LoginLogsPage() {
  const [logs, setLogs] = useState<LoginLog[]>([])
  const [loading, setLoading] = useState(true)
  const [phoneFilter, setPhoneFilter] = useState('')

  useEffect(() => {
    fetchLogs()
  }, [])

  async function fetchLogs() {
    try {
      const res = await fetch('/api/admin/login-logs')
      const json = await res.json()
      if (res.ok) setLogs(json.logs || [])
    } finally {
      setLoading(false)
    }
  }

  const filtered = phoneFilter
    ? logs.filter(l => l.phone.includes(phoneFilter))
    : logs

  function formatTime(iso: string) {
    return new Date(iso).toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      timeZone: 'Asia/Shanghai'
    })
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-[#F7F5F0]">
      {/* Header */}
      <header className="bg-[#111111] border-b border-white/5 px-6 py-4 flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold text-[#B08D57]">蚂蚁足球 · 登录日志</h1>
          <p className="text-xs text-[#F7F5F0]/30">用户登录记录</p>
        </div>
        <div className="flex items-center gap-3">
          <a href="/admin" className="text-sm text-[#B08D57]/70 hover:text-[#B08D57]">账号管理</a>
          <a href="/" className="text-sm text-[#B08D57]/70 hover:text-[#B08D57]">← 返回预测</a>
          <button
            onClick={async () => { await fetch('/api/auth', { method: 'DELETE' }); location.reload() }}
            className="text-sm text-[#F7F5F0]/40 hover:text-red-400"
          >
            退出登录
          </button>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-6 py-8">
        {/* Filter */}
        <div className="mb-6 flex items-center gap-4">
          <input
            type="text"
            placeholder="搜索手机号..."
            value={phoneFilter}
            onChange={e => setPhoneFilter(e.target.value)}
            className="bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-sm text-[#F7F5F0] placeholder-white/30 focus:outline-none focus:border-[#B08D57]/50 w-48"
          />
          <span className="text-xs text-[#F7F5F0]/30">共 {filtered.length} 条记录</span>
        </div>

        {/* Table */}
        <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl overflow-hidden">
          {loading ? (
            <div className="p-8 text-center text-[#F7F5F0]/30">加载中...</div>
          ) : filtered.length === 0 ? (
            <div className="p-8 text-center text-[#F7F5F0]/30">暂无登录记录</div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/5 text-[#F7F5F0]/40 text-xs">
                  <th className="text-left p-4 font-medium">手机号</th>
                  <th className="text-left p-4 font-medium">登录时间</th>
                  <th className="text-left p-4 font-medium">IP地址</th>
                  <th className="text-left p-4 font-medium">设备</th>
                  <th className="text-left p-4 font-medium">浏览器</th>
                  <th className="text-left p-4 font-medium">操作系统</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(log => (
                  <tr key={log.id} className="border-b border-white/5 hover:bg-white/[0.02]">
                    <td className="p-4 font-mono text-[#B08D57]">{log.phone}</td>
                    <td className="p-4 text-[#F7F5F0]/70">{formatTime(log.login_at)}</td>
                    <td className="p-4 font-mono text-xs">{log.ip_address || '-'}</td>
                    <td className="p-4">
                      <span className="text-xs px-2 py-0.5 rounded-full bg-white/10 text-[#F7F5F0]/50">
                        {log.device || '-'}
                      </span>
                    </td>
                    <td className="p-4 text-xs text-[#F7F5F0]/50">{log.browser || '-'}</td>
                    <td className="p-4 text-xs text-[#F7F5F0]/50">{log.os || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  )
}
