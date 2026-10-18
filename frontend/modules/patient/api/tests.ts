export type PatientTestSubmission = {
  id: number;
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

export async function getPatientTests(): Promise<PatientTestSubmission[]> {
  const response = await fetch(`${apiUrl}/api/tests`, { credentials: "include" });
  if (!response.ok) throw new Error(await getErrorMessage(response));
  return (await response.json()) as PatientTestSubmission[];
}

export async function submitPatientTest(formData: FormData): Promise<PatientTestSubmission> {
  const response = await fetch(`${apiUrl}/api/tests`, {
    method: "POST",
    credentials: "include",
    body: formData,
  });
  if (!response.ok) throw new Error(await getErrorMessage(response));
  return (await response.json()) as PatientTestSubmission;
}

export function getPatientTestDownloadUrl(submissionId: number): string {
  return `${apiUrl}/api/tests/${submissionId}/download`;
}