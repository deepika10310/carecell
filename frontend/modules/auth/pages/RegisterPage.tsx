"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { register } from "@/modules/auth/api/auth";
import { getRoleHome } from "@/modules/auth/utils/roleRoutes";
import styles from "./LoginPage.module.css";

export function RegisterPage() {
  const router = useRouter();
  const [notice, setNotice] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setNotice("");
    setIsSubmitting(true);

    const formData = new FormData(event.currentTarget);
    try {
      const user = await register({
        full_name: String(formData.get("full_name")),
        email: String(formData.get("email")),
        password: String(formData.get("password")),
      });
      router.replace(getRoleHome(user.role));
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "We couldn't create your account. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <Link className={styles.brand} href="/" aria-label="Carecell home">
          <span className={styles.brandMark} aria-hidden="true">
            <svg viewBox="0 0 40 40" fill="none">
              <path d="M20 5.5 32.5 10v9.2c0 8.1-5.3 13.1-12.5 16.1-7.2-3-12.5-8-12.5-16.1V10L20 5.5Z" stroke="currentColor" strokeWidth="2.2" />
              <path d="M20 13v14M13 20h14" stroke="currentColor" strokeWidth="2.7" strokeLinecap="round" />
            </svg>
          </span>
          <span>carecell</span>
        </Link>
        <Link className={styles.returnLink} href="/">Back to Carecell <span aria-hidden="true">↗</span></Link>
      </header>

      <div className={styles.content}>
        <section className={styles.formPanel} aria-labelledby="register-heading">
          <div className={styles.formInner}>
            <span className={styles.eyebrow}>CARE THAT CONNECTS</span>
            <h1 id="register-heading">Care starts<br />with you.</h1>
            <p className={styles.intro}>Create an account to begin your Carecell journey.</p>

            <form className={styles.form} onSubmit={handleSubmit} aria-busy={isSubmitting}>
              <label htmlFor="full_name">Full name</label>
              <input id="full_name" name="full_name" type="text" autoComplete="name" placeholder="Your name" maxLength={120} required />

              <label htmlFor="email">Email address</label>
              <input id="email" name="email" type="email" autoComplete="email" placeholder="you@example.com" required />

              <label htmlFor="password">Create a password</label>
              <input id="password" name="password" type="password" autoComplete="new-password" placeholder="At least 12 characters" minLength={12} maxLength={128} required />

              <button className={styles.submitButton} type="submit" disabled={isSubmitting}>
                {isSubmitting ? "Creating account…" : "Create account"} <span aria-hidden="true">→</span>
              </button>
              {notice && <p className={styles.notice} role="status">{notice}</p>}
            </form>

            <p className={styles.signup}>Already have an account? <Link href="/login">Sign in</Link></p>
            <p className={styles.privacy}><span aria-hidden="true">⌑</span> Your health information deserves thoughtful protection.</p>
          </div>
        </section>

        <aside className={styles.welcomePanel} aria-label="Carecell care promise">
          <div className={styles.orb} />
          <div className={styles.promiseCard}>
            <span className={styles.promiseMark} aria-hidden="true">✳</span>
            <span className={styles.promiseEyebrow}>A MORE PERSONAL KIND OF CARE</span>
            <p>Start with a simple step. <strong>We’ll be here to help you find your way.</strong></p>
            <div className={styles.promiseRule} />
            <span className={styles.promiseFoot}>WELCOME TO CARECELL</span>
          </div>
          <div className={styles.floatingNote}>
            <span className={styles.noteIcon} aria-hidden="true">♡</span>
            <span><strong>Here with you</strong><small>Every step of the way</small></span>
          </div>
          <span className={styles.decorRing} aria-hidden="true" />
        </aside>
      </div>
      <footer className={styles.footer}>
        <span>© {new Date().getFullYear()} Carecell</span>
        <span>CARE THAT CONNECTS. PEOPLE AT THE CENTER.</span>
      </footer>
    </main>
  );
}
