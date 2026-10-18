"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getCurrentUser } from "@/modules/auth/api/auth";
import { getRoleHome } from "@/modules/auth/utils/roleRoutes";
import { LandingPage } from "@/modules/landing/pages/LandingPage";

export default function Home() {
  const router = useRouter();
  const [isCheckingSession, setIsCheckingSession] = useState(true);

  useEffect(() => {
    let isCurrent = true;

    async function redirectAuthenticatedUser() {
      try {
        const user = await getCurrentUser();
        if (isCurrent) router.replace(getRoleHome(user.role));
      } catch {
        if (isCurrent) setIsCheckingSession(false);
      }
    }

    void redirectAuthenticatedUser();
    return () => {
      isCurrent = false;
    };
  }, [router]);

  if (isCheckingSession) {
    return (
      <main aria-live="polite" aria-busy="true">
        <p>Checking your Carecell session…</p>
      </main>
    );
  }

  return <LandingPage />;
}
