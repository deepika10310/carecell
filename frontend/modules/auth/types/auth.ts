export type UserRole = "Patient" | "Doctor" | "Admin";

export type AuthUser = {
  id: number;
  email: string;
  full_name: string;
  role: UserRole;
};

export type Credentials = {
  email: string;
  password: string;
};

export type RegistrationDetails = Credentials & {
  full_name: string;
};