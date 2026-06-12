'use client'
import { Suspense, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'

function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const redirect = searchParams.get('redirect') || '/'

  const [phone, setPhone] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const res = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, password })
      })
      const json = await res.json()
      if (!res.ok) {
        setError(json.error || '登录失败')
      } else {
        router.push(redirect)
        router.refresh()
      }
    } catch {
      setError('网络错误，请重试')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleLogin} className="space-y-4">
      <div>
        <label className="block text-xs text-[#F7F5F0]/50 mb-1.5">手机号</label>
        <input
          type="tel"
          value={phone}
          onChange={e => setPhone(e.target.value)}
          placeholder="请输入手机号"
          className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-[#F7F5F0] placeholder-white/20 focus:outline-none focus:border-[#B08D57]/50"
          maxLength={11}
          required
        />
      </div>
      <div>
        <label className="block text-xs text-[#F7F5F0]/50 mb-1.5">密码</label>
        <input
          type="password"
          value={password}
          onChange={e => setPassword(e.target.value)}
          placeholder="请输入密码"
          className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-[#F7F5F0] placeholder-white/20 focus:outline-none focus:border-[#B08D57]/50"
          required
        />
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-lg px-4 py-2.5 text-red-400 text-sm text-center">
          {error}
        </div>
      )}

      <button
        type="submit"
        disabled={loading}
        className="w-full bg-[#B08D57] hover:bg-[#9a7a4a] disabled:bg-[#B08D57]/50 text-black font-bold py-3 rounded-lg transition-colors"
      >
        {loading ? '登录中...' : '登录'}
      </button>
    </form>
  )
}

export default function LoginPage() {
  return (
    <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-8">
          <img src="/logo.png" alt="蚂蚁足球" className="w-16 h-16 mx-auto mb-2" />
          <h1 className="text-2xl font-bold text-[#B08D57]">蚂蚁足球</h1>
          <p className="text-[#F7F5F0]/40 text-sm mt-1">高精度世界杯预测</p>
        </div>

        <Suspense fallback={<div className="text-center text-[#F7F5F0]/30">加载中...</div>}>
          <LoginForm />
        </Suspense>

        <p className="text-center text-[#F7F5F0]/20 text-xs mt-6">
          足球世界杯 · 精准预测 · 仅供参考
        </p>
      </div>
    </div>
  )
}
