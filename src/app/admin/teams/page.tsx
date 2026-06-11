"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Trophy, Search, Edit, ArrowLeft } from "lucide-react";
import Link from "next/link";

interface Team {
  id: string;
  name: string;
  name_en: string;
  country: string;
  country_code: string;
  group_letter: string;
  msi_score: number;
  fifa_ranking: number;
  coach_name: string;
  tactical_formation: string;
}

export default function TeamsPage() {
  const router = useRouter();
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [groupFilter, setGroupFilter] = useState("");
  const [editingTeam, setEditingTeam] = useState<Team | null>(null);
  const [msiInput, setMsiInput] = useState("");

  useEffect(() => {
    fetchTeams();
  }, []);

  const fetchTeams = async (q = search, g = groupFilter) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ limit: "48" });
      if (q) params.set("search", q);
      if (g) params.set("group", g);
      const res = await fetch(`/api/teams?${params}`);
      const data = await res.json();
      setTeams(data.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (team: Team) => {
    setEditingTeam(team);
    setMsiInput(String(team.msi_score));
  };

  const handleSaveMSI = async () => {
    if (!editingTeam) return;
    try {
      const res = await fetch(`/api/teams`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: editingTeam.id, msi_score: parseFloat(msiInput) }),
      });
      if (res.ok) {
        setEditingTeam(null);
        fetchTeams();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const groups = ["A","B","C","D","E","F","G","H","I","J","K","L"];

  return (
    <div>
      {/* Header */}
      <div className="mb-4 md:mb-6">
        <div className="flex items-center gap-2 mb-1">
          <Link href="/admin/dashboard" className="text-muted-foreground hover:text-foreground md:hidden">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <h1 className="text-lg md:text-2xl font-bold">球队管理</h1>
        </div>
        <p className="text-xs md:text-sm text-muted-foreground">查看并管理48支世界杯参赛球队MSI评分</p>
      </div>

      {/* Edit modal */}
      {editingTeam && (
        <Card className="mb-4 border-primary">
          <CardHeader className="p-4 pb-2">
            <CardTitle className="text-base">编辑 MSI 评分 — {editingTeam.name}</CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-2 flex flex-wrap items-center gap-3">
            <label className="text-sm font-medium">MSI评分 (0-10):</label>
            <Input
              type="number"
              min="0"
              max="10"
              step="0.01"
              value={msiInput}
              onChange={(e) => setMsiInput(e.target.value)}
              className="w-28"
            />
            <Button size="sm" onClick={handleSaveMSI}>保存</Button>
            <Button size="sm" variant="outline" onClick={() => setEditingTeam(null)}>取消</Button>
          </CardContent>
        </Card>
      )}

      {/* Search & filter bar */}
      <Card className="mb-4">
        <CardContent className="flex flex-col sm:flex-row gap-3 p-3 md:p-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="搜索球队..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <div className="flex gap-2">
            <select
              value={groupFilter}
              onChange={(e) => { setGroupFilter(e.target.value); fetchTeams(search, e.target.value); }}
              className="rounded-md border border-input bg-background px-3 py-2 text-sm touch-target"
            >
              <option value="">全部组</option>
              {groups.map(g => <option key={g} value={g}>{g}组</option>)}
            </select>
            <Button variant="outline" size="sm" onClick={() => fetchTeams()} className="touch-target">
              搜索
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Teams grid - responsive */}
      <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {loading ? (
          Array.from({ length: 8 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="h-32 skeleton rounded-b-lg" />
            </Card>
          ))
        ) : teams.length === 0 ? (
          <div className="col-span-full text-center py-12 text-muted-foreground">
            <Trophy className="w-8 h-8 mx-auto mb-2 opacity-30" />
            <p className="text-sm">暂无球队数据</p>
          </div>
        ) : (
          teams.map((team) => (
            <Card key={team.id} className="hover:border-primary/50 transition-colors">
              <CardHeader className="p-4 pb-2">
                <div className="flex items-center justify-between">
                  <Badge variant="outline" className="text-[10px]">{team.group_letter}组</Badge>
                  <span className="text-[10px] text-muted-foreground">FIFA #{team.fifa_ranking}</span>
                </div>
                <CardTitle className="text-base mt-1">{team.name}</CardTitle>
                <p className="text-[10px] text-muted-foreground">{team.name_en}</p>
              </CardHeader>
              <CardContent className="p-4 pt-1">
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground text-xs">MSI评分</span>
                    <span className="font-bold text-primary">{Number(team.msi_score).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground text-xs">战术阵型</span>
                    <span className="text-xs">{team.tactical_formation}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground text-xs">主教练</span>
                    <span className="text-xs truncate ml-2">{team.coach_name}</span>
                  </div>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full mt-2 touch-target text-xs"
                  onClick={() => handleEdit(team)}
                >
                  <Edit className="w-3 h-3 mr-1" /> 编辑评分
                </Button>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
