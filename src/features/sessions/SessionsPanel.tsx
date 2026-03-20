"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { apiFetch } from "@/lib/api";

type ScheduleSlot = { id: number; weekday: number; start_time: string; end_time: string; note?: string | null };
type Session = {
  id: number; class_id: number; schedule_slot_id?: number | null;
  date: string; mode: string; start_time?: string | null; end_time?: string | null; note?: string | null;
};
type Student = { id: number; full_name: string };
type AttendanceEntry = { student_id: number; status: string; note?: string | null };

const WEEKDAYS: Record<number, string> = { 1: "CN", 2: "T2", 3: "T3", 4: "T4", 5: "T5", 6: "T6", 7: "T7" };

const MODE_CONFIG: Record<string, { label: string; color: string }> = {
  offline: { label: "Offline", color: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400" },
  online: { label: "Online", color: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400" },
  off: { label: "Nghỉ", color: "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400" },
};

type AssessmentType = { id: number; class_id: number; name: string; order: number };
type SessionGrade = { id: number; student_id: number; assessment_type_id: number; score: number; note: string | null };

const SCORE_LABELS = [
  { min: 0, max: 4.999, label: "Yếu" },
  { min: 5, max: 6.4, label: "Trung Bình" },
  { min: 6.5, max: 7.9, label: "Khá" },
  { min: 8.0, max: 10, label: "Giỏi" },
] as const;

function classifyScore(avg: number | null | undefined): string {
  if (avg === null || avg === undefined || Number.isNaN(avg)) return "—";
  for (const r of SCORE_LABELS) {
    if (avg >= r.min && avg <= r.max) return r.label;
  }
  return "—";
}

export function SessionsPanel({ classId, initialSessionId }: { classId: number; initialSessionId?: number }) {
  const [slots, setSlots] = useState<ScheduleSlot[]>([]);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);

  const [selectedSession, setSelectedSession] = useState<Session | null>(null);
  const [attendance, setAttendance] = useState<Record<number, string>>({});
  const [feedbackNote, setFeedbackNote] = useState("");
  const [meetDraft, setMeetDraft] = useState("");
  const [activeAction, setActiveAction] = useState<"attendance" | "meet" | "exam" | "feedback">("attendance");

  const [assessmentTypes, setAssessmentTypes] = useState<AssessmentType[]>([]);
  const [sessionGrades, setSessionGrades] = useState<SessionGrade[]>([]);

  const [examAssessmentTypeId, setExamAssessmentTypeId] = useState<number | null>(null);
  const [examSaving, setExamSaving] = useState(false);
  const [examNoteDraft, setExamNoteDraft] = useState<Record<number, string>>({});
  const [examScoreDraft, setExamScoreDraft] = useState<Record<number, string>>({});

  const [creatingType, setCreatingType] = useState(false);
  const [newTypeName, setNewTypeName] = useState("");

  const selectedSessionId = selectedSession?.id;

  const loadAll = useCallback(async () => {
    setLoading(true);
    try {
      const [sl, se, st] = await Promise.all([
        apiFetch<ScheduleSlot[]>(`/classes/${classId}/schedule-slots`),
        apiFetch<Session[]>(`/classes/${classId}/sessions`),
        apiFetch<Student[]>(`/classes/${classId}/students`),
      ]);
      setSlots(sl); setSessions(se); setStudents(st);
    } catch {
      toast.error("Không tải được dữ liệu");
    } finally {
      setLoading(false);
    }
  }, [classId]);

  useEffect(() => { void loadAll(); }, [loadAll]);

  useEffect(() => {
    if (!initialSessionId) return;
    const target = sessions.find((s) => s.id === initialSessionId) ?? null;
    setSelectedSession(target);
  }, [initialSessionId, sessions]);

  useEffect(() => {
    if (!selectedSession) return;
    setFeedbackNote(selectedSession.note || "");
    // Keep "Meet:" line in sync if present
    const meetLine = (selectedSession.note || "").split("\n").find((l) => l.trim().startsWith("Meet:"));
    setMeetDraft(meetLine ? meetLine.replace(/^Meet:\s*/i, "").trim() : "");

    const att: Record<number, string> = {};
    students.forEach((st) => { att[st.id] = "present"; });
    setAttendance(att);
  }, [selectedSession, students]);

  useEffect(() => {
    if (!selectedSessionId) return;
    void (async () => {
      try {
        const [types, grades] = await Promise.all([
          apiFetch<AssessmentType[]>(`/classes/${classId}/assessment-types`),
          apiFetch<SessionGrade[]>(`/classes/${classId}/sessions/${selectedSessionId}/grades`),
        ]);
        setAssessmentTypes(types);
        setSessionGrades(grades);
        setExamAssessmentTypeId((prev) => prev ?? (types[0] ? types[0].id : null));
      } catch {
        toast.error("Không tải được dữ liệu điểm/loại kiểm tra cho buổi học");
      }
    })();
  }, [classId, selectedSessionId]); // eslint-disable-line react-hooks/exhaustive-deps

  const examScoreForStudent = useMemo(() => {
    if (!examAssessmentTypeId) return {};
    const m: Record<number, number> = {};
    for (const g of sessionGrades) {
      if (g.assessment_type_id === examAssessmentTypeId) m[g.student_id] = g.score;
    }
    return m;
  }, [examAssessmentTypeId, sessionGrades]);

  useEffect(() => {
    if (!examAssessmentTypeId) return;
    const scores: Record<number, string> = {};
    for (const st of students) {
      const score = examScoreForStudent[st.id];
      scores[st.id] = score !== undefined ? String(score) : "";
    }
    setExamScoreDraft(scores);
  }, [examAssessmentTypeId]); // eslint-disable-line react-hooks/exhaustive-deps

  // Student average in current session (based on all grades already created in this session)
  // Important: this must be declared before any early return to keep hook ordering stable.
  const studentAverageById = useMemo(() => {
    const sums = new Map<number, { sum: number; count: number }>();
    for (const g of sessionGrades) {
      const cur = sums.get(g.student_id) ?? { sum: 0, count: 0 };
      cur.sum += g.score;
      cur.count += 1;
      sums.set(g.student_id, cur);
    }
    const avg = new Map<number, number>();
    for (const [sid, v] of sums.entries()) {
      avg.set(sid, v.count ? v.sum / v.count : 0);
    }
    return avg;
  }, [sessionGrades]);

  const onSaveAttendance = async () => {
    if (!selectedSessionId) return;
    try {
      const entries: AttendanceEntry[] = Object.entries(attendance).map(([sid, st]) => ({
        student_id: Number(sid),
        status: st,
      }));
      await apiFetch(`/sessions/${selectedSessionId}/attendance`, {
        method: "POST",
        body: JSON.stringify({ entries }),
      });
      toast.success("Đã lưu điểm danh.");
    } catch {
      toast.error("Lưu điểm danh thất bại.");
    }
  };

  const onSaveMeet = async () => {
    if (!selectedSessionId) return;
    try {
      // Store meet link inside session.note for now (meeting_url isn't in the model yet)
      const noteLines = (feedbackNote || "").split("\n").filter(Boolean);
      const withoutMeet = noteLines.filter((l) => !l.trim().startsWith("Meet:"));
      const meetLine = meetDraft.trim() ? `Meet: ${meetDraft.trim()}` : "";
      const next = [meetLine, ...withoutMeet].filter(Boolean).join("\n");
      await apiFetch(`/classes/${classId}/sessions/${selectedSessionId}`, {
        method: "PATCH",
        body: JSON.stringify({ note: next }),
      });
      setFeedbackNote(next);
      toast.success("Đã lưu link Meet (tạm thời trong note).");
    } catch {
      toast.error("Lưu link Meet thất bại.");
    }
  };

  const onCreateAssessmentType = async () => {
    if (!newTypeName.trim()) return;
    if (creatingType) return;
    setCreatingType(true);
    try {
      const created = await apiFetch<AssessmentType>(`/classes/${classId}/assessment-types`, {
        method: "POST",
        body: JSON.stringify({ name: newTypeName.trim(), order: 0 }),
      });
      setAssessmentTypes((prev) => [...prev, created]);
      setExamAssessmentTypeId(created.id);
      setNewTypeName("");
      toast.success("Đã thêm loại kiểm tra.");
    } catch {
      toast.error("Thêm loại kiểm tra thất bại.");
    } finally {
      setCreatingType(false);
    }
  };

  const onSaveExamGrades = async () => {
    if (!selectedSessionId) return;
    if (!examAssessmentTypeId) return;
    setExamSaving(true);
    try {
      const grades = students.map((st) => ({
        student_id: st.id,
        score: Number(examScoreDraft[st.id] || 0),
        note: examNoteDraft[st.id]?.trim() ? examNoteDraft[st.id].trim() : undefined,
      }));
      await apiFetch(`/classes/${classId}/sessions/${selectedSessionId}/grades`, {
        method: "POST",
        body: JSON.stringify({
          assessment_type_id: examAssessmentTypeId,
          grades,
        }),
      });
      toast.success("Đã lưu điểm kiểm tra.");
      const refreshed = await apiFetch<SessionGrade[]>(`/classes/${classId}/sessions/${selectedSessionId}/grades`);
      setSessionGrades(refreshed);
    } catch {
      toast.error("Lưu điểm kiểm tra thất bại.");
    } finally {
      setExamSaving(false);
    }
  };

  const onSaveFeedback = async () => {
    if (!selectedSessionId) return;
    try {
      await apiFetch(`/classes/${classId}/sessions/${selectedSessionId}`, {
        method: "PATCH",
        body: JSON.stringify({ note: feedbackNote }),
      });
      toast.success("Đã lưu nhận xét.");
    } catch {
      toast.error("Lưu nhận xét thất bại.");
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-28 animate-pulse rounded-xl bg-muted/60" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => <div key={i} className="h-24 animate-pulse rounded-xl bg-muted/60" />)}
        </div>
      </div>
    );
  }

  if (!selectedSession) {
    return (
      <div className="space-y-4">
        <Card className="border-dashed shadow-sm">
          <CardHeader className="items-center py-12 text-center">
            <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-muted">
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-muted-foreground"><rect width="18" height="18" x="3" y="4" rx="2" ry="2"/><line x1="16" x2="16" y1="2" y2="6"/><line x1="8" x2="8" y1="2" y2="6"/><line x1="3" x2="21" y1="10" y2="10"/></svg>
            </div>
            <CardTitle className="text-base">Chọn buổi học từ Dashboard</CardTitle>
            <CardDescription>Trang lớp này cần `sessionId` để hiển thị đúng buổi học.</CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  const selectedMode = MODE_CONFIG[selectedSession.mode] || MODE_CONFIG.offline;

  return (
    <div className="space-y-6">
      {/* Selected session */}
      <Card className="shadow-sm">
        <CardHeader>
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <CardTitle className="text-lg">Buổi học {selectedSession.date}</CardTitle>
              <CardDescription className="mt-1">
                {selectedSession.start_time?.slice(0, 5)}–{selectedSession.end_time?.slice(0, 5)} &bull;{" "}
                <span className="font-medium">{selectedMode.label}</span>
              </CardDescription>
            </div>
            <div className="flex flex-wrap gap-2">
              <Badge className={selectedMode.color}>{selectedMode.label}</Badge>
              <Badge variant="outline">{students.length} học sinh</Badge>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <Button variant={activeAction === "attendance" ? "default" : "outline"} size="sm" onClick={() => setActiveAction("attendance")}>
              Điểm danh
            </Button>
            <Button variant={activeAction === "meet" ? "default" : "outline"} size="sm" onClick={() => setActiveAction("meet")}>
              Tạo link Meet
            </Button>
            <Button variant={activeAction === "exam" ? "default" : "outline"} size="sm" onClick={() => setActiveAction("exam")}>
              Tạo kiểm tra
            </Button>
            <Button variant={activeAction === "feedback" ? "default" : "outline"} size="sm" onClick={() => setActiveAction("feedback")}>
              Tạo nhận xét
            </Button>
          </div>

          <div className="rounded-lg border bg-muted/20 p-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <p className="text-sm font-semibold">Điểm (theo các điểm đã nhập trong buổi)</p>
                <p className="text-xs text-muted-foreground">TB + xếp loại sẽ tự cập nhật sau khi lưu kiểm tra.</p>
              </div>
              <Badge variant="outline">{sessionGrades.length} bản ghi</Badge>
            </div>
            {students.length > 0 && sessionGrades.length > 0 ? (
              <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {students.map((st) => {
                  const avg = studentAverageById.get(st.id);
                  const label = classifyScore(avg);
                  return (
                    <div key={st.id} className="rounded-md border bg-card p-2">
                      <p className="truncate text-xs font-medium">{st.full_name}</p>
                      <p className="mt-1 text-sm font-semibold">
                        {avg !== undefined ? avg.toFixed(1) : "—"} <span className="text-xs text-muted-foreground">({label})</span>
                      </p>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="mt-3 text-sm text-muted-foreground">Chưa có điểm nào trong buổi này. Hãy bấm “Tạo kiểm tra”.</p>
            )}
          </div>

          {activeAction === "attendance" && (
            <div className="space-y-3">
              <h4 className="text-sm font-semibold">Điểm danh</h4>
              <div className="max-h-56 overflow-y-auto rounded-lg border">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/40">
                      <TableHead>Họ tên</TableHead>
                      <TableHead className="w-36">Trạng thái</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {students.map((st) => (
                      <TableRow key={st.id}>
                        <TableCell className="font-medium">{st.full_name}</TableCell>
                        <TableCell>
                          <Select
                            value={attendance[st.id] || "present"}
                            onValueChange={(v) => v && setAttendance((p) => ({ ...p, [st.id]: v }))}
                          >
                            <SelectTrigger className="h-8 text-xs">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="present">Có mặt</SelectItem>
                              <SelectItem value="absent">Vắng</SelectItem>
                              <SelectItem value="late">Trễ</SelectItem>
                              <SelectItem value="excused">Có phép</SelectItem>
                            </SelectContent>
                          </Select>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              <div className="flex justify-end">
                <Button onClick={onSaveAttendance} disabled={!selectedSessionId}>
                  Lưu điểm danh
                </Button>
              </div>
            </div>
          )}

          {activeAction === "meet" && (
            <div className="space-y-3">
              <h4 className="text-sm font-semibold">Link học online (Google Meet)</h4>
              <p className="text-sm text-muted-foreground">
                Hiện tại link sẽ được lưu tạm trong <span className="font-medium">Ghi chú buổi học</span>.
              </p>
              <div className="space-y-2">
                <Label>Nhập link Google Meet</Label>
                <Input value={meetDraft} onChange={(e) => setMeetDraft(e.target.value)} placeholder="https://meet.google.com/..." />
              </div>
              <div className="flex justify-end">
                <Button variant="outline" onClick={onSaveMeet}>Lưu link Meet</Button>
              </div>
            </div>
          )}

          {activeAction === "exam" && (
            <div className="space-y-4">
              <div className="flex flex-wrap items-end justify-between gap-3">
                <div className="space-y-2">
                  <Label>Loại kiểm tra</Label>
                  <Select value={examAssessmentTypeId ? String(examAssessmentTypeId) : ""} onValueChange={(v) => v && setExamAssessmentTypeId(Number(v))}>
                    <SelectTrigger className="w-[280px]">
                      <SelectValue placeholder="Chọn loại kiểm tra" />
                    </SelectTrigger>
                    <SelectContent>
                      {assessmentTypes
                        .slice()
                        .sort((a, b) => a.order - b.order || a.id - b.id)
                        .map((t) => (
                          <SelectItem key={t.id} value={String(t.id)}>
                            {t.name}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-center gap-2">
                  <Input
                    value={newTypeName}
                    onChange={(e) => setNewTypeName(e.target.value)}
                    placeholder="Thêm loại kiểm tra (tùy chọn)"
                    className="w-[240px]"
                  />
                  <Button type="button" variant="outline" disabled={creatingType || !newTypeName.trim()} onClick={() => void onCreateAssessmentType()}>
                    {creatingType ? "Đang..." : "Thêm"}
                  </Button>
                </div>
              </div>

              {examAssessmentTypeId ? (
                <>
                  <div className="rounded-lg border">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-muted/40">
                          <TableHead>Họ tên</TableHead>
                          <TableHead className="w-[160px] text-right">Điểm</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {students.map((st) => {
                          const v = examScoreDraft[st.id];
                          const num = v ? Number(v) : NaN;
                          return (
                            <TableRow key={st.id}>
                              <TableCell className="font-medium">
                                {st.full_name}
                                <div className="mt-1 text-[12px] text-muted-foreground">
                                  TB buổi: {classifyScore(studentAverageById.get(st.id))}
                                </div>
                              </TableCell>
                              <TableCell className="text-right">
                                <Input
                                  inputMode="decimal"
                                  value={v ?? ""}
                                  onChange={(e) => setExamScoreDraft((p) => ({ ...p, [st.id]: e.target.value }))}
                                  className="ml-auto w-[120px]"
                                  placeholder="0-10"
                                />
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>
                  <div className="flex justify-end">
                    <Button disabled={examSaving} onClick={() => void onSaveExamGrades()}>
                      {examSaving ? "Đang lưu..." : "Lưu điểm kiểm tra"}
                    </Button>
                  </div>

                  <div className="space-y-2">
                    <h4 className="text-sm font-semibold">Điểm đã có trong buổi</h4>
                    <div className="rounded-lg border">
                      <Table>
                        <TableHeader>
                          <TableRow className="bg-muted/40">
                            <TableHead>Học sinh</TableHead>
                            <TableHead>Loại kiểm tra</TableHead>
                            <TableHead className="w-[120px] text-right">Điểm</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {sessionGrades.length === 0 ? (
                            <TableRow>
                              <TableCell colSpan={3} className="text-center text-muted-foreground">
                                Chưa có điểm nào trong buổi này.
                              </TableCell>
                            </TableRow>
                          ) : (
                            sessionGrades
                              .slice()
                              .sort((a, b) => a.student_id - b.student_id)
                              .map((g) => {
                                const at = assessmentTypes.find((t) => t.id === g.assessment_type_id);
                                return (
                                  <TableRow key={g.id}>
                                    <TableCell>{students.find((s) => s.id === g.student_id)?.full_name ?? g.student_id}</TableCell>
                                    <TableCell>{at?.name ?? `Loại #${g.assessment_type_id}`}</TableCell>
                                    <TableCell className="text-right">
                                      <span className={g.score < 5 ? "font-semibold text-destructive" : "font-semibold"}>
                                        {g.score}
                                      </span>
                                    </TableCell>
                                  </TableRow>
                                );
                              })
                          )}
                        </TableBody>
                      </Table>
                    </div>
                  </div>
                </>
              ) : (
                <p className="text-sm text-muted-foreground">Chọn hoặc tạo loại kiểm tra để nhập điểm.</p>
              )}
            </div>
          )}

          {activeAction === "feedback" && (
            <div className="space-y-3">
              <h4 className="text-sm font-semibold">Nhận xét buổi học</h4>
              <div className="space-y-2">
                <Label>Ghi chú</Label>
                <Textarea value={feedbackNote} onChange={(e) => setFeedbackNote(e.target.value)} placeholder="Nhận xét chung về buổi học..." rows={4} />
              </div>
              <div className="flex justify-end">
                <Button variant="outline" onClick={() => void onSaveFeedback()}>Lưu nhận xét</Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
