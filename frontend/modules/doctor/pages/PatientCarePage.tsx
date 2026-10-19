"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { getCurrentUser, logout } from "@/modules/auth/api/auth";
import type { AuthUser } from "@/modules/auth/types/auth";
import { getRoleHome } from "@/modules/auth/utils/roleRoutes";
import { HealthChat } from "@/modules/chat/components/HealthChat";
import { getAssignedPatientRecords, getAssignedRecordDownloadUrl, type DoctorPatientRecord } from "@/modules/doctor/api/patientRecords";
import styles from "./PatientCarePage.module.css";

function formatFileSize(bytes: number): string {
  return bytes < 1024 * 1024 ? `${Math.ceil(bytes / 1024)} KB` : `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

type FilterOption = {
  value: string;
  label: string;
};

type SearchableFilterProps = {
  id: string;
  label: string;
  value: string;
  options: FilterOption[];
  placeholder: string;
  onChange: (value: string) => void;
};

function SearchableFilter({ id, label, value, options, placeholder, onChange }: SearchableFilterProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const selectedLabel = options.find((option) => option.value === value)?.label ?? "";
  const filteredOptions = options.filter((option) => option.label.toLowerCase().includes(query.trim().toLowerCase()));

  function chooseOption(option: FilterOption) {
    onChange(option.value);
    setQuery("");
    setIsOpen(false);
    setActiveIndex(0);
  }

  return (
    <div className={styles.filterField}>
      <label htmlFor={id}>{label}</label>
      <input
        id={id}
        type="search"
        role="combobox"
        aria-autocomplete="list"
        aria-expanded={isOpen}
        aria-controls={`${id}-options`}
        aria-activedescendant={isOpen && filteredOptions[activeIndex] ? `${id}-option-${activeIndex}` : undefined}
        value={isOpen ? query : selectedLabel}
        placeholder={placeholder}
        onFocus={() => { setQuery(""); setIsOpen(true); setActiveIndex(0); }}
        onBlur={() => setIsOpen(false)}
        onChange={(event) => { setQuery(event.target.value); setIsOpen(true); setActiveIndex(0); }}
        onKeyDown={(event) => {
          if (event.key === "Escape") {
            setIsOpen(false);
            setQuery("");
          } else if (event.key === "ArrowDown" && filteredOptions.length > 0) {
            event.preventDefault();
            setActiveIndex((current) => Math.min(current + 1, filteredOptions.length - 1));
          } else if (event.key === "ArrowUp" && filteredOptions.length > 0) {
            event.preventDefault();
            setActiveIndex((current) => Math.max(current - 1, 0));
          } else if (event.key === "Enter" && isOpen && filteredOptions[activeIndex]) {
            event.preventDefault();
            chooseOption(filteredOptions[activeIndex]);
          }
        }}
      />
      {isOpen && (
        <ul className={styles.filterOptions} id={`${id}-options`} role="listbox" aria-label={`${label} options`}>
          {filteredOptions.length > 0 ? filteredOptions.map((option, index) => (
            <li
              className={index === activeIndex ? styles.activeFilterOption : ""}
              id={`${id}-option-${index}`}
              key={option.value || "all"}
              role="option"
              aria-selected={option.value === value}
              onMouseDown={(event) => event.preventDefault()}
              onMouseEnter={() => setActiveIndex(index)}
              onClick={() => chooseOption(option)}
            >
              {option.label}
            </li>
          )) : (
            <li className={styles.noFilterOptions} role="option" aria-selected="false" aria-disabled="true">No matching options</li>
          )}
        </ul>
      )}
    </div>
  );
}

export function PatientCarePage() {
  const router = useRouter();
  const [doctor, setDoctor] = useState<AuthUser | null>(null);
  const [records, setRecords] = useState<DoctorPatientRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [error, setError] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [patientFilter, setPatientFilter] = useState("");
  const [testTypeFilter, setTestTypeFilter] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  useEffect(() => {
    let isCurrent = true;

    async function loadPatientCare() {
      try {
        const authenticatedUser = await getCurrentUser();
        if (!isCurrent) return;
        if (authenticatedUser.role !== "Doctor") {
          router.replace(getRoleHome(authenticatedUser.role));
          return;
        }
        setDoctor(authenticatedUser);
        const patientRecords = await getAssignedPatientRecords();
        if (isCurrent) setRecords(patientRecords);
      } catch (loadError) {
        if (isCurrent) {
          if (loadError instanceof Error && loadError.message.includes("session")) {
            router.replace("/login");
          } else {
            setError(loadError instanceof Error ? loadError.message : "We couldn't load your patient records.");
          }
        }
      } finally {
        if (isCurrent) setIsLoading(false);
      }
    }

    void loadPatientCare();
    return () => { isCurrent = false; };
  }, [router]);

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

  if (isLoading || !doctor) {
    return (
      <main className={styles.loadingPage} aria-live="polite" aria-busy="true">
        <span aria-hidden="true">✳</span>
        <p>Loading your patient care workspace…</p>
      </main>
    );
  }

  const sortedRecords = [...records].sort((first, second) => {
    const uploadDifference = Date.parse(second.uploaded_at) - Date.parse(first.uploaded_at);
    return uploadDifference || second.test_submission_id - first.test_submission_id;
  });
  const patientOptions = [...new Map(records.map((record) => [record.patient_id, record.patient_name])).entries()]
    .sort((first, second) => first[1].localeCompare(second[1]));
  const testTypeOptions = [...new Set(records.map((record) => record.test_type))]
    .sort((first, second) => first.localeCompare(second));
  const patientFilterOptions = [
    { value: "", label: "All patients" },
    ...patientOptions.map(([patientId, patientName]) => ({ value: String(patientId), label: patientName })),
  ];
  const testTypeFilterOptions = [
    { value: "", label: "All test types" },
    ...testTypeOptions.map((testType) => ({ value: testType, label: testType })),
  ];
  const normalizedQuery = searchQuery.trim().toLowerCase();
  const filteredRecords = sortedRecords.filter((record) => {
    const matchesQuery = !normalizedQuery || [
      record.patient_name,
      record.test_type,
      record.facility ?? "",
      record.original_filename,
      record.notes ?? "",
    ].some((value) => value.toLowerCase().includes(normalizedQuery));
    return matchesQuery
      && (!patientFilter || String(record.patient_id) === patientFilter)
      && (!testTypeFilter || record.test_type === testTypeFilter);
  });
  const pageCount = Math.max(1, Math.ceil(filteredRecords.length / pageSize));
  const visibleRecords = filteredRecords.slice((currentPage - 1) * pageSize, currentPage * pageSize);
  const firstVisibleRecord = filteredRecords.length === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const lastVisibleRecord = Math.min(currentPage * pageSize, filteredRecords.length);

  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <Link className={styles.brand} href="/doctor"><span aria-hidden="true">✳</span> carecell</Link>
        <div className={styles.headerActions}>
          <span>Welcome, {doctor.full_name}</span>
          <button type="button" onClick={handleLogout} disabled={isSigningOut}>{isSigningOut ? "Signing out…" : "Sign out"}</button>
        </div>
      </header>

      <section className={styles.content} aria-labelledby="patient-care-heading">
        <Link className={styles.backLink} href="/doctor">← Doctor workspace</Link>
        <div className={styles.heading}>
          <span className={styles.eyebrow}>YOUR ASSIGNED PATIENTS</span>
          <h1 id="patient-care-heading">Patient care</h1>
          <p>Review test results patients have shared with you.</p>
        </div>
        {error && <p className={styles.error} role="alert">{error}</p>}
        {!error && records.length === 0 ? (
          <div className={styles.empty}>
            <span aria-hidden="true">♡</span>
            <h2>No patient records yet</h2>
            <p>Records will appear here when a patient uploads a test result and selects you as their doctor.</p>
          </div>
        ) : (
          <>
            <div className={styles.filters} aria-label="Filter patient records">
              <label className={styles.filterField}>
                <span>Search records</span>
                <input
                  type="search"
                  value={searchQuery}
                  onChange={(event) => { setSearchQuery(event.target.value); setCurrentPage(1); }}
                  placeholder="Patient, test, facility, notes…"
                />
              </label>
              <SearchableFilter
                id="patient-filter"
                label="Patient"
                value={patientFilter}
                options={patientFilterOptions}
                placeholder="Search patients…"
                onChange={(value) => { setPatientFilter(value); setCurrentPage(1); }}
              />
              <SearchableFilter
                id="test-type-filter"
                label="Test type"
                value={testTypeFilter}
                options={testTypeFilterOptions}
                placeholder="Search test types…"
                onChange={(value) => { setTestTypeFilter(value); setCurrentPage(1); }}
              />
              {(searchQuery || patientFilter || testTypeFilter) && (
                <button className={styles.clearFilters} type="button" onClick={() => { setSearchQuery(""); setPatientFilter(""); setTestTypeFilter(""); setCurrentPage(1); }}>
                  Clear filters
                </button>
              )}
            </div>
            <div className={styles.paginationTop}>
              <span>Showing {firstVisibleRecord}–{lastVisibleRecord} of {filteredRecords.length} records</span>
              <label className={styles.pageSize}>
                <span>Per page</span>
                <select value={pageSize} onChange={(event) => { setPageSize(Number(event.target.value)); setCurrentPage(1); }}>
                  <option value={10}>10</option>
                  <option value={25}>25</option>
                  <option value={50}>50</option>
                </select>
              </label>
            </div>
            {filteredRecords.length === 0 ? (
              <div className={styles.empty}>
                <h2>No matching records</h2>
                <p>Try changing or clearing your search and filters.</p>
              </div>
            ) : (
          <ul className={styles.recordList}>
            {visibleRecords.map((record) => (
              <li className={styles.record} key={record.test_submission_id}>
                <div className={styles.recordHeading}>
                  <div>
                    <span className={styles.patientId}>Patient #{record.patient_id}</span>
                    <h2>{record.patient_name}</h2>
                  </div>
                  <a className={styles.downloadLink} href={getAssignedRecordDownloadUrl(record.test_submission_id)}>Download report</a>
                </div>
                <div className={styles.recordDetails}>
                  <strong>{record.test_type}</strong>
                  <span>{new Date(`${record.test_date}T00:00:00`).toLocaleDateString()} · {record.facility || "Clinic not specified"}</span>
                  <span>{record.original_filename} · {formatFileSize(record.file_size)}</span>
                  {record.notes && <p>{record.notes}</p>}
                </div>
              </li>
            ))}
          </ul>
            )}
            {filteredRecords.length > pageSize && (
              <nav className={styles.pagination} aria-label="Patient record pages">
                <button type="button" onClick={() => setCurrentPage((page) => Math.max(1, page - 1))} disabled={currentPage === 1}>
                  Previous
                </button>
                <span>Page {currentPage} of {pageCount}</span>
                <button type="button" onClick={() => setCurrentPage((page) => Math.min(pageCount, page + 1))} disabled={currentPage === pageCount}>
                  Next
                </button>
              </nav>
            )}
          </>
        )}
      </section>
      <HealthChat role="Doctor" />
    </main>
  );
}
