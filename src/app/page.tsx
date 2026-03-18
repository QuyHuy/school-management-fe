"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

import { getAccessToken } from "@/lib/auth";

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    const token = getAccessToken();
    router.replace(token ? "/dashboard" : "/login");
  }, [router]);

  return null;
}
