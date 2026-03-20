"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
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

export function SessionsPanel({ classId }: { classId: number }) {
  const [slots, setSlots] = useState<ScheduleSlot[]>([]);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);

  // Create session
  const [createOpen, setCreateOpen] = useState(false);
  const [selSlot, setSelSlot] = useState<string>("");
  const [selDate, setSelDate] = useState("");
  const [selMode, setSelMode] = useState<string>("offline");
  const [creating, setCreating] = useState(false);

  // Add slot
  const [addSlotOpen, setAddSlotOpen] = useState(false);
  const [slotWeekday, setSlotWeekday] = useState("2");
  const [slotStart, setSlotStart] = useState("19:00");
  const [slotEnd, setSlotEnd] = useState("20:30");
  const [addingSlot, setAddingSlot] = useState(false);

  // Session detail (attendance + note)
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
      setSlots(sl);
      setSessions(se);
      setStudents(st);
    } catch {
      toast.error("Không tải được dữ liệu");
    } finally {
      setLoading(false);
    }
  }, [classId]);

  useEffect(() => { void loadAll(); }, [loadAll]);

  // Create schedule slot
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

  // Create session
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

  // Open session detail
  const openSession = (s: Session) => {
    setActiveSession(s);
    setSessionNote(s.note || "");
    // Reset attendance
    const att: Record<number, string> = {};
    students.forEach((st) => { att[st.id] = "present"; });
    setAttendance(att);
  };

  // Save attendance + note
  const onSaveSession = async () => {
    if (!activeSession) return;
    setSaving(true);
    try {
      // Save attendance
      const entries: AttendanceEntry[] = Object.entries(attendance).map(([sid, st]) => ({
        student_id: Number(sid), status: st,
      }));
      await apiFetch(`/sessions/${activeSession.id}/attendance`, {
        method: "POST",
        body: JSON.stringify({ entries }),
      });

      // Save note
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
      <div className="flex items-center gap-2 text-muted-foreground">
        <svg className="h-4 w-4 animate-spin" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"/></svg>
        Đang tải...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Schedule slots */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">Lịch học hằng tuần</CardTitle>
            <Button size="sm" variant="outline" onClick={() => setAddSlotOpen(true)}>+ Thêm lịch</Button>
          </div>
          <CardDescription>Định nghĩa các khung giờ học cố định. Buổi học sẽ được tạo từ lịch này.</CardDescription>
        </CardHeader>
        {slots.length > 0 && (
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {slots.map((sl) => (
                <Badge key={sl.id} variant="secondary" className="px-3 py-1.5 text-sm">
                  {WEEKDAYS[sl.weekday] || sl.weekday} {sl.start_time?.slice(0, 5)}-{sl.end_time?.slice(0, 5)}
                </Badge>
              ))}
            </div>
          </CardContent>
        )}
      </Card>

      {/* Sessions list */}
      <div className="flex items-center justify-between">
        <h3 className="text-base font-semibold">Các buổi học ({sessions.length})</h3>
        <Button size="sm" onClick={() => setCreateOpen(true)} disabled={slots.length === 0}>
          + Tạo buổi học
        </Button>
      </div>

      {sessions.length === 0 ? (
        <Card className="border-dashed">
          <CardHeader className="text-center">
            <CardTitle className="text-base">Chưa có buổi học</CardTitle>
            <CardDescription>
              {slots.length === 0
                ? "Thêm lịch học trước, sau đó tạo buổi học."
                : "Bấm 'Tạo buổi học' để bắt đầu."}
            </CardDescription>
          </CardHeader>
        </Card>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {sessions.map((s) => {
            const slot = slots.find((sl) => sl.id === s.schedule_slot_id);
            return (
              <Card key={s.id} className="cursor-pointer transition-all hover:border-primary/40 hover:shadow-sm" onClick={() => openSession(s)}>
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm">{s.date}</CardTitle>
                    <Badge variant={s.mode === "online" ? "default" : s.mode === "off" ? "destructive" : "secondary"} className="text-xs">
                      {s.mode}
                    </Badge>
                  </div>
                  <CardDescription className="text-xs">
                    {s.start_time?.slice(0, 5)}-{s.end_time?.slice(0, 5)}
                    {slot ? ` (${WEEKDAYS[slot.weekday]})` : ""}
                  </CardDescription>
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
          <form className="space-y-3" onSubmit={onAddSlot}>
            <div className="space-y-1">
              <Label>Thứ</Label>
              <Select value={slotWeekday} onValueChange={(v) => v && setSlotWeekday(v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(WEEKDAYS).map(([k, v]) => (
                    <SelectItem key={k} value={k}>{v}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Giờ bắt đầu</Label>
                <Input type="time" value={slotStart} onChange={(e) => setSlotStart(e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label>Giờ kết thúc</Label>
                <Input type="time" value={slotEnd} onChange={(e) => setSlotEnd(e.target.value)} />
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setAddSlotOpen(false)}>Huỷ</Button>
              <Button type="submit" disabled={addingSlot}>{addingSlot ? "Đang thêm..." : "Them"}</Button>
            </div>
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
          <form className="space-y-3" onSubmit={onCreateSession}>
            <div className="space-y-1">
              <Label>Lịch học</Label>
              <Select value={selSlot} onValueChange={(v) => v && setSelSlot(v)}>
                <SelectTrigger><SelectValue placeholder="Chọn lịch..." /></SelectTrigger>
                <SelectContent>
                  {slots.map((sl) => (
                    <SelectItem key={sl.id} value={String(sl.id)}>
                      {WEEKDAYS[sl.weekday]} {sl.start_time?.slice(0, 5)}-{sl.end_time?.slice(0, 5)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Ngày</Label>
              <Input type="date" value={selDate} onChange={(e) => setSelDate(e.target.value)} required />
            </div>
            <div className="space-y-1">
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
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setCreateOpen(false)}>Huỷ</Button>
              <Button type="submit" disabled={creating || !selSlot || !selDate}>
                {creating ? "Đang tạo..." : "Tạo buổi học"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Session detail (attendance + note) */}
      <Dialog open={!!activeSession} onOpenChange={(v) => { if (!v) setActiveSession(null); }}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Buổi học {activeSession?.date}</DialogTitle>
            <DialogDescription>
              {activeSession?.start_time?.slice(0, 5)}-{activeSession?.end_time?.slice(0, 5)} &bull; {activeSession?.mode}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {/* Attendance */}
            <div>
              <h4 className="mb-2 text-sm font-semibold">Điểm danh</h4>
              {students.length === 0 ? (
                <p className="text-sm text-muted-foreground">Chưa có học sinh.</p>
              ) : (
                <div className="max-h-56 overflow-y-auto rounded border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Họ tên</TableHead>
                        <TableHead className="w-32">Trạng thái</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {students.map((st) => (
                        <TableRow key={st.id}>
                          <TableCell className="text-sm">{st.full_name}</TableCell>
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

            {/* Note */}
            <div className="space-y-1">
              <Label>Ghi chú buổi học</Label>
              <Textarea value={sessionNote} onChange={(e) => setSessionNote(e.target.value)} placeholder="Nhận xét chung về buổi học..." rows={3} />
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setActiveSession(null)}>Đóng</Button>
              <Button onClick={onSaveSession} disabled={saving}>{saving ? "Đang lưu..." : "Lưu"}</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
