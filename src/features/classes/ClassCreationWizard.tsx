"use client";

import { useMemo, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
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

type Props = {
  onCreated: (classroom: Classroom) => void;
};

type PreviewRow = Record<string, string>;
type PreviewError = { row_number: number; field: string; message: string };

const WEEKDAYS: Record<string, string> = {
  "2": "Thu 2",
  "3": "Thu 3",
  "4": "Thu 4",
  "5": "Thu 5",
  "6": "Thu 6",
  "7": "Thu 7",
  "1": "Chu nhat",
};

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

  const progressText = useMemo(() => `Buoc ${step}/3`, [step]);

  const resetAll = () => {
    setStep(1);
    setCreating(false);
    setClassroom(null);
    setName("");
    setSchoolYear("");
    setSubject("");
    setGradeLevel("");
    setSlotWeekday("2");
    setSlotStart("19:00");
    setSlotEnd("20:30");
    setSlots([]);
    setAddingSlot(false);
    setCsvFile(null);
    setCsvPreview(null);
    setConfirmingImport(false);
  };

  const closeWizard = () => {
    setOpen(false);
    resetAll();
  };

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
      toast.success("Da tao lop. Tiep tuc them lich hoc.");
    } catch {
      toast.error("Tao lop that bai.");
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
        {
          method: "POST",
          body: JSON.stringify({
            weekday: Number(slotWeekday),
            start_time: slotStart,
            end_time: slotEnd,
          }),
        },
      );
      setSlots((prev) => [...prev, slot]);
      toast.success("Da them lich hoc.");
    } catch {
      toast.error("Them lich that bai.");
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
      toast.success("Da preview CSV.");
    } catch {
      toast.error("Preview CSV that bai.");
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
      toast.success(`Da import ${res.created} hoc sinh.`);
      onCreated(classroom);
      closeWizard();
    } catch {
      toast.error("Import that bai.");
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
        <Button size="lg" variant="secondary" className="font-semibold shadow-md">
          + Tao lop moi (Wizard)
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>Tao lop theo quy trinh</DialogTitle>
          <DialogDescription>{progressText}: Thong tin lop -&gt; Lich hoc -&gt; CSV hoc sinh</DialogDescription>
        </DialogHeader>

        {step === 1 && (
          <form className="space-y-4" onSubmit={createClass}>
            <div className="space-y-2">
              <Label htmlFor="name">Ten lop *</Label>
              <Input id="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Vi du: 10A1" required />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="gradeLevel">Khoi</Label>
                <Input id="gradeLevel" value={gradeLevel} onChange={(e) => setGradeLevel(e.target.value)} placeholder="10" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="schoolYear">Nam hoc</Label>
                <Input id="schoolYear" value={schoolYear} onChange={(e) => setSchoolYear(e.target.value)} placeholder="2026-2027" />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="subject">Mon hoc</Label>
              <Input id="subject" value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="Toan" />
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={closeWizard}>Huy</Button>
              <Button type="submit" disabled={creating}>{creating ? "Dang tao..." : "Tiep tuc"}</Button>
            </div>
          </form>
        )}

        {step === 2 && classroom && (
          <div className="space-y-4">
            <form className="grid grid-cols-4 gap-3" onSubmit={addScheduleSlot}>
              <div className="space-y-2">
                <Label>Thu</Label>
                <Select value={slotWeekday} onValueChange={(v) => v && setSlotWeekday(v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(WEEKDAYS).map(([k, v]) => (
                      <SelectItem key={k} value={k}>{v}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Gio bat dau</Label>
                <Input type="time" value={slotStart} onChange={(e) => setSlotStart(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Gio ket thuc</Label>
                <Input type="time" value={slotEnd} onChange={(e) => setSlotEnd(e.target.value)} />
              </div>
              <div className="flex items-end">
                <Button type="submit" disabled={addingSlot} className="w-full">{addingSlot ? "Dang them..." : "Them lich"}</Button>
              </div>
            </form>

            <div className="rounded-lg border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Thu</TableHead>
                    <TableHead>Bat dau</TableHead>
                    <TableHead>Ket thuc</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {slots.length === 0 ? (
                    <TableRow><TableCell colSpan={3} className="text-muted-foreground">Chua co lich hoc.</TableCell></TableRow>
                  ) : (
                    slots.map((s) => (
                      <TableRow key={s.id}>
                        <TableCell>{WEEKDAYS[String(s.weekday)] ?? s.weekday}</TableCell>
                        <TableCell>{s.start_time.slice(0, 5)}</TableCell>
                        <TableCell>{s.end_time.slice(0, 5)}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>

            <div className="flex justify-between">
              <Button variant="outline" onClick={() => setStep(1)}>Quay lai</Button>
              <Button onClick={() => setStep(3)} disabled={slots.length === 0}>Tiep tuc</Button>
            </div>
          </div>
        )}

        {step === 3 && classroom && (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Import CSV hoc sinh ngay sau khi tao lop (khuyen nghi). Ban co the bo qua va lam sau.
            </p>
            <div className="flex items-center gap-3">
              <Input type="file" accept=".csv" onChange={(e) => { setCsvFile(e.target.files?.[0] || null); setCsvPreview(null); }} />
              <Button onClick={previewCsv} disabled={!csvFile}>Preview</Button>
            </div>

            {csvPreview && (
              <div className="space-y-3">
                {csvPreview.errors.length > 0 && (
                  <div className="status-warn">
                    {csvPreview.errors.length} loi trong CSV. Sua file de import day du.
                  </div>
                )}
                <div className="status-info">{csvPreview.valid.length} dong hop le.</div>
                {csvPreview.valid.length > 0 && (
                  <div className="max-h-48 overflow-y-auto rounded border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Ho ten</TableHead>
                          <TableHead>Email</TableHead>
                          <TableHead>SDT</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {csvPreview.valid.map((r, idx) => (
                          <TableRow key={idx}>
                            <TableCell>{r.full_name}</TableCell>
                            <TableCell>{r.email}</TableCell>
                            <TableCell>{r.phone || "-"}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </div>
            )}

            <div className="flex justify-between">
              <Button variant="outline" onClick={() => setStep(2)}>Quay lai</Button>
              <div className="flex gap-2">
                <Button variant="outline" onClick={finishWithoutCsv}>Bo qua</Button>
                <Button onClick={confirmCsvImport} disabled={!csvPreview || csvPreview.valid.length === 0 || confirmingImport}>
                  {confirmingImport ? "Dang import..." : "Hoan tat va import"}
                </Button>
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
