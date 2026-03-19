"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { Badge } from "@/components/ui/badge";
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
    <div className="space-y-6">
      <Card className="border-none bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg">
        <CardHeader>
          <CardTitle className="text-2xl">Quản lý lớp học nhanh và rõ ràng</CardTitle>
          <CardDescription className="text-blue-100">
            Bắt đầu từ tạo lớp, sau đó vào từng lớp để import học sinh, điểm danh và nhập điểm.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex gap-2">
            <Badge variant="secondary">{items.length} lớp đang quản lý</Badge>
            <Badge variant="secondary">Luồng chuẩn: Tạo lớp → Import → Điểm danh → Điểm số</Badge>
          </div>
          <div className="flex items-center gap-2">
            <Dialog open={open} onOpenChange={setOpen}>
              <DialogTrigger>
                <Button variant="secondary">Tạo lớp mới</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Tạo lớp mới</DialogTitle>
                  <DialogDescription>
                    Chỉ cần tên lớp là có thể bắt đầu. Các thông tin khác có thể bổ sung sau.
                  </DialogDescription>
                </DialogHeader>

                <form className="space-y-4" onSubmit={onCreate}>
                  <div className="space-y-2">
                    <Label htmlFor="name">Tên lớp *</Label>
                    <Input id="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Ví dụ: 10A1" required />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label htmlFor="gradeLevel">Khối</Label>
                      <Input id="gradeLevel" value={gradeLevel} onChange={(e) => setGradeLevel(e.target.value)} placeholder="10" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="schoolYear">Năm học</Label>
                      <Input id="schoolYear" value={schoolYear} onChange={(e) => setSchoolYear(e.target.value)} placeholder="2026-2027" />
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
            <Button variant="outline" className="bg-white/15 text-white hover:bg-white/25" onClick={onLogout}>
              Đăng xuất
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-3 sm:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Tổng lớp</CardDescription>
            <CardTitle>{items.length}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Tiến trình gợi ý</CardDescription>
            <CardTitle className="text-base">1) Tạo lớp 2) Import CSV</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Nhắc nhanh</CardDescription>
            <CardTitle className="text-base">Nên import trước khi điểm danh/nhập điểm</CardTitle>
          </CardHeader>
        </Card>
      </div>

      {error && <div className="status-warn">{error}</div>}

      {loading ? (
        <div className="status-info">Đang tải danh sách lớp...</div>
      ) : items.length === 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>Chưa có lớp nào</CardTitle>
            <CardDescription>
              Bấm <strong>Tạo lớp mới</strong> ở phía trên để bắt đầu. Sau khi tạo lớp, bạn có thể vào lớp để import CSV học sinh.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => setOpen(true)}>Tạo lớp đầu tiên</Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((c) => (
            <Link key={c.id} href={`/classes/${c.id}`} className="block">
              <Card className="h-full border transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md">
                <CardHeader>
                  <div className="flex items-start justify-between gap-2">
                    <CardTitle className="truncate">{c.name}</CardTitle>
                    <Badge variant="outline">Lớp #{c.id}</Badge>
                  </div>
                  <CardDescription className="truncate">
                    {[c.subject, c.grade_level ? `Khối ${c.grade_level}` : null, c.school_year].filter(Boolean).join(" • ") ||
                      "Chưa cập nhật thông tin môn/khối/năm học"}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-sm text-muted-foreground">Mở lớp để import học sinh, điểm danh và quản lý điểm.</div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
