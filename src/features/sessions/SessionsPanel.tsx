"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
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

export function SessionsPanel({ classId }: { classId: number }) {
  const [slots, setSlots] = useState<ScheduleSlot[]>([]);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);

  const [createOpen, setCreateOpen] = useState(false);
  const [selSlot, setSelSlot] = useState("");
  const [selDate, setSelDate] = useState("");
  const [selMode, setSelMode] = useState("offline");
  const [creating, setCreating] = useState(false);

  const [addSlotOpen, setAddSlotOpen] = useState(false);
  const [slotWeekday, setSlotWeekday] = useState("2");
  const [slotStart, setSlotStart] = useState("19:00");
  const [slotEnd, setSlotEnd] = useState("20:30");
  const [addingSlot, setAddingSlot] = useState(false);

  const [activeSession, setActiveSession] = useState<Session | null>(null);
  const [attendance, setAttendance] = useState<Record<number, string>>({});
  const [sessionNote, setSessionNote] = useState("");
  const [saving, setSaving] = useState(false);

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

  const onAddSlot = async (e: React.FormEvent) => {
    e.preventDefault();
    setAddingSlot(true);
    try {
      await apiFetch(`/classes/${classId}/schedule-slots`, {
        method: "POST",
        body: JSON.stringify({ weekday: Number(slotWeekday), start_time: slotStart, end_time: slotEnd }),
      });
      toast.success("Đã thêm lịch học");
      setAddSlotOpen(false);
      void loadAll();
    } catch {
      toast.error("Thêm lịch thất bại");
    } finally {
      setAddingSlot(false);
    }
  };

  const onCreateSession = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selSlot || !selDate) return;
    setCreating(true);
    try {
      await apiFetch(`/classes/${classId}/sessions`, {
        method: "POST",
        body: JSON.stringify({ schedule_slot_id: Number(selSlot), date: selDate, mode: selMode }),
      });
      toast.success("Đã tạo buổi học");
      setCreateOpen(false);
      setSelSlot(""); setSelDate("");
      void loadAll();
    } catch {
      toast.error("Tạo buổi học thất bại");
    } finally {
      setCreating(false);
    }
  };

  const openSession = (s: Session) => {
    setActiveSession(s);
    setSessionNote(s.note || "");
    const att: Record<number, string> = {};
    students.forEach((st) => { att[st.id] = "present"; });
    setAttendance(att);
  };

  const onSaveSession = async () => {
    if (!activeSession) return;
    setSaving(true);
    try {
      const entries: AttendanceEntry[] = Object.entries(attendance).map(([sid, st]) => ({
        student_id: Number(sid), status: st,
      }));
      await apiFetch(`/sessions/${activeSession.id}/attendance`, {
        method: "POST",
        body: JSON.stringify({ entries }),
      });
      if (sessionNote !== (activeSession.note || "")) {
        await apiFetch(`/classes/${classId}/sessions/${activeSession.id}`, {
          method: "PATCH",
          body: JSON.stringify({ note: sessionNote }),
        });
      }
      toast.success("Đã lưu buổi học");
      setActiveSession(null);
      void loadAll();
    } catch {
      toast.error("Lưu thất bại");
    } finally {
      setSaving(false);
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

  return (
    <div className="space-y-6">
      {/* Schedule slots */}
      <Card className="shadow-sm">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base">Lịch học hằng tuần</CardTitle>
              <CardDescription className="mt-1">Định nghĩa các khung giờ cố định. Buổi học sẽ được tạo từ lịch này.</CardDescription>
            </div>
            <Button size="sm" variant="outline" onClick={() => setAddSlotOpen(true)}>
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="mr-1.5"><path d="M5 12h14"/><path d="M12 5v14"/></svg>
              Thêm lịch
            </Button>
          </div>
        </CardHeader>
        {slots.length > 0 && (
          <CardContent className="pt-0">
            <div className="flex flex-wrap gap-2">
              {slots.map((sl) => (
                <div key={sl.id} className="inline-flex items-center gap-1.5 rounded-lg border bg-muted/40 px-3 py-1.5 text-sm font-medium">
                  <span className="text-primary">{WEEKDAYS[sl.weekday]}</span>
                  <span className="text-muted-foreground">{sl.start_time?.slice(0, 5)}–{sl.end_time?.slice(0, 5)}</span>
                </div>
              ))}
            </div>
          </CardContent>
        )}
      </Card>

      {/* Sessions header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Các buổi học</h3>
          <p className="text-sm text-muted-foreground">{sessions.length} buổi</p>
        </div>
        <Button size="sm" onClick={() => setCreateOpen(true)} disabled={slots.length === 0}>
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="mr-1.5"><path d="M5 12h14"/><path d="M12 5v14"/></svg>
          Tạo buổi học
        </Button>
      </div>

      {sessions.length === 0 ? (
        <Card className="border-dashed shadow-sm">
          <CardHeader className="items-center py-12 text-center">
            <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-muted">
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-muted-foreground"><rect width="18" height="18" x="3" y="4" rx="2" ry="2"/><line x1="16" x2="16" y1="2" y2="6"/><line x1="8" x2="8" y1="2" y2="6"/><line x1="3" x2="21" y1="10" y2="10"/></svg>
            </div>
            <CardTitle className="text-base">Chưa có buổi học</CardTitle>
            <CardDescription>{slots.length === 0 ? "Thêm lịch học trước, sau đó tạo buổi học." : "Bấm 'Tạo buổi học' để bắt đầu."}</CardDescription>
          </CardHeader>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {sessions.map((s) => {
            const slot = slots.find((sl) => sl.id === s.schedule_slot_id);
            const mc = MODE_CONFIG[s.mode] || MODE_CONFIG.offline;
            return (
              <Card
                key={s.id}
                className="cursor-pointer shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-primary/10"
                onClick={() => openSession(s)}
              >
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold">{s.date}</span>
                    <span className={`rounded-md px-2 py-0.5 text-xs font-medium ${mc.color}`}>{mc.label}</span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {s.start_time?.slice(0, 5)}–{s.end_time?.slice(0, 5)}
                    {slot ? ` · ${WEEKDAYS[slot.weekday]}` : ""}
                  </p>
                </CardHeader>
                {s.note && (
                  <CardContent className="pt-0">
                    <p className="line-clamp-2 text-xs text-muted-foreground">{s.note}</p>
                  </CardContent>
                )}
              </Card>
            );
          })}
        </div>
      )}

      {/* Add slot dialog */}
      <Dialog open={addSlotOpen} onOpenChange={setAddSlotOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Thêm lịch học</DialogTitle>
            <DialogDescription>Chọn thứ, giờ bắt đầu và giờ kết thúc.</DialogDescription>
          </DialogHeader>
          <form className="space-y-4" onSubmit={onAddSlot}>
            <div className="space-y-2">
              <Label>Thứ</Label>
              <Select value={slotWeekday} onValueChange={(v) => v && setSlotWeekday(v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(WEEKDAYS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Giờ bắt đầu</Label>
                <Input type="time" value={slotStart} onChange={(e) => setSlotStart(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Giờ kết thúc</Label>
                <Input type="time" value={slotEnd} onChange={(e) => setSlotEnd(e.target.value)} />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setAddSlotOpen(false)}>Huỷ</Button>
              <Button type="submit" disabled={addingSlot}>{addingSlot ? "Đang thêm..." : "Thêm lịch"}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Create session dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Tạo buổi học</DialogTitle>
            <DialogDescription>Chọn lịch học và ngày cụ thể. Giờ học sẽ tự động điền.</DialogDescription>
          </DialogHeader>
          <form className="space-y-4" onSubmit={onCreateSession}>
            <div className="space-y-2">
              <Label>Lịch học</Label>
              <Select value={selSlot} onValueChange={(v) => v && setSelSlot(v)}>
                <SelectTrigger><SelectValue placeholder="Chọn lịch..." /></SelectTrigger>
                <SelectContent>
                  {slots.map((sl) => (
                    <SelectItem key={sl.id} value={String(sl.id)}>
                      {WEEKDAYS[sl.weekday]} {sl.start_time?.slice(0, 5)}–{sl.end_time?.slice(0, 5)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Ngày</Label>
              <Input type="date" value={selDate} onChange={(e) => setSelDate(e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label>Hình thức</Label>
              <Select value={selMode} onValueChange={(v) => v && setSelMode(v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="offline">Offline</SelectItem>
                  <SelectItem value="online">Online</SelectItem>
                  <SelectItem value="off">Nghỉ</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setCreateOpen(false)}>Huỷ</Button>
              <Button type="submit" disabled={creating || !selSlot || !selDate}>{creating ? "Đang tạo..." : "Tạo buổi học"}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Session detail (attendance + note) */}
      <Dialog open={!!activeSession} onOpenChange={(v) => { if (!v) setActiveSession(null); }}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Buổi học {activeSession?.date}</DialogTitle>
            <DialogDescription>
              {activeSession?.start_time?.slice(0, 5)}–{activeSession?.end_time?.slice(0, 5)} &bull; {activeSession?.mode}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-5">
            <div>
              <h4 className="mb-3 text-sm font-semibold">Điểm danh</h4>
              {students.length === 0 ? (
                <p className="text-sm text-muted-foreground">Chưa có học sinh trong lớp.</p>
              ) : (
                <div className="max-h-56 overflow-y-auto rounded-lg border">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/40"><TableHead>Họ tên</TableHead><TableHead className="w-36">Trạng thái</TableHead></TableRow>
                    </TableHeader>
                    <TableBody>
                      {students.map((st) => (
                        <TableRow key={st.id}>
                          <TableCell className="font-medium">{st.full_name}</TableCell>
                          <TableCell>
                            <Select value={attendance[st.id] || "present"} onValueChange={(v) => v && setAttendance((p) => ({ ...p, [st.id]: v }))}>
                              <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
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
              )}
            </div>
            <div className="space-y-2">
              <Label>Ghi chú buổi học</Label>
              <Textarea value={sessionNote} onChange={(e) => setSessionNote(e.target.value)} placeholder="Nhận xét chung về buổi học..." rows={3} />
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setActiveSession(null)}>Đóng</Button>
              <Button onClick={onSaveSession} disabled={saving}>{saving ? "Đang lưu..." : "Lưu điểm danh"}</Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
