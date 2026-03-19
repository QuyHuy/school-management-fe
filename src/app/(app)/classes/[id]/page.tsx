"use client";

import { use } from "react";

import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { StudentsImportPanel } from "@/features/students-import/StudentsImportPanel";
import { AttendancePanel } from "@/features/attendance/AttendancePanel";
import { GradesPanel } from "@/features/grades/GradesPanel";

export default function ClassDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const classId = Number(id);

  if (!Number.isFinite(classId) || classId <= 0) {
    return <div className="status-warn">Class id không hợp lệ.</div>;
  }

  return (
    <div className="space-y-5">
      <div className="rounded-xl border bg-card p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Lớp #{classId}</h1>
            <p className="text-sm text-muted-foreground">
              Thao tác theo thứ tự để dễ quản lý: Import học sinh trước, rồi điểm danh và nhập điểm.
            </p>
          </div>
          <div className="flex gap-2">
            <Badge variant="secondary">Bước 1: Học sinh</Badge>
            <Badge variant="outline">Bước 2: Điểm danh</Badge>
            <Badge variant="outline">Bước 3: Điểm số</Badge>
          </div>
        </div>
      </div>

      <Tabs defaultValue="students" className="space-y-4">
        <TabsList className="grid h-auto w-full grid-cols-3 gap-2 bg-transparent p-0">
          <TabsTrigger value="students" className="border bg-card py-2.5">Học sinh (Import CSV)</TabsTrigger>
          <TabsTrigger value="attendance" className="border bg-card py-2.5">Điểm danh</TabsTrigger>
          <TabsTrigger value="grades" className="border bg-card py-2.5">Điểm số & lịch sử</TabsTrigger>
        </TabsList>
        <TabsContent value="students">
          <StudentsImportPanel classId={classId} />
        </TabsContent>
        <TabsContent value="attendance">
          <AttendancePanel classId={classId} />
        </TabsContent>
        <TabsContent value="grades">
          <GradesPanel classId={classId} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
