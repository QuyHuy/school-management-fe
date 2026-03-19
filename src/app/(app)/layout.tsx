"use client";

import { useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

import { Badge } from "@/components/ui/badge";
import { getAccessToken } from "@/lib/auth";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    const token = getAccessToken();
    if (!token) router.replace(`/login?next=${encodeURIComponent(pathname)}`);
  }, [router, pathname]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-sky-50 via-background to-indigo-50">
      <header className="border-b bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="mx-auto flex h-14 w-full max-w-6xl items-center justify-between px-4 md:px-6">
          <Link href="/dashboard" className="font-semibold tracking-tight text-primary">
            School Management
          </Link>
          <Badge variant="secondary">Teacher Portal</Badge>
        </div>
      </header>
      <main className="mx-auto w-full max-w-6xl px-4 py-6 md:px-6">{children}</main>
    </div>
  );
}
