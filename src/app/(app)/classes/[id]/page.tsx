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
    <div className="space-y-6">
      {/* Header */}
      <div className="rounded-xl border border-border/60 bg-card p-6 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-start gap-4">
            <Link href="/dashboard">
              <Button variant="outline" size="icon" className="mt-0.5 h-9 w-9 shrink-0">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m12 19-7-7 7-7"/><path d="M19 12H5"/></svg>
              </Button>
            </Link>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">{classInfo?.name ?? `Lớp #${classId}`}</h1>
              {classInfo && (
                <div className="mt-1.5 flex flex-wrap items-center gap-2">
                  {classInfo.subject && <Badge className="bg-primary/10 text-primary hover:bg-primary/20">{classInfo.subject}</Badge>}
                  {classInfo.grade_level && <Badge variant="secondary">Khối {classInfo.grade_level}</Badge>}
                  {classInfo.school_year && <Badge variant="outline">{classInfo.school_year}</Badge>}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="students" className="space-y-5">
        <TabsList className="grid h-11 w-full grid-cols-3 rounded-lg bg-muted/70 p-1">
          <TabsTrigger value="students" className="rounded-md text-sm font-medium data-[state=active]:bg-background data-[state=active]:shadow-sm">
            Học sinh
          </TabsTrigger>
          <TabsTrigger value="sessions" className="rounded-md text-sm font-medium data-[state=active]:bg-background data-[state=active]:shadow-sm">
            Buổi học
          </TabsTrigger>
          <TabsTrigger value="grades" className="rounded-md text-sm font-medium data-[state=active]:bg-background data-[state=active]:shadow-sm">
            Điểm số
          </TabsTrigger>
        </TabsList>
        <TabsContent value="students"><StudentsPanel classId={classId} /></TabsContent>
        <TabsContent value="sessions"><SessionsPanel classId={classId} /></TabsContent>
        <TabsContent value="grades"><GradesPanel classId={classId} /></TabsContent>
      </Tabs>
    </div>
  );
}
