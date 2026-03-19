"use client";

import { useMemo, useState } from "react";

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

  const [teacherNote, setTeacherNote] = useState("");

  const canPreview = !!file && !previewing && !confirming;
  const canConfirm = (preview?.valid_rows?.length || 0) > 0 && !confirming;

  const validCount = preview?.valid_rows.length ?? 0;
  const errorCount = preview?.errors.length ?? 0;

  const previewCsv = async () => {
    if (!file) return;
    setError(null);
    setPreviewing(true);
    try {
      const form = new FormData();
      form.append("file", file);
      const resp = await apiFetch<PreviewResponse>(
        `/classes/${classId}/students/import/preview`,
        { method: "POST", body: form },
      );
      setPreview(resp);
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
    setConfirming(true);
    try {
      const resp = await apiFetch<ConfirmResponse>(
        `/classes/${classId}/students/import/confirm`,
        {
          method: "POST",
          body: JSON.stringify({ rows: preview.valid_rows }),
        },
      );
      // show accounts in a simple way; teacher can copy out
      setPreview({
        valid_rows: [],
        errors: [],
      });
      downloadTextFile(
        `import-result-class-${classId}.txt`,
        [
          `Created: ${resp.created}`,
          "",
          ...resp.accounts.map((a) => `${a.email}\t${a.temporary_password}`),
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
            Tải mẫu CSV, điền danh sách học sinh, sau đó upload để preview lỗi trước khi import.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div className="space-y-2">
              <Label htmlFor="csv">File CSV</Label>
              <Input
                id="csv"
                type="file"
                accept=".csv,text/csv"
                onChange={(e) => {
                  const f = e.target.files?.[0] ?? null;
                  setFile(f);
                  setPreview(null);
                }}
              />
              <p className="text-xs text-muted-foreground">
                Header bắt buộc: full_name, email, phone, parent_name, parent_phone, dob
              </p>
            </div>

            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => downloadTextFile("students-template.csv", CSV_TEMPLATE)}
              >
                Tải mẫu CSV
              </Button>
              <Button type="button" onClick={previewCsv} disabled={!canPreview}>
                {previewing ? "Đang preview..." : "Preview"}
              </Button>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="note">Ghi chú (tuỳ chọn)</Label>
            <Textarea
              id="note"
              placeholder="Ví dụ: Lớp 10A1, nhập ngày 18/03..."
              value={teacherNote}
              onChange={(e) => setTeacherNote(e.target.value)}
            />
          </div>

          {error && (
            <div className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {error}
            </div>
          )}

          {preview && (
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="rounded-md border bg-card px-3 py-2">
                <div className="text-xs text-muted-foreground">Valid rows</div>
                <div className="text-lg font-semibold">{validCount}</div>
              </div>
              <div className="rounded-md border bg-card px-3 py-2">
                <div className="text-xs text-muted-foreground">Errors</div>
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
            <CardTitle>Preview hợp lệ</CardTitle>
            <CardDescription>Các dòng hợp lệ sẽ được import khi bấm Import.</CardDescription>
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
                        <TableCell key={c.key}>
                          {(row as unknown as Record<string, string | null>)[c.key] ?? ""}
                        </TableCell>
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
            <CardTitle>Lỗi cần sửa</CardTitle>
            <CardDescription>
              Sửa CSV theo danh sách lỗi dưới đây rồi upload lại.
            </CardDescription>
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

