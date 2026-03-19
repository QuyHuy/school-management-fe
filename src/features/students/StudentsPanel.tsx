"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { apiFetch } from "@/lib/api";

type Student = {
  id: number;
  full_name: string;
  email?: string | null;
  phone?: string | null;
  parent_name?: string | null;
  parent_phone?: string | null;
  dob?: string | null;
};

type PreviewRow = Record<string, string>;
type PreviewError = { row_number: number; field: string; message: string };

export function StudentsPanel({ classId }: { classId: number }) {
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Set<number>>(new Set());

  // Add student
  const [addOpen, setAddOpen] = useState(false);
  const [addName, setAddName] = useState("");
  const [addEmail, setAddEmail] = useState("");
  const [addPhone, setAddPhone] = useState("");
  const [addParentName, setAddParentName] = useState("");
  const [addParentPhone, setAddParentPhone] = useState("");
  const [addDob, setAddDob] = useState("");
  const [adding, setAdding] = useState(false);

  // Edit student
  const [editStudent, setEditStudent] = useState<Student | null>(null);
  const [editName, setEditName] = useState("");
  const [editParentName, setEditParentName] = useState("");
  const [editParentPhone, setEditParentPhone] = useState("");
  const [editing, setEditing] = useState(false);

  // CSV import
  const [csvOpen, setCsvOpen] = useState(false);
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [csvPreview, setCsvPreview] = useState<{ valid: PreviewRow[]; errors: PreviewError[] } | null>(null);
  const [csvConfirming, setCsvConfirming] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await apiFetch<Student[]>(`/classes/${classId}/students`);
      setStudents(data);
    } catch {
      toast.error("Khong tai duoc danh sach hoc sinh");
    } finally {
      setLoading(false);
    }
  }, [classId]);

  useEffect(() => { void load(); }, [load]);

  const filtered = useMemo(() => {
    if (!search.trim()) return students;
    const q = search.toLowerCase();
    return students.filter(
      (s) =>
        s.full_name.toLowerCase().includes(q) ||
        s.email?.toLowerCase().includes(q) ||
        s.phone?.includes(q)
    );
  }, [students, search]);

  const toggleSelect = (id: number) => {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    if (selected.size === filtered.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(filtered.map((s) => s.id)));
    }
  };

  // Add student
  const onAddStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!addName.trim()) return;
    setAdding(true);
    try {
      await apiFetch(`/classes/${classId}/students`, {
        method: "POST",
        body: JSON.stringify({
          full_name: addName.trim(),
          email: addEmail.trim() || undefined,
          phone: addPhone.trim() || undefined,
          parent_name: addParentName.trim() || undefined,
          parent_phone: addParentPhone.trim() || undefined,
          dob: addDob || undefined,
        }),
      });
      toast.success("Da them hoc sinh");
      setAddOpen(false);
      setAddName(""); setAddEmail(""); setAddPhone("");
      setAddParentName(""); setAddParentPhone(""); setAddDob("");
      void load();
    } catch {
      toast.error("Them hoc sinh that bai");
    } finally {
      setAdding(false);
    }
  };

  // Edit student
  const openEdit = (s: Student) => {
    setEditStudent(s);
    setEditName(s.full_name);
    setEditParentName(s.parent_name || "");
    setEditParentPhone(s.parent_phone || "");
  };

  const onEditStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editStudent) return;
    setEditing(true);
    try {
      await apiFetch(`/classes/${classId}/students/${editStudent.id}`, {
        method: "PATCH",
        body: JSON.stringify({
          full_name: editName.trim() || undefined,
          parent_name: editParentName.trim() || undefined,
          parent_phone: editParentPhone.trim() || undefined,
        }),
      });
      toast.success("Da cap nhat");
      setEditStudent(null);
      void load();
    } catch {
      toast.error("Cap nhat that bai");
    } finally {
      setEditing(false);
    }
  };

  // Bulk delete
  const onBulkDelete = async () => {
    if (selected.size === 0) return;
    if (!confirm(`Xoa ${selected.size} hoc sinh?`)) return;
    try {
      const res = await apiFetch<{ deleted: number }>(`/classes/${classId}/students/bulk-delete`, {
        method: "POST",
        body: JSON.stringify({ student_ids: Array.from(selected) }),
      });
      toast.success(`Da xoa ${res.deleted} hoc sinh`);
      setSelected(new Set());
      void load();
    } catch {
      toast.error("Xoa that bai");
    }
  };

  // CSV preview
  const onCsvPreview = async () => {
    if (!csvFile) return;
    const fd = new FormData();
    fd.append("file", csvFile);
    try {
      const res = await apiFetch<{ valid_rows: PreviewRow[]; errors: PreviewError[] }>(
        `/classes/${classId}/students/import/preview`,
        { method: "POST", body: fd, headers: {} },
      );
      setCsvPreview({ valid: res.valid_rows, errors: res.errors });
    } catch {
      toast.error("Preview CSV that bai");
    }
  };

  const onCsvConfirm = async () => {
    if (!csvPreview) return;
    setCsvConfirming(true);
    try {
      const res = await apiFetch<{ created: number }>(
        `/classes/${classId}/students/import/confirm`,
        { method: "POST", body: JSON.stringify({ rows: csvPreview.valid }) },
      );
      toast.success(`Da import ${res.created} hoc sinh`);
      setCsvOpen(false);
      setCsvFile(null);
      setCsvPreview(null);
      void load();
    } catch {
      toast.error("Confirm import that bai");
    } finally {
      setCsvConfirming(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2">
        <Input
          placeholder="Tim kiem hoc sinh..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-xs"
        />
        <Button size="sm" onClick={() => setAddOpen(true)}>+ Them hoc sinh</Button>
        <Button size="sm" variant="outline" onClick={() => setCsvOpen(true)}>Import CSV</Button>
        {selected.size > 0 && (
          <Button size="sm" variant="destructive" onClick={onBulkDelete}>
            Xoa ({selected.size})
          </Button>
        )}
        <Badge variant="secondary" className="ml-auto">{students.length} hoc sinh</Badge>
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex items-center gap-2 text-muted-foreground">
          <svg className="h-4 w-4 animate-spin" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"/></svg>
          Dang tai...
        </div>
      ) : filtered.length === 0 ? (
        <Card className="border-dashed">
          <CardHeader className="text-center">
            <CardTitle className="text-base">Chua co hoc sinh</CardTitle>
            <CardDescription>Them hoc sinh thu cong hoac import tu file CSV.</CardDescription>
          </CardHeader>
        </Card>
      ) : (
        <div className="overflow-x-auto rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-10">
                  <input type="checkbox" checked={selected.size === filtered.length && filtered.length > 0} onChange={toggleAll} />
                </TableHead>
                <TableHead>Ho ten</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>SĐT</TableHead>
                <TableHead>Phu huynh</TableHead>
                <TableHead>SĐT PH</TableHead>
                <TableHead className="w-20"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((s) => (
                <TableRow key={s.id} className={selected.has(s.id) ? "bg-muted/50" : ""}>
                  <TableCell>
                    <input type="checkbox" checked={selected.has(s.id)} onChange={() => toggleSelect(s.id)} />
                  </TableCell>
                  <TableCell className="font-medium">{s.full_name}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">{s.email || "-"}</TableCell>
                  <TableCell className="text-xs">{s.phone || "-"}</TableCell>
                  <TableCell className="text-xs">{s.parent_name || "-"}</TableCell>
                  <TableCell className="text-xs">{s.parent_phone || "-"}</TableCell>
                  <TableCell>
                    <Button size="sm" variant="ghost" onClick={() => openEdit(s)}>Sua</Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Add student dialog */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Them hoc sinh</DialogTitle>
            <DialogDescription>Nhap thong tin hoc sinh moi.</DialogDescription>
          </DialogHeader>
          <form className="space-y-3" onSubmit={onAddStudent}>
            <div className="space-y-1">
              <Label>Ho ten *</Label>
              <Input value={addName} onChange={(e) => setAddName(e.target.value)} required />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Email</Label>
                <Input type="email" value={addEmail} onChange={(e) => setAddEmail(e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label>SDT</Label>
                <Input value={addPhone} onChange={(e) => setAddPhone(e.target.value)} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Ten phu huynh</Label>
                <Input value={addParentName} onChange={(e) => setAddParentName(e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label>SDT phu huynh</Label>
                <Input value={addParentPhone} onChange={(e) => setAddParentPhone(e.target.value)} />
              </div>
            </div>
            <div className="space-y-1">
              <Label>Ngay sinh</Label>
              <Input type="date" value={addDob} onChange={(e) => setAddDob(e.target.value)} />
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setAddOpen(false)}>Huy</Button>
              <Button type="submit" disabled={adding}>{adding ? "Dang them..." : "Them"}</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit student dialog */}
      <Dialog open={!!editStudent} onOpenChange={(v) => { if (!v) setEditStudent(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Sua hoc sinh</DialogTitle>
          </DialogHeader>
          <form className="space-y-3" onSubmit={onEditStudent}>
            <div className="space-y-1">
              <Label>Ho ten</Label>
              <Input value={editName} onChange={(e) => setEditName(e.target.value)} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Ten phu huynh</Label>
                <Input value={editParentName} onChange={(e) => setEditParentName(e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label>SDT phu huynh</Label>
                <Input value={editParentPhone} onChange={(e) => setEditParentPhone(e.target.value)} />
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setEditStudent(null)}>Huy</Button>
              <Button type="submit" disabled={editing}>{editing ? "Dang luu..." : "Luu"}</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* CSV Import dialog */}
      <Dialog open={csvOpen} onOpenChange={(v) => { setCsvOpen(v); if (!v) { setCsvFile(null); setCsvPreview(null); } }}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Import hoc sinh tu CSV</DialogTitle>
            <DialogDescription>
              File CSV can cac cot: full_name, email, phone, parent_name, parent_phone, dob
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Step 1: Upload */}
            <div className="flex items-center gap-3">
              <Input type="file" accept=".csv" onChange={(e) => { setCsvFile(e.target.files?.[0] || null); setCsvPreview(null); }} />
              <Button disabled={!csvFile} onClick={onCsvPreview}>Preview</Button>
            </div>

            {/* Step 2: Preview */}
            {csvPreview && (
              <div className="space-y-3">
                {csvPreview.errors.length > 0 && (
                  <div className="status-warn">
                    <strong>{csvPreview.errors.length} loi:</strong>{" "}
                    {csvPreview.errors.map((e, i) => (
                      <span key={i}>Dong {e.row_number}: {e.field} - {e.message}{i < csvPreview.errors.length - 1 ? "; " : ""}</span>
                    ))}
                  </div>
                )}
                <div className="status-info">
                  {csvPreview.valid.length} dong hop le, san sang import.
                </div>

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
                        {csvPreview.valid.map((r, i) => (
                          <TableRow key={i}>
                            <TableCell>{r.full_name}</TableCell>
                            <TableCell className="text-xs">{r.email}</TableCell>
                            <TableCell className="text-xs">{r.phone || "-"}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}

                {/* Step 3: Confirm */}
                <Button onClick={onCsvConfirm} disabled={csvPreview.valid.length === 0 || csvConfirming}>
                  {csvConfirming ? "Dang import..." : `Xac nhan import ${csvPreview.valid.length} hoc sinh`}
                </Button>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
