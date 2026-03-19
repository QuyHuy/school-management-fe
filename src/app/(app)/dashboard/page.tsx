"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
      setError(err instanceof Error ? err.message : "Loi tai danh sach lop.");
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
      {/* Hero */}
      <div className="relative overflow-hidden rounded-xl border bg-gradient-to-r from-blue-600 to-indigo-600 p-6 text-white shadow-lg dark:from-blue-800 dark:to-indigo-800">
        <div className="relative z-10">
          <h1 className="text-2xl font-bold tracking-tight">Xin chao, giao vien!</h1>
          <p className="mt-1 text-blue-100">
            Quan ly lop hoc, hoc sinh va diem so tai day.
          </p>
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <ClassCreationWizard onCreated={(created) => setItems((prev) => [created, ...prev])} />
            <Badge variant="secondary" className="bg-white/20 text-white">
              {items.length} lop dang quan ly
            </Badge>
          </div>
        </div>
        {/* Decorative circles */}
        <div className="absolute -right-6 -top-6 h-32 w-32 rounded-full bg-white/10" />
        <div className="absolute -bottom-4 right-16 h-20 w-20 rounded-full bg-white/5" />
      </div>

      {/* KPI cards */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardDescription className="text-xs font-medium uppercase tracking-wide">Tong lop</CardDescription>
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-muted-foreground"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{loading ? "-" : items.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardDescription className="text-xs font-medium uppercase tracking-wide">Luong chuan</CardDescription>
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-muted-foreground"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><path d="m9 11 3 3L22 4"/></svg>
          </CardHeader>
          <CardContent>
            <p className="text-sm font-medium">Tao lop &rarr; Import CSV &rarr; Diem danh &rarr; Diem so</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardDescription className="text-xs font-medium uppercase tracking-wide">Meo</CardDescription>
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-muted-foreground"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/></svg>
          </CardHeader>
          <CardContent>
            <p className="text-sm font-medium">Import hoc sinh truoc khi diem danh va nhap diem</p>
          </CardContent>
        </Card>
      </div>

      {error && <div className="status-warn">{error}</div>}

      {/* Class list */}
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
            <CardTitle className="text-lg">Chua co lop nao</CardTitle>
            <CardDescription>
              Bam <strong>Tao lop moi</strong> o phia tren de bat dau.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex justify-center">
            <ClassCreationWizard onCreated={(created) => setItems((prev) => [created, ...prev])} />
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-lg font-semibold">Lop cua ban</h2>
            <Input
              placeholder="Tim theo ten lop, khoi, mon..."
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
                      {[c.subject, c.grade_level ? `Khoi ${c.grade_level}` : null, c.school_year].filter(Boolean).join(" \u2022 ") ||
                        "Chua cap nhat thong tin"}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <p className="text-xs text-muted-foreground">Vao lop &rarr; Hoc sinh, Buoi hoc, Diem so</p>
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
