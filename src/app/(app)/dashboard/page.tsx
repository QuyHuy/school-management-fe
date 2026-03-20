"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { apiFetch, ApiError } from "@/lib/api";
import { clearAccessToken } from "@/lib/auth";
import { ClassCreationWizard } from "@/features/classes/ClassCreationWizard";

type Classroom = {
  id: number;
  name: string;
  school_year?: string | null;
  subject?: string | null;
  grade_level?: string | null;
};

export default function DashboardPage() {
  const router = useRouter();
  const [items, setItems] = useState<Classroom[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiFetch<Classroom[]>("/classes");
      setItems(data);
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        clearAccessToken();
        router.replace("/login");
        return;
      }
      setError(err instanceof Error ? err.message : "Lỗi tải danh sách lớp.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filteredItems = useMemo(() => {
    if (!search.trim()) return items;
    const q = search.toLowerCase();
    return items.filter((c) => [c.name, c.subject, c.grade_level, c.school_year].filter(Boolean).join(" ").toLowerCase().includes(q));
  }, [items, search]);

  return (
    <div className="space-y-6">
      <div className="relative overflow-hidden rounded-2xl border border-primary/20 bg-gradient-to-r from-indigo-600 via-violet-600 to-blue-600 p-6 text-white shadow-xl">
        <div className="relative z-10">
          <h1 className="text-2xl font-bold tracking-tight md:text-3xl">Xin chào, giáo viên!</h1>
          <p className="mt-1 text-blue-100">
            Quản lý lớp học, học sinh và điểm số theo quy trình rõ ràng, trực quan.
          </p>
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <ClassCreationWizard onCreated={(created) => setItems((prev) => [created, ...prev])} />
            <Badge variant="secondary" className="bg-white/20 text-white">
              {items.length} lớp đang quản lý
            </Badge>
          </div>
        </div>
        <div className="absolute -right-6 -top-6 h-32 w-32 rounded-full bg-white/10" />
        <div className="absolute -bottom-4 right-16 h-20 w-20 rounded-full bg-white/5" />
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardDescription className="text-xs font-medium uppercase tracking-wide">Tổng lớp</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{loading ? "-" : items.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="text-xs font-medium uppercase tracking-wide">Luồng chuẩn</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm font-medium">Tạo lớp → Import CSV → Điểm danh → Điểm số</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="text-xs font-medium uppercase tracking-wide">Mẹo</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm font-medium">Nên import học sinh trước khi điểm danh và nhập điểm</p>
          </CardContent>
        </Card>
      </div>

      {error && <div className="status-warn">{error}</div>}

      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, idx) => (
            <Card key={idx} className="h-[136px] animate-pulse">
              <CardHeader>
                <div className="h-4 w-3/4 rounded bg-muted" />
                <div className="h-3 w-2/3 rounded bg-muted" />
              </CardHeader>
            </Card>
          ))}
        </div>
      ) : items.length === 0 ? (
        <Card className="border-dashed">
          <CardHeader className="text-center">
            <CardTitle className="text-lg">Chưa có lớp nào</CardTitle>
            <CardDescription>
              Bấm <strong>Tạo lớp mới</strong> ở phía trên để bắt đầu.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex justify-center">
            <ClassCreationWizard onCreated={(created) => setItems((prev) => [created, ...prev])} />
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-lg font-semibold">Lớp của bạn</h2>
            <Input
              placeholder="Tìm theo tên lớp, khối, môn..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="max-w-sm"
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filteredItems.map((c) => (
              <Link key={c.id} href={`/classes/${c.id}`} className="group block">
                <Card className="h-full transition-all group-hover:-translate-y-0.5 group-hover:border-primary/40 group-hover:shadow-md">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between gap-2">
                      <CardTitle className="truncate text-base">{c.name}</CardTitle>
                      <Badge variant="outline" className="shrink-0 text-xs">#{c.id}</Badge>
                    </div>
                    <CardDescription className="truncate text-xs">
                      {[c.subject, c.grade_level ? `Khối ${c.grade_level}` : null, c.school_year].filter(Boolean).join(" • ") ||
                        "Chưa cập nhật thông tin"}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <p className="text-xs text-muted-foreground">Vào lớp → Học sinh, Buổi học, Điểm số</p>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
