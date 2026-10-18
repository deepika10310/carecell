"use client";

import { useEffect, useState, type FormEvent } from "react";
import {
  getPatientTestDownloadUrl,
  getPatientTests,
  submitPatientTest,
  type PatientTestSubmission,
} from "@/modules/patient/api/tests";
import styles from "./PatientTestSection.module.css";

function formatFileSize(bytes: number): string {
  return bytes < 1024 * 1024 ? `${Math.ceil(bytes / 1024)} KB` : `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function PatientTestSection() {
  const [submissions, setSubmissions] = useState<PatientTestSubmission[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    let isCurrent = true;
    getPatientTests()
      .then((items) => {
        if (isCurrent) setSubmissions(items);
      })
      .catch((loadError: unknown) => {
        if (isCurrent) setError(loadError instanceof Error ? loadError.message : "We couldn't load your test results.");
      })
      .finally(() => {
        if (isCurrent) setIsLoading(false);
      });
    return () => {
      isCurrent = false;
    };
  }, []);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    setError("");
    setSuccess("");
    setIsSubmitting(true);

    try {
      const formData = new FormData(form);
      const submission = await submitPatientTest(formData);
      setSubmissions((current) => [submission, ...current]);
      setSuccess("Your test result was securely uploaded.");
      form.reset();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "We couldn't upload your test result. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <section className={styles.section} aria-labelledby="tests-heading">
      <div className={styles.sectionHeading}>
        <div>
          <span className={styles.eyebrow}>YOUR HEALTH RECORDS</span>
          <h2 id="tests-heading">Share a test result.</h2>
          <p>Add your test details and attach the result so it is saved with your account.</p>
        </div>
        <span className={styles.headingIcon} aria-hidden="true">＋</span>
      </div>

      <div className={styles.contentGrid}>
        <form className={styles.form} onSubmit={handleSubmit} aria-busy={isSubmitting}>
          <div className={styles.fieldGrid}>
            <label className={styles.field} htmlFor="test-type">
              Test type <span aria-hidden="true">*</span>
              <input id="test-type" name="test_type" type="text" maxLength={120} placeholder="e.g. Blood test" required />
            </label>
            <label className={styles.field} htmlFor="test-date">
              Test date <span aria-hidden="true">*</span>
              <input id="test-date" name="test_date" type="date" max={new Date().toISOString().slice(0, 10)} required />
            </label>
          </div>
          <label className={styles.field} htmlFor="test-facility">
            Clinic or laboratory <span className={styles.optional}>Optional</span>
            <input id="test-facility" name="facility" type="text" maxLength={120} placeholder="Where was the test performed?" />
          </label>
          <label className={styles.field} htmlFor="test-notes">
            Notes <span className={styles.optional}>Optional</span>
            <textarea id="test-notes" name="notes" rows={4} maxLength={2000} placeholder="Add context or anything you'd like your care team to know." />
          </label>
          <label className={styles.field} htmlFor="test-file">
            Test result file <span aria-hidden="true">*</span>
            <input id="test-file" name="file" type="file" accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png" required />
            <small>PDF, JPG, or PNG. Maximum file size: 10 MB.</small>
          </label>
          {error && <p className={styles.error} role="alert">{error}</p>}
          {success && <p className={styles.success} role="status">{success}</p>}
          <button className={styles.submitButton} type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Uploading securely…" : "Save test result"}<span aria-hidden="true">→</span>
          </button>
        </form>

        <aside className={styles.history} aria-labelledby="history-heading">
          <div className={styles.historyHeading}>
            <h3 id="history-heading">Your uploaded tests</h3>
            <span>{submissions.length}</span>
          </div>
          {isLoading ? (
            <p className={styles.emptyState} aria-live="polite">Loading your test results…</p>
          ) : submissions.length === 0 ? (
            <p className={styles.emptyState}>Your uploaded test results will appear here.</p>
          ) : (
            <ul className={styles.submissionList}>
              {submissions.map((submission) => (
                <li className={styles.submission} key={submission.id}>
                  <span className={styles.fileIcon} aria-hidden="true">▤</span>
                  <span className={styles.submissionDetails}>
                    <strong>{submission.test_type}</strong>
                    <small>{new Date(`${submission.test_date}T00:00:00`).toLocaleDateString()} · {formatFileSize(submission.file_size)}</small>
                    <small>{submission.original_filename}</small>
                  </span>
                  <a className={styles.downloadLink} href={getPatientTestDownloadUrl(submission.id)} aria-label={`Download ${submission.test_type} result`}>
                    Download
                  </a>
                </li>
              ))}
            </ul>
          )}
          <p className={styles.privacyNote}>Only you can view or download files uploaded to your account.</p>
        </aside>
      </div>
    </section>
  );
}