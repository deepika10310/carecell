import type { UserRole } from "@/modules/auth/types/auth";

export function getRoleHome(role: UserRole): string {
  switch (role) {
    case "Doctor":
      return "/doctor";
    case "Admin":
      return "/admin";
    case "Patient":
      return "/patient";
  }
}
