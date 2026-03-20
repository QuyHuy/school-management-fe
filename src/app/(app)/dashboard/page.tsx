"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
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
      setItems(await apiFetch<Classroom[]>("/classes"));
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

  useEffect(() => { void load(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const filteredItems = useMemo(() => {
    if (!search.trim()) return items;
    const q = search.toLowerCase();
    return items.filter((c) =>
      [c.name, c.subject, c.grade_level, c.school_year].filter(Boolean).join(" ").toLowerCase().includes(q),
    );
  }, [items, search]);

  return (
    <div className="space-y-8">
      {/* ── Hero ── */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-indigo-600 via-violet-600 to-purple-700 px-8 py-10 text-white shadow-xl shadow-indigo-500/20 dark:shadow-indigo-900/30">
        <div className="relative z-10 max-w-xl">
          <p className="text-sm font-medium text-indigo-200">Xin chào, giáo viên 👋</p>
          <h1 className="mt-1 text-3xl font-bold leading-tight">Quản lý lớp học của bạn</h1>
          <p className="mt-2 text-[15px] leading-relaxed text-indigo-100/80">
            Tạo lớp, import học sinh, điểm danh và nhập điểm — tất cả trong một nơi.
          </p>
          <div className="mt-6 flex flex-wrap items-center gap-3">
            <ClassCreationWizard onCreated={(c) => setItems((prev) => [c, ...prev])} />
          </div>
        </div>
        <div className="absolute -right-8 -top-8 h-48 w-48 rounded-full bg-white/10 blur-2xl" />
        <div className="absolute -bottom-10 right-20 h-32 w-32 rounded-full bg-white/5 blur-xl" />
      </div>

      {/* ── Stats ── */}
      <div className="grid gap-5 sm:grid-cols-3">
        <Card className="shadow-sm">
          <CardHeader className="pb-2">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Tổng lớp</p>
          </CardHeader>
          <CardContent>
            <p className="text-4xl font-bold tracking-tight text-foreground">{loading ? "—" : items.length}</p>
          </CardContent>
        </Card>
        <Card className="shadow-sm">
          <CardHeader className="pb-2">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Luồng chuẩn</p>
          </CardHeader>
          <CardContent>
            <p className="text-sm leading-relaxed text-muted-foreground">Tạo lớp → Import CSV → Điểm danh → Điểm số</p>
          </CardContent>
        </Card>
        <Card className="shadow-sm">
          <CardHeader className="pb-2">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Mẹo</p>
          </CardHeader>
          <CardContent>
            <p className="text-sm leading-relaxed text-muted-foreground">Nên import học sinh trước khi điểm danh và nhập điểm</p>
          </CardContent>
        </Card>
      </div>

      {error && <div className="status-warn">{error}</div>}

      {/* ── Class list ── */}
      {loading ? (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-36 animate-pulse rounded-xl border border-border/50 bg-card" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="flex flex-col items-center gap-4 rounded-2xl border-2 border-dashed border-border/60 py-16 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-muted">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-muted-foreground"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg>
          </div>
          <div>
            <p className="text-lg font-semibold">Chưa có lớp nào</p>
            <p className="mt-1 text-sm text-muted-foreground">Bấm &quot;Tạo lớp mới&quot; để bắt đầu.</p>
          </div>
          <ClassCreationWizard onCreated={(c) => setItems((prev) => [c, ...prev])} />
        </div>
      ) : (
        <>
          <div className="flex items-center justify-between gap-4">
            <h2 className="text-lg font-semibold">Lớp của bạn</h2>
            <Input
              placeholder="Tìm theo tên lớp, khối, môn..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="max-w-xs"
            />
          </div>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {filteredItems.map((c) => (
              <Link key={c.id} href={`/classes/${c.id}`} className="group block">
                <Card className="h-full shadow-sm transition-all duration-200 group-hover:-translate-y-1 group-hover:shadow-lg group-hover:shadow-primary/10">
                  <CardHeader className="pb-2">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-sm font-bold text-primary">
                        {c.name.slice(0, 2).toUpperCase()}
                      </div>
                      <Badge variant="secondary" className="text-xs font-normal">#{c.id}</Badge>
                    </div>
                    <p className="mt-3 text-base font-semibold leading-tight">{c.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {[c.subject, c.grade_level ? `Khối ${c.grade_level}` : null, c.school_year].filter(Boolean).join(" • ") ||
                        "Chưa cập nhật thông tin"}
                    </p>
                  </CardHeader>
                  <CardContent>
                    <p className="text-xs text-muted-foreground">Vào lớp → Học sinh · Buổi học · Điểm số</p>
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
