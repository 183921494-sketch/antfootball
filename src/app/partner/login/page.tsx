"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Eye, EyeOff } from "lucide-react";
import Link from "next/link";

export default function PartnerLoginPage() {
  const router = useRouter();
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/auth?type=partner-login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "登录失败");
        return;
      }

      document.cookie = `partner_token=${data.token}; path=/; max-age=${60 * 60 * 24}`;
      router.push("/partner/dashboard");
    } catch {
      setError("网络错误，请重试");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[100dvh] flex items-center justify-center bg-gradient-to-br from-[#111] to-[#3B2B20] p-4">
      <div className="w-full max-w-md p-6 md:p-8 bg-white/5 backdrop-blur-lg rounded-2xl border border-[#B08D57]/20">
        <div className="text-center mb-6 md:mb-8">
          <div className="text-4xl mb-2">🐜</div>
          <h1 className="text-xl md:text-2xl font-bold text-[#F7F5F0]">蚂蚁足球</h1>
          <p className="text-[#B08D57] mt-1 text-sm">合作方登录</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-sm text-[#F7F5F0]/70 mb-1.5">手机号</label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="请输入手机号"
              className="w-full px-4 py-3 bg-white/10 border border-[#B08D57]/20 rounded-lg text-[#F7F5F0] placeholder-[#F7F5F0]/30 focus:border-[#B08D57] focus:outline-none touch-target text-base"
              autoComplete="tel"
              required
            />
          </div>

          <div>
            <label className="block text-sm text-[#F7F5F0]/70 mb-1.5">密码</label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="请输入密码"
                className="w-full px-4 py-3 pr-10 bg-white/10 border border-[#B08D57]/20 rounded-lg text-[#F7F5F0] placeholder-[#F7F5F0]/30 focus:border-[#B08D57] focus:outline-none touch-target text-base"
                autoComplete="current-password"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[#F7F5F0]/30 hover:text-[#F7F5F0]/60"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {error && (
            <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-[#B08D57] text-[#111] font-bold rounded-lg hover:bg-[#B08D57]/90 disabled:opacity-50 transition-colors touch-target text-base"
          >
            {loading ? "登录中..." : "登录"}
          </button>
        </form>

        <div className="mt-5 flex justify-center gap-4 text-sm text-[#F7F5F0]/50">
          <Link href="/" className="text-[#B08D57] hover:underline">返回首页</Link>
          <span className="text-[#B08D57]/30">|</span>
          <Link href="/admin/login" className="text-[#B08D57] hover:underline">管理员登录</Link>
        </div>
      </div>
    </div>
  );
}
