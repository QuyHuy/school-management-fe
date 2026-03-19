"use client";

import { useMemo, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { apiFetch, ApiError } from "@/lib/api";

type StudentRow = {
  full_name: string;
  email: string;
  phone: string | null;
  parent_name: string | null;
  parent_phone: string | null;
  dob: string | null;
};

type PreviewError = {
  row_number: number;
  field: string;
  message: string;
};

type PreviewResponse = {
  valid_rows: StudentRow[];
  errors: PreviewError[];
};

type ConfirmResponse = {
  created: number;
  accounts: { email: string; temporary_password: string }[];
};

const CSV_TEMPLATE = `full_name,email,phone,parent_name,parent_phone,dob
Nguyen Van A,a.student1@example.com,0900000001,Nguyen Thi M,0910000001,2010-05-12
Tran Thi B,b.student2@example.com,0900000002,Tran Van N,0910000002,2010-09-30
`;

function downloadTextFile(filename: string, content: string): void {
  const blob = new Blob([content], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export function StudentsImportPanel({ classId }: { classId: number }) {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<PreviewResponse | null>(null);
  const [previewing, setPreviewing] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [teacherNote, setTeacherNote] = useState("");

  const canPreview = !!file && !previewing && !confirming;
  const canConfirm = (preview?.valid_rows?.length || 0) > 0 && !confirming;

  const validCount = preview?.valid_rows.length ?? 0;
  const errorCount = preview?.errors.length ?? 0;

  const previewCsv = async () => {
    if (!file) return;
    setError(null);
    setSuccess(null);
    setPreviewing(true);
    try {
      const form = new FormData();
      form.append("file", file);
      const resp = await apiFetch<PreviewResponse>(`/classes/${classId}/students/import/preview`, {
        method: "POST",
        body: form,
      });
      setPreview(resp);
      if (resp.valid_rows.length > 0 && resp.errors.length === 0) {
        setSuccess("CSV hợp lệ hoàn toàn. Bạn có thể import ngay.");
      }
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        setError("Phiên đăng nhập hết hạn. Vui lòng đăng nhập lại.");
      } else if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("Preview CSV thất bại.");
      }
    } finally {
      setPreviewing(false);
    }
  };

  const confirmImport = async () => {
    if (!preview) return;
    setError(null);
    setSuccess(null);
    setConfirming(true);
    try {
      const resp = await apiFetch<ConfirmResponse>(`/classes/${classId}/students/import/confirm`, {
        method: "POST",
        body: JSON.stringify({ rows: preview.valid_rows }),
      });
      setPreview({ valid_rows: [], errors: [] });
      setSuccess(`Import thành công ${resp.created} học sinh. Hệ thống đã tải file tài khoản tạm.`);
      downloadTextFile(
        `import-result-class-${classId}.txt`,
        [
          `Created: ${resp.created}`,
          "",
          ...resp.accounts.map((a) => `${a.email}	${a.temporary_password}`),
          "",
          teacherNote ? `Teacher note: ${teacherNote}` : "",
        ]
          .filter(Boolean)
          .join("\n"),
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Import thất bại.");
    } finally {
      setConfirming(false);
    }
  };

  const columns = useMemo(
    () => [
      { key: "full_name", label: "Họ tên" },
      { key: "email", label: "Email" },
      { key: "phone", label: "SĐT" },
      { key: "parent_name", label: "Phụ huynh" },
      { key: "parent_phone", label: "SĐT PH" },
      { key: "dob", label: "Ngày sinh" },
    ] as const,
    [],
  );

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Import học sinh bằng CSV</CardTitle>
          <CardDescription>
            Thực hiện theo 3 bước để giảm lỗi dữ liệu: <strong>Tải mẫu</strong> → <strong>Preview</strong> → <strong>Import</strong>.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="outline">Bước 1: Tải mẫu CSV</Badge>
            <Badge variant="outline">Bước 2: Upload & Preview</Badge>
            <Badge variant="secondary">Bước 3: Confirm Import</Badge>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div className="space-y-2 sm:max-w-xl">
              <Label htmlFor="csv">File CSV</Label>
              <Input
                id="csv"
                type="file"
                accept=".csv,text/csv"
                onChange={(e) => {
                  const f = e.target.files?.[0] ?? null;
                  setFile(f);
                  setPreview(null);
                  setSuccess(null);
                  setError(null);
                }}
              />
              <p className="text-xs text-muted-foreground">
                Header bắt buộc: full_name, email, phone, parent_name, parent_phone, dob
              </p>
            </div>

            <div className="flex gap-2">
              <Button type="button" variant="outline" onClick={() => downloadTextFile("students-template.csv", CSV_TEMPLATE)}>
                Tải mẫu CSV
              </Button>
              <Button type="button" onClick={previewCsv} disabled={!canPreview}>
                {previewing ? "Đang preview..." : "Preview dữ liệu"}
              </Button>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="note">Ghi chú giáo viên (tuỳ chọn)</Label>
            <Textarea
              id="note"
              placeholder="Ví dụ: Lớp 10A1, nhập ngày 19/03..."
              value={teacherNote}
              onChange={(e) => setTeacherNote(e.target.value)}
            />
          </div>

          <div className="status-info">
            Sau khi import thành công, hệ thống sẽ tải file tài khoản tạm của học sinh. Bạn nên lưu trữ file này an toàn.
          </div>

          {error && <div className="status-warn">{error}</div>}
          {success && <div className="status-success">{success}</div>}

          {preview && (
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="rounded-md border bg-card px-3 py-2">
                <div className="text-xs text-muted-foreground">Dòng hợp lệ</div>
                <div className="text-lg font-semibold text-emerald-700">{validCount}</div>
              </div>
              <div className="rounded-md border bg-card px-3 py-2">
                <div className="text-xs text-muted-foreground">Dòng lỗi</div>
                <div className="text-lg font-semibold text-destructive">{errorCount}</div>
              </div>
              <div className="flex items-center justify-end">
                <Button type="button" onClick={confirmImport} disabled={!canConfirm}>
                  {confirming ? "Đang import..." : `Import ${validCount} học sinh`}
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {preview && preview.valid_rows.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Dữ liệu hợp lệ</CardTitle>
            <CardDescription>Các dòng dưới đây sẽ được import khi bạn bấm nút Import.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    {columns.map((c) => (
                      <TableHead key={c.key}>{c.label}</TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {preview.valid_rows.map((row, idx) => (
                    <TableRow key={idx}>
                      {columns.map((c) => (
                        <TableCell key={c.key}>{(row as unknown as Record<string, string | null>)[c.key] ?? ""}</TableCell>
                      ))}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      {preview && preview.errors.length > 0 && (
        <Card className="border-destructive/30">
          <CardHeader>
            <CardTitle>Lỗi cần sửa trước khi import</CardTitle>
            <CardDescription>Sửa file CSV theo lỗi bên dưới rồi upload lại để tránh dữ liệu sai.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="rounded-md border border-destructive/30">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[120px]">Dòng</TableHead>
                    <TableHead className="w-[160px]">Field</TableHead>
                    <TableHead>Lỗi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {preview.errors.map((e, idx) => (
                    <TableRow key={idx}>
                      <TableCell>{e.row_number}</TableCell>
                      <TableCell className="font-medium">{e.field}</TableCell>
                      <TableCell className="text-destructive">{e.message}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
