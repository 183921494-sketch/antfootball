"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Search, UserCog, User, Shield, ArrowLeft, Plus, Trash2, Edit2, CheckCircle, XCircle } from "lucide-react";
import Link from "next/link";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

interface User {
  id: string;
  username: string;
  email: string;
  role: "admin" | "operator" | "viewer";
  is_active: boolean;
  last_login_at: string | null;
  created_at: string;
}

const ROLE_LABELS: Record<string, string> = {
  admin: "超级管理员",
  operator: "运营人员",
  viewer: "观察者",
};

const ROLE_COLORS: Record<string, "default" | "outline" | "destructive"> = {
  admin: "default",
  operator: "outline",
  viewer: "outline",
};

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);

  // Form state
  const [formData, setFormData] = useState<{
    username: string;
    email: string;
    password: string;
    role: "admin" | "operator" | "viewer";
  }>({
    username: "",
    email: "",
    password: "",
    role: "operator",
  });

  useEffect(() => { fetchUsers(); }, []);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/users?limit=100");
      if (res.ok) {
        const data = await res.json();
        setUsers(data.data || []);
      }
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  const handleCreate = async () => {
    try {
      const res = await fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });
      if (res.ok) {
        setShowCreate(false);
        resetForm();
        fetchUsers();
      }
    } catch (err) { console.error(err); }
  };

  const handleUpdate = async () => {
    if (!editingUser) return;
    try {
      const res = await fetch(`/api/users?id=${editingUser.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });
      if (res.ok) {
        setEditingUser(null);
        resetForm();
        fetchUsers();
      }
    } catch (err) { console.error(err); }
  };

  const handleDelete = async (userId: string) => {
    if (!confirm("确定要删除此用户吗？")) return;
    try {
      const res = await fetch(`/api/users?id=${userId}`, { method: "DELETE" });
      if (res.ok) fetchUsers();
    } catch (err) { console.error(err); }
  };

  const handleToggleActive = async (user: User) => {
    try {
      const res = await fetch(`/api/users?id=${user.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_active: !user.is_active }),
      });
      if (res.ok) fetchUsers();
    } catch (err) { console.error(err); }
  };

  const resetForm = () => {
    setFormData({ username: "", email: "", password: "", role: "operator" });
  };

  const openEdit = (user: User) => {
    setEditingUser(user);
    setFormData({
      username: user.username,
      email: user.email,
      password: "",
      role: user.role,
    });
  };

  const filtered = users.filter((u) =>
    !search || u.username.includes(search) || u.email.includes(search)
  );

  return (
    <div>
      {/* Header */}
      <div className="mb-4 md:mb-6">
        <div className="flex items-center gap-2 mb-1">
          <Link href="/admin/dashboard" className="text-muted-foreground hover:text-foreground md:hidden">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <h1 className="text-lg md:text-2xl font-bold">账号管理</h1>
        </div>
        <p className="text-xs md:text-sm text-muted-foreground">管理系统管理员账号</p>
      </div>

      {/* Search & Create */}
      <Card className="mb-4">
        <CardContent className="flex flex-col sm:flex-row gap-3 p-3 md:p-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="搜索用户名/邮箱..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 text-sm"
            />
          </div>
          <Dialog open={showCreate} onOpenChange={setShowCreate}>
            <DialogTrigger asChild>
              <Button className="touch-target">
                <Plus className="w-4 h-4 mr-1" /> 新建账号
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>新建管理员账号</DialogTitle>
              </DialogHeader>
              <div className="space-y-3 py-3">
                <div>
                  <label className="text-xs font-medium">用户名</label>
                  <Input
                    value={formData.username}
                    onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                    placeholder="请输入用户名"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium">邮箱</label>
                  <Input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="请输入邮箱"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium">密码</label>
                  <Input
                    type="password"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    placeholder="请输入密码（≥6位）"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium">角色</label>
                  <select
                    value={formData.role}
                    onChange={(e) => setFormData({ ...formData, role: e.target.value as any })}
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  >
                    <option value="operator">运营人员</option>
                    <option value="viewer">观察者</option>
                    <option value="admin">超级管理员</option>
                  </select>
                </div>
                <Button onClick={handleCreate} className="w-full touch-target">创建账号</Button>
              </div>
            </DialogContent>
          </Dialog>
        </CardContent>
      </Card>

      {/* Users Table/Cards */}
      <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
        {loading ? (
          Array.from({ length: 6 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="h-36 skeleton rounded-b-lg" />
            </Card>
          ))
        ) : filtered.length === 0 ? (
          <div className="col-span-full text-center py-12 text-muted-foreground">
            <UserCog className="w-8 h-8 mx-auto mb-2 opacity-30" />
            <p className="text-sm">暂无用户数据</p>
          </div>
        ) : (
          filtered.map((user) => (
            <Card key={user.id} className="hover:border-primary/50 transition-colors">
              <CardHeader className="p-4 pb-2">
                <div className="flex items-center justify-between">
                  <Badge variant={ROLE_COLORS[user.role] || "outline"} className="text-[10px]">
                    {ROLE_LABELS[user.role] || user.role}
                  </Badge>
                  {user.is_active ? (
                    <CheckCircle className="w-4 h-4 text-green-500" />
                  ) : (
                    <XCircle className="w-4 h-4 text-destructive" />
                  )}
                </div>
                <CardTitle className="text-sm md:text-base mt-1 truncate">{user.username}</CardTitle>
              </CardHeader>
              <CardContent className="p-4 pt-1 space-y-1.5 text-xs">
                <div className="text-muted-foreground">{user.email}</div>
                <div className="text-muted-foreground">
                  最后登录：{user.last_login_at ? new Date(user.last_login_at).toLocaleString() : "从未登录"}
                </div>
                <div className="flex gap-2 mt-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => openEdit(user)}
                    className="flex-1 touch-target text-xs"
                  >
                    <Edit2 className="w-3 h-3" />
                  </Button>
                  <Button
                    size="sm"
                    variant={user.is_active ? "destructive" : "outline"}
                    onClick={() => handleToggleActive(user)}
                    className="flex-1 touch-target text-xs"
                  >
                    {user.is_active ? "停用" : "启用"}
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleDelete(user.id)}
                    className="touch-target text-xs"
                  >
                    <Trash2 className="w-3 h-3 text-destructive" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Edit Dialog */}
      <Dialog open={!!editingUser} onOpenChange={(open) => !open && setEditingUser(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>编辑账号 - {editingUser?.username}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-3">
            <div>
              <label className="text-xs font-medium">用户名</label>
              <Input
                value={formData.username}
                onChange={(e) => setFormData({ ...formData, username: e.target.value })}
              />
            </div>
            <div>
              <label className="text-xs font-medium">邮箱</label>
              <Input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              />
            </div>
            <div>
              <label className="text-xs font-medium">新密码（留空不改）</label>
              <Input
                type="password"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                placeholder="留空表示不修改密码"
              />
            </div>
            <div>
              <label className="text-xs font-medium">角色</label>
              <select
                value={formData.role}
                onChange={(e) => setFormData({ ...formData, role: e.target.value as any })}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                <option value="operator">运营人员</option>
                <option value="viewer">观察者</option>
                <option value="admin">超级管理员</option>
              </select>
            </div>
            <Button onClick={handleUpdate} className="w-full touch-target">保存修改</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
