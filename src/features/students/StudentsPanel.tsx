"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
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

  const [addOpen, setAddOpen] = useState(false);
  const [addName, setAddName] = useState("");
  const [addEmail, setAddEmail] = useState("");
  const [addPhone, setAddPhone] = useState("");
  const [addParentName, setAddParentName] = useState("");
  const [addParentPhone, setAddParentPhone] = useState("");
  const [addDob, setAddDob] = useState("");
  const [adding, setAdding] = useState(false);

  const [editStudent, setEditStudent] = useState<Student | null>(null);
  const [editName, setEditName] = useState("");
  const [editParentName, setEditParentName] = useState("");
  const [editParentPhone, setEditParentPhone] = useState("");
  const [editing, setEditing] = useState(false);

  const [csvOpen, setCsvOpen] = useState(false);
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [csvPreview, setCsvPreview] = useState<{ valid: PreviewRow[]; errors: PreviewError[] } | null>(null);
  const [csvConfirming, setCsvConfirming] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setStudents(await apiFetch<Student[]>(`/classes/${classId}/students`));
    } catch {
      toast.error("Không tải được danh sách học sinh");
    } finally {
      setLoading(false);
    }
  }, [classId]);

  useEffect(() => { void load(); }, [load]);

  const filtered = useMemo(() => {
    if (!search.trim()) return students;
    const q = search.toLowerCase();
    return students.filter(
      (s) => s.full_name.toLowerCase().includes(q) || s.email?.toLowerCase().includes(q) || s.phone?.includes(q),
    );
  }, [students, search]);

  const toggleSelect = (id: number) =>
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });

  const toggleAll = () =>
    selected.size === filtered.length ? setSelected(new Set()) : setSelected(new Set(filtered.map((s) => s.id)));

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
      toast.success("Đã thêm học sinh");
      setAddOpen(false);
      setAddName(""); setAddEmail(""); setAddPhone("");
      setAddParentName(""); setAddParentPhone(""); setAddDob("");
      void load();
    } catch {
      toast.error("Thêm học sinh thất bại");
    } finally {
      setAdding(false);
    }
  };

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
      toast.success("Đã cập nhật");
      setEditStudent(null);
      void load();
    } catch {
      toast.error("Cập nhật thất bại");
    } finally {
      setEditing(false);
    }
  };

  const onBulkDelete = async () => {
    if (selected.size === 0) return;
    if (!confirm(`Xóa ${selected.size} học sinh?`)) return;
    try {
      const res = await apiFetch<{ deleted: number }>(`/classes/${classId}/students/bulk-delete`, {
        method: "POST",
        body: JSON.stringify({ student_ids: Array.from(selected) }),
      });
      toast.success(`Đã xóa ${res.deleted} học sinh`);
      setSelected(new Set());
      void load();
    } catch {
      toast.error("Xóa thất bại");
    }
  };

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
      toast.error("Preview CSV thất bại");
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
      toast.success(`Đã import ${res.created} học sinh`);
      setCsvOpen(false);
      setCsvFile(null);
      setCsvPreview(null);
      void load();
    } catch {
      toast.error("Xác nhận import thất bại");
    } finally {
      setCsvConfirming(false);
    }
  };

  return (
    <div className="space-y-5">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3 rounded-xl border border-border/60 bg-card p-4 shadow-sm">
        <div className="relative flex-1">
          <svg className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
          <Input
            placeholder="Tìm kiếm học sinh..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="max-w-sm pl-9"
          />
        </div>
        <div className="flex items-center gap-2">
          <Button size="sm" onClick={() => setAddOpen(true)}>
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="mr-1.5"><path d="M5 12h14"/><path d="M12 5v14"/></svg>
            Thêm học sinh
          </Button>
          <Button size="sm" variant="outline" onClick={() => setCsvOpen(true)}>Import CSV</Button>
          {selected.size > 0 && (
            <Button size="sm" variant="destructive" onClick={onBulkDelete}>Xóa ({selected.size})</Button>
          )}
        </div>
        <Badge variant="secondary" className="ml-auto text-xs">{students.length} học sinh</Badge>
      </div>

      {/* Table */}
      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-12 animate-pulse rounded-lg bg-muted/60" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <Card className="border-dashed">
          <CardHeader className="items-center py-12 text-center">
            <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-muted">
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-muted-foreground"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><line x1="19" x2="19" y1="8" y2="14"/><line x1="22" x2="16" y1="11" y2="11"/></svg>
            </div>
            <CardTitle className="text-base">Chưa có học sinh</CardTitle>
            <CardDescription>Thêm học sinh thủ công hoặc import từ file CSV.</CardDescription>
          </CardHeader>
        </Card>
      ) : (
        <div className="overflow-hidden rounded-xl border border-border/60 bg-card shadow-sm">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/40 hover:bg-muted/40">
                <TableHead className="w-12 pl-4">
                  <Checkbox
                    checked={selected.size === filtered.length && filtered.length > 0}
                    onCheckedChange={toggleAll}
                  />
                </TableHead>
                <TableHead className="font-semibold">Họ tên</TableHead>
                <TableHead className="font-semibold">Email</TableHead>
                <TableHead className="font-semibold">SĐT</TableHead>
                <TableHead className="font-semibold">Phụ huynh</TableHead>
                <TableHead className="font-semibold">SĐT phụ huynh</TableHead>
                <TableHead className="w-20" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((s) => (
                <TableRow key={s.id} className={selected.has(s.id) ? "bg-primary/5" : ""}>
                  <TableCell className="pl-4">
                    <Checkbox checked={selected.has(s.id)} onCheckedChange={() => toggleSelect(s.id)} />
                  </TableCell>
                  <TableCell className="font-medium">{s.full_name}</TableCell>
                  <TableCell className="text-muted-foreground">{s.email || "—"}</TableCell>
                  <TableCell className="text-muted-foreground">{s.phone || "—"}</TableCell>
                  <TableCell className="text-muted-foreground">{s.parent_name || "—"}</TableCell>
                  <TableCell className="text-muted-foreground">{s.parent_phone || "—"}</TableCell>
                  <TableCell>
                    <Button size="sm" variant="ghost" className="h-8 text-xs" onClick={() => openEdit(s)}>Sửa</Button>
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
            <DialogTitle>Thêm học sinh</DialogTitle>
            <DialogDescription>Nhập thông tin học sinh mới vào lớp.</DialogDescription>
          </DialogHeader>
          <form className="space-y-4" onSubmit={onAddStudent}>
            <div className="space-y-2">
              <Label>Họ tên *</Label>
              <Input value={addName} onChange={(e) => setAddName(e.target.value)} placeholder="Nguyễn Văn A" required />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Email</Label>
                <Input type="email" value={addEmail} onChange={(e) => setAddEmail(e.target.value)} placeholder="email@example.com" />
              </div>
              <div className="space-y-2">
                <Label>Số điện thoại</Label>
                <Input value={addPhone} onChange={(e) => setAddPhone(e.target.value)} placeholder="0912345678" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Tên phụ huynh</Label>
                <Input value={addParentName} onChange={(e) => setAddParentName(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>SĐT phụ huynh</Label>
                <Input value={addParentPhone} onChange={(e) => setAddParentPhone(e.target.value)} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Ngày sinh</Label>
              <Input type="date" value={addDob} onChange={(e) => setAddDob(e.target.value)} />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setAddOpen(false)}>Huỷ</Button>
              <Button type="submit" disabled={adding}>{adding ? "Đang thêm..." : "Thêm học sinh"}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit student dialog */}
      <Dialog open={!!editStudent} onOpenChange={(v) => { if (!v) setEditStudent(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Chỉnh sửa học sinh</DialogTitle>
            <DialogDescription>Cập nhật thông tin cho {editStudent?.full_name}</DialogDescription>
          </DialogHeader>
          <form className="space-y-4" onSubmit={onEditStudent}>
            <div className="space-y-2">
              <Label>Họ tên</Label>
              <Input value={editName} onChange={(e) => setEditName(e.target.value)} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Tên phụ huynh</Label>
                <Input value={editParentName} onChange={(e) => setEditParentName(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>SĐT phụ huynh</Label>
                <Input value={editParentPhone} onChange={(e) => setEditParentPhone(e.target.value)} />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setEditStudent(null)}>Huỷ</Button>
              <Button type="submit" disabled={editing}>{editing ? "Đang lưu..." : "Lưu thay đổi"}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* CSV Import dialog */}
      <Dialog open={csvOpen} onOpenChange={(v) => { setCsvOpen(v); if (!v) { setCsvFile(null); setCsvPreview(null); } }}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Import học sinh từ CSV</DialogTitle>
            <DialogDescription>File CSV cần các cột: full_name, email, phone, parent_name, parent_phone, dob</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <Input type="file" accept=".csv" onChange={(e) => { setCsvFile(e.target.files?.[0] || null); setCsvPreview(null); }} />
              <Button disabled={!csvFile} onClick={onCsvPreview} variant="outline">Preview</Button>
            </div>
            {csvPreview && (
              <div className="space-y-3">
                {csvPreview.errors.length > 0 && (
                  <div className="status-warn">
                    <strong>{csvPreview.errors.length} lỗi:</strong>{" "}
                    {csvPreview.errors.map((e, i) => (
                      <span key={i}>Dòng {e.row_number}: {e.field} — {e.message}{i < csvPreview.errors.length - 1 ? "; " : ""}</span>
                    ))}
                  </div>
                )}
                <div className="status-info">{csvPreview.valid.length} dòng hợp lệ, sẵn sàng import.</div>
                {csvPreview.valid.length > 0 && (
                  <div className="max-h-48 overflow-y-auto rounded-lg border">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-muted/40"><TableHead>Họ tên</TableHead><TableHead>Email</TableHead><TableHead>SĐT</TableHead></TableRow>
                      </TableHeader>
                      <TableBody>
                        {csvPreview.valid.map((r, i) => (
                          <TableRow key={i}><TableCell>{r.full_name}</TableCell><TableCell className="text-muted-foreground">{r.email}</TableCell><TableCell className="text-muted-foreground">{r.phone || "—"}</TableCell></TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
                <DialogFooter>
                  <Button onClick={onCsvConfirm} disabled={csvPreview.valid.length === 0 || csvConfirming}>
                    {csvConfirming ? "Đang import..." : `Xác nhận import ${csvPreview.valid.length} học sinh`}
                  </Button>
                </DialogFooter>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
