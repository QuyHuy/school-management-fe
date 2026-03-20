"use client";

import { useMemo, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { apiFetch } from "@/lib/api";

type Classroom = {
  id: number;
  name: string;
  school_year?: string | null;
  subject?: string | null;
  grade_level?: string | null;
};

type Props = { onCreated: (classroom: Classroom) => void };
type PreviewRow = Record<string, string>;
type PreviewError = { row_number: number; field: string; message: string };

const WEEKDAYS: Record<string, string> = {
  "2": "Thứ 2", "3": "Thứ 3", "4": "Thứ 4", "5": "Thứ 5", "6": "Thứ 6", "7": "Thứ 7", "1": "Chủ nhật",
};

const STEP_LABELS = ["Thông tin lớp", "Lịch học", "Import học sinh"];

export function ClassCreationWizard({ onCreated }: Props) {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [creating, setCreating] = useState(false);

  const [classroom, setClassroom] = useState<Classroom | null>(null);
  const [name, setName] = useState("");
  const [schoolYear, setSchoolYear] = useState("");
  const [subject, setSubject] = useState("");
  const [gradeLevel, setGradeLevel] = useState("");

  const [slotWeekday, setSlotWeekday] = useState("2");
  const [slotStart, setSlotStart] = useState("19:00");
  const [slotEnd, setSlotEnd] = useState("20:30");
  const [slots, setSlots] = useState<Array<{ id: number; weekday: number; start_time: string; end_time: string }>>([]);
  const [addingSlot, setAddingSlot] = useState(false);

  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [csvPreview, setCsvPreview] = useState<{ valid: PreviewRow[]; errors: PreviewError[] } | null>(null);
  const [confirmingImport, setConfirmingImport] = useState(false);

  const progressText = useMemo(() => `Bước ${step}/3`, [step]);

  const resetAll = () => {
    setStep(1); setCreating(false); setClassroom(null);
    setName(""); setSchoolYear(""); setSubject(""); setGradeLevel("");
    setSlotWeekday("2"); setSlotStart("19:00"); setSlotEnd("20:30");
    setSlots([]); setAddingSlot(false);
    setCsvFile(null); setCsvPreview(null); setConfirmingImport(false);
  };

  const closeWizard = () => { setOpen(false); resetAll(); };

  const createClass = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setCreating(true);
    try {
      const created = await apiFetch<Classroom>("/classes", {
        method: "POST",
        body: JSON.stringify({
          name: name.trim(),
          school_year: schoolYear.trim() || undefined,
          subject: subject.trim() || undefined,
          grade_level: gradeLevel.trim() || undefined,
        }),
      });
      setClassroom(created);
      setStep(2);
      toast.success("Đã tạo lớp. Tiếp tục thêm lịch học.");
    } catch {
      toast.error("Tạo lớp thất bại.");
    } finally {
      setCreating(false);
    }
  };

  const addScheduleSlot = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!classroom) return;
    setAddingSlot(true);
    try {
      const slot = await apiFetch<{ id: number; weekday: number; start_time: string; end_time: string }>(
        `/classes/${classroom.id}/schedule-slots`,
        { method: "POST", body: JSON.stringify({ weekday: Number(slotWeekday), start_time: slotStart, end_time: slotEnd }) },
      );
      setSlots((prev) => [...prev, slot]);
      toast.success("Đã thêm lịch học.");
    } catch {
      toast.error("Thêm lịch thất bại.");
    } finally {
      setAddingSlot(false);
    }
  };

  const previewCsv = async () => {
    if (!classroom || !csvFile) return;
    const fd = new FormData();
    fd.append("file", csvFile);
    try {
      const res = await apiFetch<{ valid_rows: PreviewRow[]; errors: PreviewError[] }>(
        `/classes/${classroom.id}/students/import/preview`,
        { method: "POST", body: fd, headers: {} },
      );
      setCsvPreview({ valid: res.valid_rows, errors: res.errors });
    } catch {
      toast.error("Preview CSV thất bại.");
    }
  };

  const confirmCsvImport = async () => {
    if (!classroom || !csvPreview) return;
    setConfirmingImport(true);
    try {
      const res = await apiFetch<{ created: number }>(
        `/classes/${classroom.id}/students/import/confirm`,
        { method: "POST", body: JSON.stringify({ rows: csvPreview.valid }) },
      );
      toast.success(`Đã import ${res.created} học sinh.`);
      onCreated(classroom);
      closeWizard();
    } catch {
      toast.error("Import thất bại.");
    } finally {
      setConfirmingImport(false);
    }
  };

  const finishWithoutCsv = () => {
    if (!classroom) return;
    onCreated(classroom);
    closeWizard();
  };

  return (
    <Dialog open={open} onOpenChange={(v) => (v ? setOpen(true) : closeWizard())}>
      <DialogTrigger>
        <Button className="shadow-md">
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="mr-1.5"><path d="M5 12h14"/><path d="M12 5v14"/></svg>
          Tạo lớp mới
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Tạo lớp theo quy trình</DialogTitle>
          <DialogDescription>{progressText}</DialogDescription>
        </DialogHeader>

        {/* Step indicator */}
        <div className="flex items-center gap-1 px-1">
          {STEP_LABELS.map((label, i) => {
            const stepNum = i + 1;
            const isActive = step === stepNum;
            const isDone = step > stepNum;
            return (
              <div key={i} className="flex flex-1 items-center gap-2">
                <div className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold transition-colors ${
                  isDone ? "bg-emerald-500 text-white" : isActive ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                }`}>
                  {isDone ? "✓" : stepNum}
                </div>
                <span className={`text-xs font-medium ${isActive ? "text-foreground" : "text-muted-foreground"}`}>{label}</span>
                {i < 2 && <div className={`mx-2 h-px flex-1 ${isDone ? "bg-emerald-500" : "bg-border"}`} />}
              </div>
            );
          })}
        </div>

        {/* Step 1: Class info */}
        {step === 1 && (
          <form className="space-y-4 pt-2" onSubmit={createClass}>
            <div className="space-y-2">
              <Label>Tên lớp *</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ví dụ: 10A1" required />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><Label>Khối</Label><Input value={gradeLevel} onChange={(e) => setGradeLevel(e.target.value)} placeholder="10" /></div>
              <div className="space-y-2"><Label>Năm học</Label><Input value={schoolYear} onChange={(e) => setSchoolYear(e.target.value)} placeholder="2026–2027" /></div>
            </div>
            <div className="space-y-2"><Label>Môn học</Label><Input value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="Toán" /></div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={closeWizard}>Huỷ</Button>
              <Button type="submit" disabled={creating}>{creating ? "Đang tạo..." : "Tiếp tục →"}</Button>
            </DialogFooter>
          </form>
        )}

        {/* Step 2: Schedule slots */}
        {step === 2 && classroom && (
          <div className="space-y-4 pt-2">
            <form className="grid grid-cols-4 items-end gap-3" onSubmit={addScheduleSlot}>
              <div className="space-y-2">
                <Label>Thứ</Label>
                <Select value={slotWeekday} onValueChange={(v) => v && setSlotWeekday(v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{Object.entries(WEEKDAYS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-2"><Label>Bắt đầu</Label><Input type="time" value={slotStart} onChange={(e) => setSlotStart(e.target.value)} /></div>
              <div className="space-y-2"><Label>Kết thúc</Label><Input type="time" value={slotEnd} onChange={(e) => setSlotEnd(e.target.value)} /></div>
              <Button type="submit" disabled={addingSlot}>{addingSlot ? "..." : "Thêm"}</Button>
            </form>

            {slots.length > 0 && (
              <div className="overflow-hidden rounded-lg border">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/40"><TableHead>Thứ</TableHead><TableHead>Bắt đầu</TableHead><TableHead>Kết thúc</TableHead></TableRow>
                  </TableHeader>
                  <TableBody>
                    {slots.map((s) => (
                      <TableRow key={s.id}><TableCell>{WEEKDAYS[String(s.weekday)] ?? s.weekday}</TableCell><TableCell>{s.start_time.slice(0, 5)}</TableCell><TableCell>{s.end_time.slice(0, 5)}</TableCell></TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
            {slots.length === 0 && <p className="py-6 text-center text-sm text-muted-foreground">Chưa có lịch học. Thêm ít nhất một khung giờ.</p>}

            <DialogFooter>
              <Button variant="outline" onClick={() => setStep(1)}>← Quay lại</Button>
              <Button onClick={() => setStep(3)} disabled={slots.length === 0}>Tiếp tục →</Button>
            </DialogFooter>
          </div>
        )}

        {/* Step 3: CSV import */}
        {step === 3 && classroom && (
          <div className="space-y-4 pt-2">
            <p className="text-sm text-muted-foreground">Import danh sách học sinh ngay (khuyến nghị) hoặc bỏ qua và làm sau.</p>
            <div className="flex items-center gap-3">
              <Input type="file" accept=".csv" onChange={(e) => { setCsvFile(e.target.files?.[0] || null); setCsvPreview(null); }} />
              <Button onClick={previewCsv} disabled={!csvFile} variant="outline">Preview</Button>
            </div>
            {csvPreview && (
              <div className="space-y-3">
                {csvPreview.errors.length > 0 && <div className="status-warn">{csvPreview.errors.length} lỗi trong CSV.</div>}
                <div className="status-info">{csvPreview.valid.length} dòng hợp lệ.</div>
                {csvPreview.valid.length > 0 && (
                  <div className="max-h-48 overflow-y-auto rounded-lg border">
                    <Table>
                      <TableHeader><TableRow className="bg-muted/40"><TableHead>Họ tên</TableHead><TableHead>Email</TableHead><TableHead>SĐT</TableHead></TableRow></TableHeader>
                      <TableBody>
                        {csvPreview.valid.map((r, i) => <TableRow key={i}><TableCell>{r.full_name}</TableCell><TableCell className="text-muted-foreground">{r.email}</TableCell><TableCell className="text-muted-foreground">{r.phone || "—"}</TableCell></TableRow>)}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </div>
            )}
            <DialogFooter>
              <Button variant="outline" onClick={() => setStep(2)}>← Quay lại</Button>
              <Button variant="outline" onClick={finishWithoutCsv}>Bỏ qua</Button>
              <Button onClick={confirmCsvImport} disabled={!csvPreview || csvPreview.valid.length === 0 || confirmingImport}>
                {confirmingImport ? "Đang import..." : "Hoàn tất và import"}
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
