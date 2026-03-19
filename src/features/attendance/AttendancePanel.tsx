"use client";

import { useEffect, useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { apiFetch } from "@/lib/api";

type SessionResponse = {
  id: number;
  class_id: number;
  date: string;
  mode: "online" | "offline" | "off";
  start_time: string | null;
  end_time: string | null;
  note: string | null;
};

type AttendanceStatus = "present" | "absent" | "late";

type AttendanceEntry = {
  student_id: number;
  status: AttendanceStatus;
  note: string | null;
};

type AttendanceUpsertResponse = { updated: number };

type Student = {
  id: number;
  full_name: string;
  email: string | null;
  phone: string | null;
  parent_name: string | null;
  parent_phone: string | null;
  dob: string | null;
};

export function AttendancePanel({ classId }: { classId: number }) {
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [mode, setMode] = useState<SessionResponse["mode"]>("offline");
  const [startTime, setStartTime] = useState("07:30");
  const [endTime, setEndTime] = useState("08:15");
  const [note, setNote] = useState("");
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [session, setSession] = useState<SessionResponse | null>(null);

  const [students, setStudents] = useState<Student[]>([]);
  const [loadingStudents, setLoadingStudents] = useState(true);
  const [entries, setEntries] = useState<Record<number, AttendanceEntry>>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let mounted = true;
    const loadStudents = async () => {
      setLoadingStudents(true);
      try {
        const data = await apiFetch<Student[]>(`/classes/${classId}/students`);
        if (!mounted) return;
        setStudents(data);
      } catch (err) {
        if (!mounted) return;
        setError(err instanceof Error ? err.message : "Không tải được danh sách học sinh.");
      } finally {
        if (mounted) setLoadingStudents(false);
      }
    };
    void loadStudents();
    return () => {
      mounted = false;
    };
  }, [classId]);

  const studentIds = useMemo(() => students.map((s) => s.id), [students]);

  const createSession = async () => {
    setError(null);
    setCreating(true);
    try {
      const resp = await apiFetch<SessionResponse>(`/classes/${classId}/sessions`, {
        method: "POST",
        body: JSON.stringify({
          date,
          mode,
          start_time: startTime || null,
          end_time: endTime || null,
          note: note.trim() || null,
        }),
      });
      setSession(resp);
      setEntries({});
    } catch (err) {
      setError(err instanceof Error ? err.message : "Tạo buổi học thất bại.");
    } finally {
      setCreating(false);
    }
  };

  const ensureEntry = (studentId: number): AttendanceEntry => {
    return (
      entries[studentId] ?? {
        student_id: studentId,
        status: "present",
        note: null,
      }
    );
  };

  const setStatus = (studentId: number, status: AttendanceStatus) => {
    const next = { ...entries };
    const base = ensureEntry(studentId);
    next[studentId] = { ...base, status };
    setEntries(next);
  };

  const setEntryNote = (studentId: number, v: string) => {
    const next = { ...entries };
    const base = ensureEntry(studentId);
    next[studentId] = { ...base, note: v.trim() ? v : null };
    setEntries(next);
  };

  const saveAttendance = async () => {
    if (!session) return;
    setError(null);
    setSaving(true);
    try {
      const payload: AttendanceEntry[] = studentIds.map((sid) => ensureEntry(sid));
      const resp = await apiFetch<AttendanceUpsertResponse>(`/sessions/${session.id}/attendance`, {
        method: "POST",
        body: JSON.stringify({ entries: payload }),
      });
      // keep it simple: show updated count as inline text
      setError(`Đã lưu điểm danh: ${resp.updated} học sinh.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Lưu điểm danh thất bại.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Tạo buổi học</CardTitle>
          <CardDescription>
            Chọn ngày và hình thức học. Sau khi tạo buổi, bạn có thể điểm danh.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-5">
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="date">Ngày</Label>
              <Input id="date" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
            </div>
            <div className="space-y-2 sm:col-span-1">
              <Label>Hình thức</Label>
              <Select value={mode} onValueChange={(v) => setMode(v as SessionResponse["mode"])}>
                <SelectTrigger>
                  <SelectValue placeholder="Chọn" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="offline">Offline</SelectItem>
                  <SelectItem value="online">Online</SelectItem>
                  <SelectItem value="off">Off</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="start">Bắt đầu</Label>
              <Input id="start" type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="end">Kết thúc</Label>
              <Input id="end" type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="note">Ghi chú</Label>
            <Input id="note" value={note} onChange={(e) => setNote(e.target.value)} placeholder="Buổi 1..." />
          </div>

          <div className="flex justify-end">
            <Button onClick={createSession} disabled={creating}>
              {creating ? "Đang tạo..." : "Tạo buổi học"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {error && (
        <div className="rounded-md border border-border bg-card px-3 py-2 text-sm">
          {error}
        </div>
      )}

      {session && (
        <Card>
          <CardHeader>
            <CardTitle>Điểm danh cho buổi #{session.id}</CardTitle>
            <CardDescription>
              Chọn trạng thái cho từng học sinh. Mặc định là “Có mặt”.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {loadingStudents ? (
              <div className="text-sm text-muted-foreground">Đang tải danh sách học sinh...</div>
            ) : students.length === 0 ? (
              <div className="text-sm text-muted-foreground">Lớp chưa có học sinh. Hãy import CSV ở tab Học sinh.</div>
            ) : (
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[80px]">ID</TableHead>
                      <TableHead>Họ tên</TableHead>
                      <TableHead className="w-[180px]">Trạng thái</TableHead>
                      <TableHead>Ghi chú</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {students.map((s) => {
                      const e = ensureEntry(s.id);
                      return (
                        <TableRow key={s.id}>
                          <TableCell className="font-medium">{s.id}</TableCell>
                          <TableCell className="font-medium">{s.full_name}</TableCell>
                          <TableCell>
                            <Select
                              value={e.status}
                              onValueChange={(v) => setStatus(s.id, v as AttendanceStatus)}
                            >
                              <SelectTrigger className="w-[160px]">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="present">Có mặt</SelectItem>
                                <SelectItem value="late">Đi muộn</SelectItem>
                                <SelectItem value="absent">Vắng</SelectItem>
                              </SelectContent>
                            </Select>
                          </TableCell>
                          <TableCell>
                            <Input
                              value={e.note ?? ""}
                              onChange={(ev) => setEntryNote(s.id, ev.target.value)}
                              placeholder="Tuỳ chọn..."
                            />
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}

            <div className="flex justify-end">
              <Button onClick={saveAttendance} disabled={saving || students.length === 0}>
                {saving ? "Đang lưu..." : "Lưu điểm danh"}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

