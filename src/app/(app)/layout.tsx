"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";

import { getAccessToken } from "@/lib/auth";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    const token = getAccessToken();
    if (!token) router.replace(`/login?next=${encodeURIComponent(pathname)}`);
  }, [router, pathname]);

  return <div className="min-h-screen">{children}</div>;
}

