"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { apiFetch, ApiError } from "@/lib/api";
import { clearAccessToken } from "@/lib/auth";

type Classroom = {
  id: number;
  name: string;
  school_year?: string | null;
  subject?: string | null;
  grade_level?: string | null;
};

type ClassCreateRequest = {
  name: string;
  school_year?: string;
  subject?: string;
  grade_level?: string;
};

export default function DashboardPage() {
  const router = useRouter();
  const [items, setItems] = useState<Classroom[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [schoolYear, setSchoolYear] = useState("");
  const [subject, setSubject] = useState("");
  const [gradeLevel, setGradeLevel] = useState("");
  const [creating, setCreating] = useState(false);

  const canCreate = useMemo(() => name.trim().length > 0, [name]);

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
      setError(err instanceof Error ? err.message : "Không tải được danh sách lớp.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onLogout = () => {
    clearAccessToken();
    router.replace("/login");
  };

  const onCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canCreate) return;
    setCreating(true);
    setError(null);
    try {
      const payload: ClassCreateRequest = {
        name: name.trim(),
        school_year: schoolYear.trim() || undefined,
        subject: subject.trim() || undefined,
        grade_level: gradeLevel.trim() || undefined,
      };
      const created = await apiFetch<Classroom>("/classes", {
        method: "POST",
        body: JSON.stringify(payload),
      });
      setOpen(false);
      setName("");
      setSchoolYear("");
      setSubject("");
      setGradeLevel("");
      setItems((prev) => [created, ...prev]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Tạo lớp thất bại.");
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Lớp học</h1>
          <p className="text-sm text-muted-foreground">
            Tạo lớp và quản lý học sinh theo từng lớp.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger>
              <Button>Tạo lớp</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Tạo lớp mới</DialogTitle>
                <DialogDescription>
                  Thông tin có thể bổ sung sau. Tối thiểu cần tên lớp.
                </DialogDescription>
              </DialogHeader>

              <form className="space-y-4" onSubmit={onCreate}>
                <div className="space-y-2">
                  <Label htmlFor="name">Tên lớp *</Label>
                  <Input id="name" value={name} onChange={(e) => setName(e.target.value)} required />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label htmlFor="gradeLevel">Khối</Label>
                    <Input id="gradeLevel" value={gradeLevel} onChange={(e) => setGradeLevel(e.target.value)} placeholder="10" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="schoolYear">Năm học</Label>
                    <Input id="schoolYear" value={schoolYear} onChange={(e) => setSchoolYear(e.target.value)} placeholder="2025-2026" />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="subject">Môn học</Label>
                  <Input id="subject" value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="Toán" />
                </div>

                <div className="flex justify-end gap-2">
                  <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                    Huỷ
                  </Button>
                  <Button type="submit" disabled={!canCreate || creating}>
                    {creating ? "Đang tạo..." : "Tạo lớp"}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>

          <Button variant="outline" onClick={onLogout}>
            Đăng xuất
          </Button>
        </div>
      </div>

      {error && (
        <div className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </div>
      )}

      {loading ? (
        <div className="text-sm text-muted-foreground">Đang tải...</div>
      ) : items.length === 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>Chưa có lớp nào</CardTitle>
            <CardDescription>Hãy tạo lớp đầu tiên để bắt đầu nhập học sinh.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => setOpen(true)}>Tạo lớp</Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((c) => (
            <Link key={c.id} href={`/classes/${c.id}`} className="block">
              <Card className="h-full transition-colors hover:bg-accent/30">
                <CardHeader>
                  <CardTitle className="truncate">{c.name}</CardTitle>
                  <CardDescription className="truncate">
                    {[c.subject, c.grade_level ? `Khối ${c.grade_level}` : null, c.school_year].filter(Boolean).join(" • ")}
                  </CardDescription>
                </CardHeader>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

