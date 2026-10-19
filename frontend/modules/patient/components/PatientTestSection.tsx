"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";
import { getCurrentUser, logout } from "@/modules/auth/api/auth";
import type { AuthUser } from "@/modules/auth/types/auth";
import { getRoleHome } from "@/modules/auth/utils/roleRoutes";
import { HealthChat } from "@/modules/chat/components/HealthChat";
import {
  getPatientTestDownloadUrl,
  getPatientTests,
  getDoctors,
  submitPatientTest,
  updatePatientTest,
  type DoctorSummary,
  type PatientTestSubmission,
} from "@/modules/patient/api/tests";
import styles from "./PatientTestSection.module.css";

function formatFileSize(bytes: number): string {
  return bytes < 1024 * 1024 ? `${Math.ceil(bytes / 1024)} KB` : `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function PatientTestSection() {
  const router = useRouter();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [submissions, setSubmissions] = useState<PatientTestSubmission[]>([]);
  const [doctors, setDoctors] = useState<DoctorSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [editingSubmission, setEditingSubmission] = useState<PatientTestSubmission | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [doctorQuery, setDoctorQuery] = useState("");
  const [selectedDoctor, setSelectedDoctor] = useState<DoctorSummary | null>(null);
  const [isAddingDoctor, setIsAddingDoctor] = useState(false);
  const [isLoadingDoctors, setIsLoadingDoctors] = useState(false);
  const filteredDoctors = doctorQuery.trim()
    ? doctors.filter((doctor) => doctor.full_name.toLowerCase().includes(doctorQuery.trim().toLowerCase())).slice(0, 8)
    : [];

  useEffect(() => {
    let isCurrent = true;

    async function loadPage() {
      try {
        const authenticatedUser = await getCurrentUser();
        if (!isCurrent) return;
        if (authenticatedUser.role !== "Patient") {
          router.replace(getRoleHome(authenticatedUser.role));
          return;
        }
        setUser(authenticatedUser);
      } catch {
        if (isCurrent) {
          router.replace("/login");
        }
        return;
      }

      try {
        const items = await getPatientTests();
        if (isCurrent) setSubmissions(items);
      } catch (loadError) {
        if (isCurrent) setError(loadError instanceof Error ? loadError.message : "We couldn't load your test results.");
      }

      try {
        const availableDoctors = await getDoctors();
        if (isCurrent) setDoctors(availableDoctors);
      } catch (doctorError) {
        if (isCurrent) setError(doctorError instanceof Error ? doctorError.message : "We couldn't load the doctor list.");
      } finally {
        if (isCurrent) setIsLoading(false);
      }
    }

    void loadPage();
    return () => {
      isCurrent = false;
    };
  }, [router]);

  async function openCreateForm() {
    setSuccess("");
    setError("");
    setSelectedDoctor(null);
    setDoctorQuery("");
    setIsAddingDoctor(false);
    setIsCreating(true);
    setIsLoadingDoctors(true);
    try {
      setDoctors(await getDoctors());
    } catch (doctorError) {
      setError(doctorError instanceof Error ? doctorError.message : "We couldn't refresh the doctor list.");
    } finally {
      setIsLoadingDoctors(false);
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if ((!isAddingDoctor || editingSubmission) && !selectedDoctor) {
      setError("Select a doctor from the list, or choose Add new doctor and enter their details.");
      return;
    }
    const form = event.currentTarget;
    const formData = new FormData(form);
    if (editingSubmission) {
      const selectedFile = formData.get("file");
      if (selectedFile instanceof File && selectedFile.size === 0) formData.delete("file");
    }
    if (isAddingDoctor && !editingSubmission) {
      formData.delete("doctor_id");
    } else {
      formData.delete("new_doctor_name");
      formData.delete("new_doctor_email");
    }

    setError("");
    setSuccess("");
    setIsSubmitting(true);
    try {
      if (editingSubmission) {
        const updated = await updatePatientTest(editingSubmission.id, formData);
        setSubmissions((current) => current.map((item) => item.id === updated.id ? updated : item));
        setSuccess("Your test result details were updated.");
      } else {
        const created = await submitPatientTest(formData);
        setSubmissions((current) => [created, ...current]);
        const createdDoctor = created.doctor;
        if (createdDoctor) {
          setDoctors((current) => {
            if (current.some((doctor) => doctor.id === createdDoctor.id)) return current;
            return [...current, createdDoctor].sort((first, second) => first.full_name.localeCompare(second.full_name));
          });
        }
        try {
          setDoctors(await getDoctors());
        } catch {
          // Keep the doctor returned by the successful submission in the local list.
        }
        setSuccess("Your test result was securely uploaded.");
      }
      setEditingSubmission(null);
      setIsCreating(false);
      setDoctorQuery("");
      setSelectedDoctor(null);
      setIsAddingDoctor(false);
      form.reset();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "We couldn't save your test result. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  function closeForm() {
    setEditingSubmission(null);
    setIsCreating(false);
    setDoctorQuery("");
    setSelectedDoctor(null);
    setIsAddingDoctor(false);
    setError("");
  }

  async function handleLogout() {
    setIsSigningOut(true);
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
        <span aria-hidden="true">✳</span>
        <p>Preparing your secure health journey…</p>
      </main>
    );
  }

  const isFormOpen = isCreating || editingSubmission !== null;

  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <Link className={styles.brand} href="/patient" aria-label="Return to patient dashboard"><span aria-hidden="true">✳</span> carecell</Link>
        <div className={styles.headerActions}>
          <span>Welcome, {user.full_name}</span>
          <button type="button" onClick={handleLogout} disabled={isSigningOut}>{isSigningOut ? "Signing out…" : "Sign out"}</button>
        </div>
      </header>

      <section className={styles.section} aria-labelledby="tests-heading">
        <Link className={styles.backLink} href="/patient">← Patient dashboard</Link>
        <div className={styles.sectionHeading}>
          <div>
            <span className={styles.eyebrow}>YOUR HEALTH RECORDS</span>
            <h1 id="tests-heading">My Health Journey</h1>
            <p>Keep your test results together. Add a new result or update details on an existing one.</p>
          </div>
          {!isFormOpen && <button className={styles.newButton} type="button" onClick={() => { void openCreateForm(); }}>＋ New test</button>}
        </div>

        {error && <p className={styles.error} role="alert">{error}</p>}
        {success && <p className={styles.success} role="status">{success}</p>}

        {isFormOpen ? (
          <form
            className={styles.form}
            key={editingSubmission?.id ?? "new-test"}
            onSubmit={handleSubmit}
            aria-busy={isSubmitting}
          >
            <div className={styles.formHeading}>
              <div>
                <span className={styles.eyebrow}>{editingSubmission ? "UPDATE YOUR RECORD" : "ADD TO YOUR RECORD"}</span>
                <h2>{editingSubmission ? "Edit test result" : "New test result"}</h2>
              </div>
              <button className={styles.cancelButton} type="button" onClick={closeForm}>Cancel</button>
            </div>
            <div className={styles.fieldGrid}>
              <label className={styles.field} htmlFor="test-type">
                Test type <span aria-hidden="true">*</span>
                <input id="test-type" name="test_type" type="text" maxLength={120} placeholder="e.g. Blood test" defaultValue={editingSubmission?.test_type ?? ""} required />
              </label>
              <label className={styles.field} htmlFor="test-date">
                Test date <span aria-hidden="true">*</span>
                <input id="test-date" name="test_date" type="date" max={new Date().toISOString().slice(0, 10)} defaultValue={editingSubmission?.test_date ?? ""} required />
              </label>
            </div>
            <label className={styles.field} htmlFor="test-facility">
              Clinic or laboratory <span className={styles.optional}>Optional</span>
              <input id="test-facility" name="facility" type="text" maxLength={120} placeholder="Where was the test performed?" defaultValue={editingSubmission?.facility ?? ""} />
            </label>
            <label className={styles.field} htmlFor="test-notes">
              Notes <span className={styles.optional}>Optional</span>
              <textarea id="test-notes" name="notes" rows={4} maxLength={2000} placeholder="Add context or anything you'd like your care team to know." defaultValue={editingSubmission?.notes ?? ""} />
            </label>
            <div className={styles.field}>
              <span>Doctor <span className={styles.optional}>(Required)</span></span>
              {!editingSubmission && (
                <div className={styles.doctorMode} aria-label="Doctor entry mode">
                  <button type="button" className={!isAddingDoctor ? styles.activeDoctorMode : ""} onClick={() => { setIsAddingDoctor(false); setDoctorQuery(""); }} aria-pressed={!isAddingDoctor}>Choose existing</button>
                  <button type="button" className={isAddingDoctor ? styles.activeDoctorMode : ""} onClick={() => { setIsAddingDoctor(true); setSelectedDoctor(null); setDoctorQuery(""); }} aria-pressed={isAddingDoctor}>Add new doctor</button>
                </div>
              )}
              {isAddingDoctor && !editingSubmission ? (
                <div className={styles.fieldGrid}>
                  <label className={styles.field} htmlFor="new-doctor-name">Doctor name <span aria-hidden="true">*</span>
                    <input id="new-doctor-name" name="new_doctor_name" type="text" maxLength={120} placeholder="Full name" required />
                  </label>
                  <label className={styles.field} htmlFor="new-doctor-email">Doctor email <span aria-hidden="true">*</span>
                    <input id="new-doctor-email" name="new_doctor_email" type="email" maxLength={320} placeholder="doctor@example.com" required />
                  </label>
                </div>
              ) : (
                <>
                  <input type="hidden" name="doctor_id" value={selectedDoctor?.id ?? ""} />
                  <input
                    className={styles.doctorSearch}
                    type="search"
                    value={doctorQuery}
                    onChange={(event) => { setDoctorQuery(event.target.value); setSelectedDoctor(null); }}
                    placeholder="Search doctors by name"
                    aria-label="Search doctors by name"
                    aria-required="true"
                    aria-controls="doctor-options"
                    required
                  />
                  {filteredDoctors.length > 0 && !selectedDoctor && (
                    <ul className={styles.doctorOptions} id="doctor-options" aria-label="Matching doctors">
                      {filteredDoctors.map((doctor) => (
                        <li key={doctor.id}>
                          <button type="button" onClick={() => { setSelectedDoctor(doctor); setDoctorQuery(doctor.full_name); }}>
                            {doctor.full_name}
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                  <small>{isLoadingDoctors ? "Refreshing doctor list…" : selectedDoctor ? `Selected: ${selectedDoctor.full_name}` : doctorQuery ? filteredDoctors.length ? "Choose a doctor from the matching results." : "No matching doctors found." : "Start typing to search the doctor list."}</small>
                </>
              )}
            </div>
            <label className={styles.field} htmlFor="test-file">
              {editingSubmission ? "Replace test result file" : "Test result file"} <span className={editingSubmission ? styles.optional : undefined}>{editingSubmission ? "Optional" : "*"}</span>
              <input id="test-file" name="file" type="file" accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png" required={!editingSubmission} />
              <small>{editingSubmission ? `Current file: ${editingSubmission.original_filename}. ` : ""}PDF, JPG, or PNG. Maximum file size: 10 MB.</small>
            </label>
            <div className={styles.formActions}>
              <button className={styles.submitButton} type="submit" disabled={isSubmitting}>
                {isSubmitting ? "Saving securely…" : editingSubmission ? "Save changes" : "Save test result"}<span aria-hidden="true">→</span>
              </button>
              <button className={styles.cancelButton} type="button" onClick={closeForm} disabled={isSubmitting}>Cancel</button>
            </div>
          </form>
        ) : isLoading ? (
          <p className={styles.emptyState} aria-live="polite">Loading your test results…</p>
        ) : submissions.length === 0 ? (
          <div className={styles.emptyPanel}>
            <span aria-hidden="true">▤</span>
            <h2>No test results yet</h2>
            <p>Your saved results will appear here after you add your first test.</p>
            <button className={styles.newButton} type="button" onClick={() => { void openCreateForm(); }}>＋ Add your first test</button>
          </div>
        ) : (
          <div className={styles.history}>
            <div className={styles.historyHeading}>
              <div><h2>Your test results</h2><p>{submissions.length} {submissions.length === 1 ? "record" : "records"}</p></div>
            </div>
            <ul className={styles.submissionList}>
              {submissions.map((submission) => (
                <li className={styles.submission} key={submission.id}>
                  <span className={styles.fileIcon} aria-hidden="true">▤</span>
                  <span className={styles.submissionDetails}>
                    <strong>{submission.test_type}</strong>
                    <small>{new Date(`${submission.test_date}T00:00:00`).toLocaleDateString()} · {submission.facility || "Clinic not specified"}</small>
                    <small>{submission.original_filename} · {formatFileSize(submission.file_size)}</small>
                    {submission.doctor && <small>Doctor: {submission.doctor.full_name}</small>}
                    {submission.notes && <small className={styles.notes}>{submission.notes}</small>}
                  </span>
                  <div className={styles.itemActions}>
                    <a className={styles.downloadLink} href={getPatientTestDownloadUrl(submission.id)}>Download</a>
                    <button className={styles.editButton} type="button" onClick={() => { setError(""); setSuccess(""); setIsCreating(false); setDoctorQuery(submission.doctor?.full_name ?? ""); setSelectedDoctor(submission.doctor); setIsAddingDoctor(false); setEditingSubmission(submission); }}>Edit</button>
                  </div>
                </li>
              ))}
            </ul>
            <p className={styles.privacyNote}>Only you can view or download files uploaded to your account.</p>
          </div>
        )}
      </section>
      <HealthChat role="Patient" />
    </main>
  );
}