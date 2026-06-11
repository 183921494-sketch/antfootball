"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Handshake, Search, Phone, Building, CheckCircle, XCircle, ArrowLeft } from "lucide-react";
import Link from "next/link";

interface Partner {
  id: string;
  phone: string;
  company_name: string;
  contact_person: string;
  partner_type: string;
  city: string;
  province: string;
  is_verified: boolean;
  is_active: boolean;
  created_at: string;
}

const TYPE_LABELS: Record<string, string> = {
  lottery_shop: "彩票店",
  platform: "线上平台",
};

export default function PartnersPage() {
  const [partners, setPartners] = useState<Partner[]>([]);
  const [loading, setLoading] = useState(true);
  const [typeFilter, setTypeFilter] = useState("");
  const [search, setSearch] = useState("");

  useEffect(() => {
    fetchPartners();
  }, [typeFilter]);

  const fetchPartners = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ limit: "50" });
      if (typeFilter) params.set("userType", typeFilter);
      const res = await fetch(`/api/partners?${params}`);
      const data = await res.json();
      setPartners(data.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleVerified = async (partner: Partner) => {
    try {
      const res = await fetch(`/api/partners?id=${partner.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_verified: !partner.is_verified }),
      });
      if (res.ok) fetchPartners();
    } catch (err) {
      console.error(err);
    }
  };

  const handleToggleActive = async (partner: Partner) => {
    try {
      const res = await fetch(`/api/partners?id=${partner.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_active: !partner.is_active }),
      });
      if (res.ok) fetchPartners();
    } catch (err) {
      console.error(err);
    }
  };

  const filtered = partners.filter((p) =>
    !search || p.company_name.includes(search) || p.phone.includes(search)
  );

  return (
    <div>
      {/* Header */}
      <div className="mb-4 md:mb-6">
        <div className="flex items-center gap-2 mb-1">
          <Link href="/admin/dashboard" className="text-muted-foreground hover:text-foreground md:hidden">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <h1 className="text-lg md:text-2xl font-bold">合作方管理</h1>
        </div>
        <p className="text-xs md:text-sm text-muted-foreground">管理彩票店和线上预测平台合作方</p>
      </div>

      {/* Search & filter */}
      <Card className="mb-4">
        <CardContent className="flex flex-col sm:flex-row gap-3 p-3 md:p-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              placeholder="搜索公司/手机号..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-md border border-input bg-background pl-9 px-3 py-2 text-sm touch-target"
            />
          </div>
          <div className="flex gap-2">
            <Button variant={typeFilter === "" ? "default" : "outline"} size="sm" onClick={() => setTypeFilter("")} className="touch-target">全部</Button>
            <Button variant={typeFilter === "lottery_shop" ? "default" : "outline"} size="sm" onClick={() => setTypeFilter("lottery_shop")} className="touch-target">彩票店</Button>
            <Button variant={typeFilter === "platform" ? "default" : "outline"} size="sm" onClick={() => setTypeFilter("platform")} className="touch-target">平台</Button>
          </div>
        </CardContent>
      </Card>

      {/* Partner cards */}
      <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
        {loading ? (
          Array.from({ length: 6 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="h-40 skeleton rounded-b-lg" />
            </Card>
          ))
        ) : filtered.length === 0 ? (
          <div className="col-span-full text-center py-12 text-muted-foreground">
            <Handshake className="w-8 h-8 mx-auto mb-2 opacity-30" />
            <p className="text-sm">暂无合作方数据</p>
          </div>
        ) : (
          filtered.map((partner) => (
            <Card key={partner.id} className="hover:border-primary/50 transition-colors">
              <CardHeader className="p-4 pb-2">
                <div className="flex items-center justify-between">
                  <Badge variant={partner.partner_type === "lottery_shop" ? "outline" : "default"} className="text-[10px]">
                    {TYPE_LABELS[partner.partner_type] || partner.partner_type}
                  </Badge>
                  {partner.is_verified ? (
                    <CheckCircle className="w-4 h-4 text-green-500" />
                  ) : (
                    <XCircle className="w-4 h-4 text-destructive" />
                  )}
                </div>
                <CardTitle className="text-sm md:text-base mt-1 truncate">{partner.company_name}</CardTitle>
              </CardHeader>
              <CardContent className="p-4 pt-1 space-y-1.5 text-sm">
                <div className="flex items-center gap-2 text-muted-foreground text-xs">
                  <Phone className="w-3 h-3 shrink-0" />
                  <span>{partner.phone}</span>
                </div>
                <div className="flex items-center gap-2 text-muted-foreground text-xs">
                  <Building className="w-3 h-3 shrink-0" />
                  <span>{partner.province} {partner.city}</span>
                </div>
                <div className="flex items-center gap-2 text-muted-foreground text-xs">
                  <Handshake className="w-3 h-3 shrink-0" />
                  <span>{partner.contact_person}</span>
                </div>
                <div className="flex gap-2 mt-2">
                  <Button
                    size="sm"
                    variant={partner.is_verified ? "outline" : "default"}
                    onClick={() => handleToggleVerified(partner)}
                    className="flex-1 touch-target text-xs"
                  >
                    {partner.is_verified ? "取消认证" : "认证"}
                  </Button>
                  <Button
                    size="sm"
                    variant={partner.is_active ? "destructive" : "outline"}
                    onClick={() => handleToggleActive(partner)}
                    className="flex-1 touch-target text-xs"
                  >
                    {partner.is_active ? "停用" : "启用"}
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
