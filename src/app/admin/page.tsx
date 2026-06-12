'use client'
import { useEffect, useState, useCallback } from 'react'

interface User {
  phone: string
  nickname: string
  role: string
  tier: 'vip' | 'svip'
  status: string
  createdAt: string
}

export default function AdminPage() {
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<'list' | 'add'>('list')
  const [msg, setMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [editingUser, setEditingUser] = useState<User | null>(null)

  // Add user form
  const [addPhone, setAddPhone] = useState('')
  const [addNickname, setAddNickname] = useState('')
  const [addPassword, setAddPassword] = useState('')
  const [addTier, setAddTier] = useState<'vip' | 'svip'>('vip')
  const [addLoading, setAddLoading] = useState(false)

  // Edit form
  const [editNickname, setEditNickname] = useState('')
  const [editStatus, setEditStatus] = useState('')
  const [editPassword, setEditPassword] = useState('')
  const [editTier, setEditTier] = useState<'vip' | 'svip'>('vip')
  const [editLoading, setEditLoading] = useState(false)

  const fetchUsers = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/users')
      const json = await res.json()
      if (res.ok) setUsers(json.users)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchUsers() }, [fetchUsers])

  function showMsg(type: 'success' | 'error', text: string) {
    setMsg({ type, text })
    setTimeout(() => setMsg(null), 3000)
  }

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    setAddLoading(true)
    try {
      const res = await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: addPhone, nickname: addNickname, password: addPassword, tier: addTier })
      })
      const json = await res.json()
      if (res.ok) {
        showMsg('success', '账号添加成功')
        setAddPhone(''); setAddNickname(''); setAddPassword('')
        fetchUsers()
        setTab('list')
      } else {
        showMsg('error', json.error || '添加失败')
      }
    } catch {
      showMsg('error', '网络错误')
    } finally {
      setAddLoading(false)
    }
  }

  async function handleDelete(phone: string) {
    if (!confirm(`确定删除账号 ${phone}？`)) return
    const res = await fetch('/api/admin/users', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone })
    })
    const json = await res.json()
    if (res.ok) {
      showMsg('success', '账号已删除')
      fetchUsers()
    } else {
      showMsg('error', json.error || '删除失败')
    }
  }

  function openEdit(u: User) {
    setEditingUser(u)
    setEditNickname(u.nickname)
    setEditStatus(u.status)
    setEditPassword('')
    setEditTier(u.tier || 'vip')
  }

  async function handleEdit(e: React.FormEvent) {
    e.preventDefault()
    if (!editingUser) return
    setEditLoading(true)
    try {
      const updates: any = { phone: editingUser.phone, nickname: editNickname, status: editStatus, tier: editTier }
      if (editPassword) updates.password = editPassword
      const res = await fetch('/api/admin/users', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates)
      })
      const json = await res.json()
      if (res.ok) {
        showMsg('success', '修改成功')
        setEditingUser(null)
        fetchUsers()
      } else {
        showMsg('error', json.error || '修改失败')
      }
    } catch {
      showMsg('error', '网络错误')
    } finally {
      setEditLoading(false)
    }
  }

  function formatDate(iso: string) {
    return new Date(iso).toLocaleString('zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-[#F7F5F0]">
      {/* Header */}
      <header className="bg-[#111111] border-b border-white/5 px-6 py-4 flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold text-[#B08D57]">蚂蚁足球 · 管理后台</h1>
          <p className="text-xs text-[#F7F5F0]/30">账号管理</p>
        </div>
        <div className="flex items-center gap-3">
          <a href="/admin/logs" className="text-sm text-[#B08D57]/70 hover:text-[#B08D57]">登录日志</a>
          <a href="/" className="text-sm text-[#B08D57]/70 hover:text-[#B08D57]">← 返回预测</a>
          <button
            onClick={async () => { await fetch('/api/auth', { method: 'DELETE' }); location.reload() }}
            className="text-sm text-[#F7F5F0]/40 hover:text-red-400"
          >
            退出登录
          </button>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-6 py-8">
        {/* Tab nav */}
        <div className="flex gap-1 mb-6 bg-white/5 rounded-lg p-1 w-fit">
          <button onClick={() => setTab('list')} className={`px-4 py-2 rounded-md text-sm font-medium transition ${tab === 'list' ? 'bg-[#B08D57] text-black' : 'text-[#F7F5F0]/50'}`}>账号列表</button>
          <button onClick={() => setTab('add')} className={`px-4 py-2 rounded-md text-sm font-medium transition ${tab === 'add' ? 'bg-[#B08D57] text-black' : 'text-[#F7F5F0]/50'}`}>+ 新增账号</button>
        </div>

        {msg && (
          <div className={`mb-4 px-4 py-3 rounded-lg text-sm ${msg.type === 'success' ? 'bg-green-500/10 border border-green-500/30 text-green-400' : 'bg-red-500/10 border border-red-500/30 text-red-400'}`}>
            {msg.text}
          </div>
        )}

        {/* Account list */}
        {tab === 'list' && (
          <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl overflow-hidden">
            {loading ? (
              <div className="p-8 text-center text-[#F7F5F0]/30">加载中...</div>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-white/5 text-[#F7F5F0]/40 text-xs">
                    <th className="text-left p-4 font-medium">手机号</th>
                    <th className="text-left p-4 font-medium">昵称</th>
                    <th className="text-left p-4 font-medium">等级</th>
                    <th className="text-left p-4 font-medium">状态</th>
                    <th className="text-left p-4 font-medium">注册时间</th>
                    <th className="text-right p-4 font-medium">操作</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map(u => (
                    <tr key={u.phone} className="border-b border-white/5 hover:bg-white/[0.02]">
                      <td className="p-4 font-mono text-[#B08D57]">{u.phone}</td>
                      <td className="p-4">{u.nickname}</td>
                      <td className="p-4">
                        {u.role === 'super_admin' ? (
                          <span className="text-xs px-2 py-0.5 rounded-full bg-[#B08D57]/20 text-[#B08D57]">超管</span>
                        ) : u.tier === 'svip' ? (
                          <span className="text-xs px-2 py-0.5 rounded-full bg-[#B08D57]/15 text-[#B08D57] border border-[#B08D57]/25 font-bold">SVIP</span>
                        ) : (
                          <span className="text-xs px-2 py-0.5 rounded-full bg-amber-700/20 text-amber-400 border border-amber-600/25 font-bold">VIP</span>
                        )}
                      </td>
                      <td className="p-4">
                        <span className={`text-xs px-2 py-0.5 rounded-full ${u.status === 'active' ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'}`}>
                          {u.status === 'active' ? '启用' : '禁用'}
                        </span>
                      </td>
                      <td className="p-4 text-[#F7F5F0]/30">{formatDate(u.createdAt)}</td>
                      <td className="p-4 text-right">
                        <button onClick={() => openEdit(u)} className="text-[#B08D57] hover:text-[#c9a56a] mr-3 text-xs">编辑</button>
                        {u.phone !== '15377731411' && (
                          <button onClick={() => handleDelete(u.phone)} className="text-red-400/60 hover:text-red-400 text-xs">删除</button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}

        {/* Add account form */}
        {tab === 'add' && (
          <form onSubmit={handleAdd} className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-6 space-y-4 max-w-md">
            <h2 className="text-sm font-bold text-[#B08D57] mb-2">新增用户账号</h2>
            <div>
              <label className="block text-xs text-[#F7F5F0]/50 mb-1">手机号</label>
              <input value={addPhone} onChange={e => setAddPhone(e.target.value)} placeholder="1xxxxxxxxxx" maxLength={11} className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-[#F7F5F0] focus:outline-none focus:border-[#B08D57]/50" required />
            </div>
            <div>
              <label className="block text-xs text-[#F7F5F0]/50 mb-1">昵称</label>
              <input value={addNickname} onChange={e => setAddNickname(e.target.value)} placeholder="用户昵称" className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-[#F7F5F0] focus:outline-none focus:border-[#B08D57]/50" required />
            </div>
            <div>
              <label className="block text-xs text-[#F7F5F0]/50 mb-1">密码（≥6位）</label>
              <input type="password" value={addPassword} onChange={e => setAddPassword(e.target.value)} placeholder="设置密码" className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-[#F7F5F0] focus:outline-none focus:border-[#B08D57]/50" minLength={6} required />
            </div>
            <div>
              <label className="block text-xs text-[#F7F5F0]/50 mb-1">会员等级</label>
              <div className="flex gap-2">
                <button type="button" onClick={() => setAddTier('vip')} className={`flex-1 py-2.5 rounded-lg border text-sm font-bold transition ${addTier === 'vip' ? 'border-amber-600/50 bg-amber-700/20 text-amber-400' : 'border-white/10 text-[#F7F5F0]/30'}`}>VIP</button>
                <button type="button" onClick={() => setAddTier('svip')} className={`flex-1 py-2.5 rounded-lg border text-sm font-bold transition ${addTier === 'svip' ? 'border-[#B08D57]/50 bg-[#B08D57]/20 text-[#B08D57]' : 'border-white/10 text-[#F7F5F0]/30'}`}>SVIP</button>
              </div>
              <p className="text-[10px] text-[#F7F5F0]/20 mt-1">VIP: 可查看2场未开始赛事 | SVIP: 全部解锁</p>
            </div>
            <button type="submit" disabled={addLoading} className="w-full bg-[#B08D57] hover:bg-[#9a7a4a] disabled:opacity-50 text-black font-bold py-2.5 rounded-lg transition">
              {addLoading ? '添加中...' : '确认添加'}
            </button>
          </form>
        )}

        {/* Edit modal */}
        {editingUser && (
          <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 px-4" onClick={() => setEditingUser(null)}>
            <div className="bg-[#1a1a1a] border border-white/10 rounded-xl p-6 w-full max-w-sm" onClick={e => e.stopPropagation()}>
              <h3 className="text-sm font-bold text-[#B08D57] mb-4">编辑账号 · {editingUser.phone}</h3>
              <form onSubmit={handleEdit} className="space-y-3">
                <div>
                  <label className="block text-xs text-[#F7F5F0]/50 mb-1">昵称</label>
                  <input value={editNickname} onChange={e => setEditNickname(e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-[#F7F5F0] focus:outline-none focus:border-[#B08D57]/50" required />
                </div>
                <div>
                  <label className="block text-xs text-[#F7F5F0]/50 mb-1">状态</label>
                  <select value={editStatus} onChange={e => setEditStatus(e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-[#F7F5F0] focus:outline-none focus:border-[#B08D57]/50">
                    <option value="active">启用</option>
                    <option value="disabled">禁用</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-[#F7F5F0]/50 mb-1">新密码（留空不变）</label>
                  <input type="password" value={editPassword} onChange={e => setEditPassword(e.target.value)} placeholder="不修改请留空" className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-[#F7F5F0] focus:outline-none focus:border-[#B08D57]/50" />
                </div>
                <div>
                  <label className="block text-xs text-[#F7F5F0]/50 mb-1">会员等级</label>
                  <div className="flex gap-2">
                    <button type="button" onClick={() => setEditTier('vip')} className={`flex-1 py-2 rounded-lg border text-sm font-bold transition ${editTier === 'vip' ? 'border-amber-600/50 bg-amber-700/20 text-amber-400' : 'border-white/10 text-[#F7F5F0]/30'}`}>VIP</button>
                    <button type="button" onClick={() => setEditTier('svip')} className={`flex-1 py-2 rounded-lg border text-sm font-bold transition ${editTier === 'svip' ? 'border-[#B08D57]/50 bg-[#B08D57]/20 text-[#B08D57]' : 'border-white/10 text-[#F7F5F0]/30'}`}>SVIP</button>
                  </div>
                </div>
                <div className="flex gap-2 pt-2">
                  <button type="button" onClick={() => setEditingUser(null)} className="flex-1 py-2 rounded-lg border border-white/10 text-[#F7F5F0]/50 text-sm">取消</button>
                  <button type="submit" disabled={editLoading} className="flex-1 py-2 rounded-lg bg-[#B08D57] text-black font-bold text-sm disabled:opacity-50">保存</button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
