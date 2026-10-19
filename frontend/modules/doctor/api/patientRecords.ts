export type DoctorPatientRecord = {
  patient_id: number;
  patient_name: string;
  test_submission_id: number;
  test_type: string;
  test_date: string;
  facility: string | null;
  notes: string | null;
  original_filename: string;
  content_type: string;
  file_size: number;
  uploaded_at: string;
};

const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

async function getErrorMessage(response: Response): Promise<string> {
  const data: unknown = await response.json().catch(() => null);
  return typeof data === "object" && data !== null && "detail" in data && typeof data.detail === "string"
    ? data.detail
    : "We couldn't complete that request. Please try again.";
}

export async function getAssignedPatientRecords(): Promise<DoctorPatientRecord[]> {
  const response = await fetch(`${apiUrl}/api/doctor/patient-records`, { credentials: "include" });
  if (!response.ok) throw new Error(await getErrorMessage(response));
  return (await response.json()) as DoctorPatientRecord[];
}

export function getAssignedRecordDownloadUrl(submissionId: number): string {
  return `${apiUrl}/api/doctor/patient-records/${submissionId}/download`;
}
