import type { Response } from "express";

export type UserRole = "STUDENT" | "PARENT" | "TEACHER" | "ADMIN";

/** Identity resolved by trusted server-side authentication middleware. */
export interface AuthenticatedPrincipal {
  userId: string;
  role: UserRole;
  /** Present only when this account is linked to its own student profile. */
  studentId?: string;
}

export interface ParentStudentLink {
  parentId: string;
  studentId: string;
  status: "PENDING" | "VERIFIED" | "REVOKED";
  verifiedAt: Date | null;
  revokedAt: Date | null;
}

/** A deliberately limited parent-facing projection; never include answers or source material here. */
export interface ParentProgressSummary {
  upcomingExamCount: number;
  practicedTopicCount: number;
  recentPracticeDays: number;
  topicsToReview: string[];
}

export function getPrincipal(response: Response): AuthenticatedPrincipal | undefined {
  return response.locals.principal as AuthenticatedPrincipal | undefined;
}

export function canAccessOwnStudentData(principal: AuthenticatedPrincipal, ownerStudentId: string): boolean {
  return principal.role === "STUDENT" && principal.studentId === ownerStudentId;
}

export function canAccessParentProgress(
  principal: AuthenticatedPrincipal,
  link: ParentStudentLink | null,
  requestedStudentId: string,
): boolean {
  return (
    principal.role === "PARENT" &&
    link !== null &&
    link.parentId === principal.userId &&
    link.studentId === requestedStudentId &&
    link.status === "VERIFIED" &&
    link.verifiedAt !== null &&
    link.revokedAt === null
  );
}

export function canAccessClass(
  principal: AuthenticatedPrincipal,
  classId: string,
  authorizedClassIds: ReadonlySet<string>,
): boolean {
  if (principal.role === "ADMIN") return true;
  return principal.role === "TEACHER" && authorizedClassIds.has(classId);
}
