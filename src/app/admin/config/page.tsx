"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Settings, Save, ArrowLeft } from "lucide-react";
import Link from "next/link";

interface Config { id: string; config_key: string; config_value: string; description: string; }

const MSI_WEIGHTS = [
  { key: "msi_weight_roster_depth", label: "阵容深度" },
  { key: "msi_weight_tactical_system", label: "战术体系" },
  { key: "msi_weight_key_player", label: "关键球员" },
  { key: "msi_weight_coach_decision", label: "教练决策" },
  { key: "msi_weight_matchup_data", label: "对阵数据" },
  { key: "msi_weight_mental_resilience", label: "心理意志" },
];

const COMMISSION_CONFIGS = [
  { key: "commission_rate_lottery_low", label: "彩票店低档 (≤1万)" },
  { key: "commission_rate_lottery_mid", label: "彩票店中档 (1-3万)" },
  { key: "commission_rate_lottery_high", label: "彩票店高档 (>3万)" },
  { key: "commission_rate_platform_low", label: "平台低档 (≤5万)" },
  { key: "commission_rate_platform_mid", label: "平台中档 (5-15万)" },
  { key: "commission_rate_platform_high", label: "平台高档 (>15万)" },
];

export default function ConfigPage() {
  const [configs, setConfigs] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => { fetchConfigs(); }, []);

  const fetchConfigs = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/config");
      if (res.ok) {
        const data = await res.json();
        const map: Record<string, string> = {};
        (data.data || []).forEach((c: Config) => { map[c.config_key] = c.config_value; });
        setConfigs(map);
      }
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  const handleSave = async (key: string, value: string) => {
    setSaving(true);
    try {
      const res = await fetch("/api/admin/config", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ config_key: key, config_value: value }),
      });
      if (res.ok) {
        setConfigs(prev => ({ ...prev, [key]: value }));
        setMessage("保存成功 ✓");
        setTimeout(() => setMessage(""), 2000);
      }
    } catch (err) { console.error(err); }
    finally { setSaving(false); }
  };

  if (loading) return <div className="py-20 text-center text-muted-foreground animate-pulse">加载中...</div>;

  return (
    <div>
      <div className="mb-4 md:mb-6">
        <div className="flex items-center gap-2 mb-1">
          <Link href="/admin/dashboard" className="text-muted-foreground hover:text-foreground md:hidden"><ArrowLeft className="w-5 h-5" /></Link>
          <h1 className="text-lg md:text-2xl font-bold">系统配置</h1>
        </div>
        <p className="text-xs md:text-sm text-muted-foreground">调整佣金比例和MSI模型权重</p>
      </div>

      {message && (
        <div className="mb-4 p-3 rounded-md bg-green-100 text-green-800 text-sm">{message}</div>
      )}

      {/* MSI Weights */}
      <Card className="mb-4">
        <CardHeader className="p-4 pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <Settings className="w-4 h-4" /> MSI模型权重
          </CardTitle>
          <p className="text-xs text-muted-foreground">总和应为1.00</p>
        </CardHeader>
        <CardContent className="p-4 pt-2">
          <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
            {MSI_WEIGHTS.map(({ key, label }) => (
              <div key={key} className="flex items-center gap-2">
                <label className="text-xs font-medium min-w-[60px] md:min-w-[80px]">{label}</label>
                <input
                  type="number" min="0" max="1" step="0.01"
                  value={configs[key] || "0"}
                  onChange={(e) => setConfigs(prev => ({ ...prev, [key]: e.target.value }))}
                  className="w-20 rounded-md border border-input bg-background px-2 py-1.5 text-sm touch-target"
                />
                <Button size="sm" variant="outline" onClick={() => handleSave(key, configs[key] || "0")} disabled={saving} className="touch-target px-2">
                  <Save className="w-3 h-3" />
                </Button>
              </div>
            ))}
          </div>
          <div className="mt-3 text-xs text-muted-foreground">
            权重总和：{MSI_WEIGHTS.reduce((sum, { key }) => sum + parseFloat(configs[key] || "0"), 0).toFixed(2)}
          </div>
        </CardContent>
      </Card>

      {/* Commission rates */}
      <Card>
        <CardHeader className="p-4 pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <Settings className="w-4 h-4" /> 佣金比例
          </CardTitle>
          <p className="text-xs text-muted-foreground">后置分佣比例（按基础收益分段）</p>
        </CardHeader>
        <CardContent className="p-4 pt-2">
          <div className="grid gap-3 grid-cols-1 sm:grid-cols-2">
            {COMMISSION_CONFIGS.map(({ key, label }) => (
              <div key={key} className="flex items-center gap-2">
                <label className="text-xs font-medium min-w-[120px] md:min-w-[140px]">{label}</label>
                <input
                  type="number" min="0" max="0.5" step="0.001"
                  value={configs[key] || "0"}
                  onChange={(e) => setConfigs(prev => ({ ...prev, [key]: e.target.value }))}
                  className="w-20 rounded-md border border-input bg-background px-2 py-1.5 text-sm touch-target"
                />
                <span className="text-xs text-muted-foreground w-12">
                  {(parseFloat(configs[key] || "0") * 100).toFixed(1)}%
                </span>
                <Button size="sm" variant="outline" onClick={() => handleSave(key, configs[key] || "0")} disabled={saving} className="touch-target px-2">
                  <Save className="w-3 h-3" />
                </Button>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
