"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { getCurrentUser, logout } from "@/modules/auth/api/auth";
import type { AuthUser, UserRole } from "@/modules/auth/types/auth";
import { getRoleHome } from "@/modules/auth/utils/roleRoutes";
import { PatientTestSection } from "@/modules/patient/components/PatientTestSection";
import styles from "./RoleDashboard.module.css";

type DashboardContent = {
  eyebrow: string;
  title: string;
  description: string;
  primaryLabel: string;
  primaryDescription: string;
  secondaryLabel: string;
  secondaryDescription: string;
  thirdLabel: string;
  thirdDescription: string;
  icon: string;
};

const contentByRole: Record<UserRole, DashboardContent> = {
  Patient: {
    eyebrow: "YOUR CARE, ALL IN ONE PLACE",
    title: "Your health journey,\nwith you at the center.",
    description: "A calm place to stay connected with your care team and keep track of what matters to you.",
    primaryLabel: "Your care plan",
    primaryDescription: "Review your next steps and keep your care moving forward.",
    secondaryLabel: "Appointments",
    secondaryDescription: "Stay up to date with upcoming visits and follow-ups.",
    thirdLabel: "Your care team",
    thirdDescription: "Know who is here to listen, guide, and support you.",
    icon: "♡",
  },
  Doctor: {
    eyebrow: "CONNECTED CARE WORKSPACE",
    title: "Care coordination,\nmade clearer.",
    description: "A focused workspace to help you stay connected with patients and their care journeys.",
    primaryLabel: "Patient care",
    primaryDescription: "Keep patient support and care journeys moving together.",
    secondaryLabel: "Care coordination",
    secondaryDescription: "Review follow-ups and coordinate the next steps in care.",
    thirdLabel: "Your care team",
    thirdDescription: "Connect with colleagues supporting shared care.",
    icon: "✚",
  },
  Admin: {
    eyebrow: "CARECELL ADMINISTRATION",
    title: "A healthier system,\nwell supported.",
    description: "A central starting point for Carecell operations, access, and account oversight.",
    primaryLabel: "User access",
    primaryDescription: "Review access roles and keep account permissions current.",
    secondaryLabel: "Team oversight",
    secondaryDescription: "Support a connected experience for patients and clinicians.",
    thirdLabel: "Platform settings",
    thirdDescription: "Keep essential workspace settings organized.",
    icon: "✳",
  },
};

type RoleDashboardProps = {
  role: UserRole;
};

export function RoleDashboard({ role }: RoleDashboardProps) {
  const router = useRouter();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [isSigningOut, setIsSigningOut] = useState(false);
  const content = contentByRole[role];

  useEffect(() => {
    let isCurrent = true;

    async function verifySession() {
      try {
        const authenticatedUser = await getCurrentUser();
        if (!isCurrent) return;

        if (authenticatedUser.role !== role) {
          router.replace(getRoleHome(authenticatedUser.role));
          return;
        }
        setUser(authenticatedUser);
      } catch {
        if (isCurrent) router.replace("/login");
      } finally {
        if (isCurrent) setIsLoading(false);
      }
    }

    void verifySession();
    return () => {
      isCurrent = false;
    };
  }, [role, router]);

  async function handleLogout() {
    setIsSigningOut(true);
    setError("");
    try {
      await logout();
      router.replace("/login");
    } catch (logoutError) {
      setError(logoutError instanceof Error ? logoutError.message : "We couldn't sign you out. Please try again.");
      setIsSigningOut(false);
    }
  }

  if (isLoading || !user) {
    return (
      <main className={styles.loadingPage} aria-live="polite" aria-busy="true">
        <span className={styles.brandMark} aria-hidden="true">✳</span>
        <p>Preparing your secure Carecell workspace…</p>
      </main>
    );
  }

  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <Link className={styles.brand} href="/" aria-label="Carecell home">
          <span className={styles.brandMark} aria-hidden="true">✳</span>
          <span>carecell</span>
        </Link>
        <div className={styles.headerActions}>
          <span className={styles.rolePill}>{role}</span>
          <button className={styles.signOut} type="button" onClick={handleLogout} disabled={isSigningOut}>
            {isSigningOut ? "Signing out…" : "Sign out"}
          </button>
        </div>
      </header>

      <section className={styles.hero} aria-labelledby="dashboard-title">
        <div className={styles.heroCopy}>
          <span className={styles.eyebrow}><span aria-hidden="true">{content.icon}</span>{content.eyebrow}</span>
          <h1 id="dashboard-title">{content.title.split("\n").map((line, index) => <span key={line}>{index > 0 && <br />}{line}</span>)}</h1>
          <p>{content.description}</p>
          <div className={styles.welcome}>Welcome, <strong>{user.full_name}</strong></div>
        </div>
        <aside className={styles.wellnessCard} aria-label="Carecell message">
          <span className={styles.cardMark} aria-hidden="true">{content.icon}</span>
          <span className={styles.cardEyebrow}>CARE THAT CONNECTS</span>
          <p>Thoughtful care is built on <strong>trust, understanding, and people showing up.</strong></p>
          <span className={styles.cardFoot}>YOUR CARECELL WORKSPACE</span>
        </aside>
      </section>

      <section className={styles.overview} aria-labelledby="overview-title">
        <div className={styles.sectionHeading}>
          <div><span className={styles.sectionEyebrow}>YOUR WORKSPACE</span><h2 id="overview-title">A good place to start.</h2></div>
          <span className={styles.sectionNote}>Designed around your role</span>
        </div>
        {error && <p className={styles.error} role="alert">{error}</p>}
        <div className={styles.cardGrid}>
          <article className={styles.actionCard}>
            <span className={`${styles.actionIcon} ${styles.mint}`} aria-hidden="true">↗</span>
            <h3>{content.primaryLabel}</h3>
            <p>{content.primaryDescription}</p>
            <span className={styles.comingSoon}>Workspace feature</span>
          </article>
          <article className={styles.actionCard}>
            <span className={`${styles.actionIcon} ${styles.blue}`} aria-hidden="true">✳</span>
            <h3>{content.secondaryLabel}</h3>
            <p>{content.secondaryDescription}</p>
            <span className={styles.comingSoon}>Workspace feature</span>
          </article>
          <article className={styles.actionCard}>
            <span className={`${styles.actionIcon} ${styles.peach}`} aria-hidden="true">♡</span>
            <h3>{content.thirdLabel}</h3>
            <p>{content.thirdDescription}</p>
            <span className={styles.comingSoon}>Workspace feature</span>
          </article>
        </div>
      </section>

      {role === "Patient" && <PatientTestSection />}

      <footer className={styles.footer}>
        <Link className={styles.footerBrand} href="/"><span aria-hidden="true">✳</span> carecell</Link>
        <span>CARE THAT CONNECTS. PEOPLE AT THE CENTER.</span>
        <span>Signed in as {role}</span>
      </footer>
    </main>
  );
}
