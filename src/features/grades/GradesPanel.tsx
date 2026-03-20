"use client";

import { useEffect, useMemo, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { apiFetch } from "@/lib/api";

type Student = { id: number; full_name: string };
type AssessmentType = { id: number; class_id: number; name: string; order: number };
type Grade = { id: number; student_id: number; assessment_type_id: number; date: string; score: number; note: string | null };
type GradeIdResponse = { id: number };

const LOW_SCORE_THRESHOLD = 5;

export function GradesPanel({ classId }: { classId: number }) {
  const [students, setStudents] = useState<Student[]>([]);
  const [types, setTypes] = useState<AssessmentType[]>([]);
  const [grades, setGrades] = useState<Grade[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [createTypeOpen, setCreateTypeOpen] = useState(false);
  const [typeName, setTypeName] = useState("");
  const [typeOrder, setTypeOrder] = useState("0");
  const [creatingType, setCreatingType] = useState(false);

  const [selectedStudentId, setSelectedStudentId] = useState<number | null>(null);
  const [history, setHistory] = useState<Grade[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  const [upserting, setUpserting] = useState(false);
  const [editTypeId, setEditTypeId] = useState<number | null>(null);
  const [editDate, setEditDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [editScore, setEditScore] = useState("");
  const [editNote, setEditNote] = useState("");

  const loadAll = async () => {
    setLoading(true); setError(null);
    try {
      const [s, t, g] = await Promise.all([
        apiFetch<Student[]>(`/classes/${classId}/students`),
        apiFetch<AssessmentType[]>(`/classes/${classId}/assessment-types`),
        apiFetch<Grade[]>(`/classes/${classId}/grades`),
      ]);
      setStudents(s); setTypes(t); setGrades(g);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Không tải được dữ liệu điểm.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void loadAll(); }, [classId]); // eslint-disable-line react-hooks/exhaustive-deps

  const gradeMap = useMemo(() => {
    const m = new Map<string, Grade>();
    for (const g of grades) m.set(`${g.student_id}:${g.assessment_type_id}`, g);
    return m;
  }, [grades]);

  const typeNameMap = useMemo(() => {
    const m = new Map<number, string>();
    for (const t of types) m.set(t.id, t.name);
    return m;
  }, [types]);

  const sortedTypes = useMemo(() => [...types].sort((a, b) => a.order - b.order || a.id - b.id), [types]);
  const selectedStudent = useMemo(() => students.find((s) => s.id === selectedStudentId) ?? null, [students, selectedStudentId]);

  const openStudent = async (studentId: number) => {
    setSelectedStudentId(studentId);
    setLoadingHistory(true); setHistory([]); setSuccess(null);
    try {
      setHistory(await apiFetch<Grade[]>(`/students/${studentId}/grades`));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Không tải được lịch sử điểm.");
    } finally {
      setLoadingHistory(false);
    }
  };

  const createAssessmentType = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!typeName.trim()) return;
    setCreatingType(true); setError(null); setSuccess(null);
    try {
      const created = await apiFetch<AssessmentType>(`/classes/${classId}/assessment-types`, {
        method: "POST",
        body: JSON.stringify({ name: typeName.trim(), order: Number(typeOrder) || 0 }),
      });
      setTypes((prev) => [...prev, created]);
      setCreateTypeOpen(false);
      setTypeName(""); setTypeOrder("0");
      setSuccess(`Đã thêm loại kiểm tra: ${created.name}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Tạo loại kiểm tra thất bại.");
    } finally {
      setCreatingType(false);
    }
  };

  const upsertGrade = async (studentId: number) => {
    if (!editTypeId || !editDate || !editScore) return;
    setUpserting(true); setError(null); setSuccess(null);
    try {
      void (await apiFetch<GradeIdResponse>(`/classes/${classId}/grades`, {
        method: "POST",
        body: JSON.stringify({
          student_id: studentId,
          assessment_type_id: editTypeId,
          date: editDate,
          score: Number(editScore),
          note: editNote.trim() || null,
        }),
      }));
      const [g, h] = await Promise.all([
        apiFetch<Grade[]>(`/classes/${classId}/grades`),
        apiFetch<Grade[]>(`/students/${studentId}/grades`),
      ]);
      setGrades(g); setHistory(h);
      setEditScore(""); setEditNote("");
      setSuccess("Đã lưu điểm thành công.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Lưu điểm thất bại.");
    } finally {
      setUpserting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold">Bảng điểm</h2>
          <p className="text-sm text-muted-foreground">Chọn học sinh để xem lịch sử và nhập điểm nhanh.</p>
        </div>
        <Dialog open={createTypeOpen} onOpenChange={setCreateTypeOpen}>
          <DialogTrigger>
            <Button variant="outline" size="sm">
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="mr-1.5"><path d="M5 12h14"/><path d="M12 5v14"/></svg>
              Thêm loại kiểm tra
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Thêm loại kiểm tra</DialogTitle>
              <DialogDescription>Ví dụ: Bài cũ, 15 phút, Giữa kỳ, Cuối kỳ...</DialogDescription>
            </DialogHeader>
            <form className="space-y-4" onSubmit={createAssessmentType}>
              <div className="space-y-2"><Label>Tên</Label><Input value={typeName} onChange={(e) => setTypeName(e.target.value)} placeholder="Kiểm tra 15 phút" /></div>
              <div className="space-y-2"><Label>Thứ tự hiển thị</Label><Input value={typeOrder} onChange={(e) => setTypeOrder(e.target.value)} placeholder="0" /></div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setCreateTypeOpen(false)}>Huỷ</Button>
                <Button type="submit" disabled={creatingType}>{creatingType ? "Đang tạo..." : "Tạo"}</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="flex items-center gap-2">
        <Badge className="bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400">Điểm thấp &lt; {LOW_SCORE_THRESHOLD}</Badge>
        <span className="text-xs text-muted-foreground">Các điểm thấp được tô đỏ để theo dõi nhanh.</span>
      </div>

      {error && <div className="status-warn">{error}</div>}
      {success && <div className="status-success">{success}</div>}

      {/* Grade table */}
      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-12 animate-pulse rounded-lg bg-muted/60" />)}
        </div>
      ) : students.length === 0 ? (
        <Card className="border-dashed shadow-sm">
          <CardHeader className="items-center py-12 text-center">
            <CardTitle className="text-base">Chưa có học sinh</CardTitle>
            <CardDescription>Hãy import CSV học sinh trước.</CardDescription>
          </CardHeader>
        </Card>
      ) : sortedTypes.length === 0 ? (
        <Card className="border-dashed shadow-sm">
          <CardHeader className="items-center py-12 text-center">
            <CardTitle className="text-base">Chưa có loại kiểm tra</CardTitle>
            <CardDescription>Hãy thêm ít nhất 1 loại kiểm tra để nhập điểm.</CardDescription>
          </CardHeader>
        </Card>
      ) : (
        <Card className="shadow-sm">
          <CardContent className="p-0">
            <ScrollArea className="w-full">
              <div className="min-w-[860px]">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/40">
                      <TableHead className="sticky left-0 z-10 w-[260px] bg-muted/40 font-semibold">Học sinh</TableHead>
                      {sortedTypes.map((t) => <TableHead key={t.id} className="text-center font-semibold">{t.name}</TableHead>)}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {students.map((s) => (
                      <TableRow key={s.id} className="cursor-pointer hover:bg-accent/40" onClick={() => void openStudent(s.id)}>
                        <TableCell className="sticky left-0 z-10 bg-card font-medium">{s.full_name}</TableCell>
                        {sortedTypes.map((t) => {
                          const g = gradeMap.get(`${s.id}:${t.id}`);
                          const low = g ? g.score < LOW_SCORE_THRESHOLD : false;
                          return (
                            <TableCell key={t.id} className="text-center">
                              {g ? (
                                <span className={`inline-flex h-8 w-8 items-center justify-center rounded-md text-sm font-semibold ${low ? "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400" : ""}`}>
                                  {g.score}
                                </span>
                              ) : (
                                <span className="text-muted-foreground">—</span>
                              )}
                            </TableCell>
                          );
                        })}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      )}

      {/* Student grade history & quick entry */}
      {selectedStudent && (
        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle className="text-base">Lịch sử điểm: {selectedStudent.full_name}</CardTitle>
            <CardDescription>Nhập điểm nhanh theo loại kiểm tra và ngày.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="grid gap-4 sm:grid-cols-4">
              <div className="space-y-2">
                <Label>Loại kiểm tra</Label>
                <Select value={editTypeId ? String(editTypeId) : ""} onValueChange={(v) => v && setEditTypeId(Number(v) || null)}>
                  <SelectTrigger><SelectValue placeholder="Chọn..." /></SelectTrigger>
                  <SelectContent>{sortedTypes.map((t) => <SelectItem key={t.id} value={String(t.id)}>{t.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-2"><Label>Ngày</Label><Input type="date" value={editDate} onChange={(e) => setEditDate(e.target.value)} /></div>
              <div className="space-y-2"><Label>Điểm</Label><Input value={editScore} onChange={(e) => setEditScore(e.target.value)} placeholder="7.5" /></div>
              <div className="space-y-2"><Label>Nhận xét</Label><Input value={editNote} onChange={(e) => setEditNote(e.target.value)} placeholder="Tuỳ chọn..." /></div>
            </div>
            <div className="flex justify-end">
              <Button disabled={upserting} onClick={() => void upsertGrade(selectedStudent.id)}>
                {upserting ? "Đang lưu..." : "Lưu điểm"}
              </Button>
            </div>
            <div className="overflow-hidden rounded-lg border">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/40">
                    <TableHead className="w-[130px] font-semibold">Ngày</TableHead>
                    <TableHead className="w-[190px] font-semibold">Loại kiểm tra</TableHead>
                    <TableHead className="w-[100px] text-right font-semibold">Điểm</TableHead>
                    <TableHead className="font-semibold">Ghi chú</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loadingHistory ? (
                    <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground">Đang tải...</TableCell></TableRow>
                  ) : history.length === 0 ? (
                    <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground">Chưa có điểm.</TableCell></TableRow>
                  ) : (
                    history.map((h) => (
                      <TableRow key={h.id}>
                        <TableCell>{h.date}</TableCell>
                        <TableCell>{typeNameMap.get(h.assessment_type_id) ?? `Loại #${h.assessment_type_id}`}</TableCell>
                        <TableCell className="text-right">
                          <span className={`inline-flex h-7 w-7 items-center justify-center rounded text-sm font-semibold ${h.score < LOW_SCORE_THRESHOLD ? "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400" : ""}`}>
                            {h.score}
                          </span>
                        </TableCell>
                        <TableCell className="text-muted-foreground">{h.note ?? ""}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
