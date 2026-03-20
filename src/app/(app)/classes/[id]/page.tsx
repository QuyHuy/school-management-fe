"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { StudentsPanel } from "@/features/students/StudentsPanel";
import { SessionsPanel } from "@/features/sessions/SessionsPanel";
import { GradesPanel } from "@/features/grades/GradesPanel";
import { apiFetch } from "@/lib/api";

type ClassInfo = {
  id: number;
  name: string;
  school_year?: string | null;
  subject?: string | null;
  grade_level?: string | null;
};

export default function ClassDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const classId = Number(id);
  const [classInfo, setClassInfo] = useState<ClassInfo | null>(null);

  useEffect(() => {
    apiFetch<ClassInfo>(`/classes/${classId}`).then(setClassInfo).catch(() => {});
  }, [classId]);

  if (!Number.isFinite(classId) || classId <= 0) {
    return <div className="status-warn">ID lớp không hợp lệ.</div>;
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-4 rounded-xl border bg-card/80 p-4">
        <div>
          <div className="flex items-center gap-2">
            <Link href="/dashboard">
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m12 19-7-7 7-7"/><path d="M19 12H5"/></svg>
              </Button>
            </Link>
            <h1 className="text-2xl font-bold tracking-tight">{classInfo?.name ?? `Lớp #${classId}`}</h1>
          </div>
          {classInfo && (
            <p className="mt-1 text-sm text-muted-foreground">
              {[classInfo.subject, classInfo.grade_level ? `Khối ${classInfo.grade_level}` : null, classInfo.school_year].filter(Boolean).join(" • ")}
            </p>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          <Badge variant="secondary">Học sinh</Badge>
          <Badge variant="outline">Buổi học</Badge>
          <Badge variant="outline">Điểm số</Badge>
        </div>
      </div>

      <Tabs defaultValue="students" className="space-y-4">
        <TabsList className="grid h-auto w-full grid-cols-3 gap-2 rounded-lg bg-muted p-1">
          <TabsTrigger value="students" className="rounded-md data-[state=active]:bg-background data-[state=active]:shadow-sm">Học sinh</TabsTrigger>
          <TabsTrigger value="sessions" className="rounded-md data-[state=active]:bg-background data-[state=active]:shadow-sm">Buổi học</TabsTrigger>
          <TabsTrigger value="grades" className="rounded-md data-[state=active]:bg-background data-[state=active]:shadow-sm">Điểm số</TabsTrigger>
        </TabsList>
        <TabsContent value="students"><StudentsPanel classId={classId} /></TabsContent>
        <TabsContent value="sessions"><SessionsPanel classId={classId} /></TabsContent>
        <TabsContent value="grades"><GradesPanel classId={classId} /></TabsContent>
      </Tabs>
    </div>
  );
}
