"use client";

import { useMemo } from "react";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { StudentsImportPanel } from "@/features/students-import/StudentsImportPanel";
import { AttendancePanel } from "@/features/attendance/AttendancePanel";

export default function ClassDetailPage({ params }: { params: { id: string } }) {
  const classId = useMemo(() => Number(params.id), [params.id]);

  if (!Number.isFinite(classId)) {
    return <div className="p-6 text-sm text-destructive">Class id không hợp lệ.</div>;
  }

  return (
    <div className="p-6 space-y-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Lớp #{classId}</h1>
        <p className="text-sm text-muted-foreground">
          Quản lý học sinh, điểm danh và điểm số.
        </p>
      </div>

      <Tabs defaultValue="students">
        <TabsList>
          <TabsTrigger value="students">Học sinh</TabsTrigger>
          <TabsTrigger value="attendance">Điểm danh</TabsTrigger>
          <TabsTrigger value="grades">Điểm số</TabsTrigger>
        </TabsList>
        <TabsContent value="students">
          <StudentsImportPanel classId={classId} />
        </TabsContent>
        <TabsContent value="attendance">
          <AttendancePanel classId={classId} />
        </TabsContent>
        <TabsContent value="grades">
          <div className="text-sm text-muted-foreground">Sắp triển khai: nhập điểm + gradebook.</div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

