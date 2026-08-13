export const QUESTION_POLL_INTERVAL_MS = 60_000;

export const OPERATOR_ROLES = ["owner", "operator", "viewer"] as const;
export type OperatorRole = (typeof OPERATOR_ROLES)[number];

export const QUESTION_STATUSES = ["received", "reviewing", "answered"] as const;
export type QuestionStatus = (typeof QUESTION_STATUSES)[number];
export type QuestionFilter = "all" | QuestionStatus;

export interface AdminQuestion {
  id: string;
  receiptCode: string;
  category: string;
  question: string;
  contactMethod: string;
  contactValue: string | null;
  status: QuestionStatus;
  answer: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface QuestionCounts {
  all: number;
  received: number;
  reviewing: number;
  answered: number;
}

export function isOperatorRole(value: unknown): value is OperatorRole {
  return typeof value === "string" && OPERATOR_ROLES.includes(value as OperatorRole);
}

export function canEditQuestions(role: OperatorRole | null): boolean {
  return role === "owner" || role === "operator";
}

export function isAdminQuestion(value: unknown): value is AdminQuestion {
  if (typeof value !== "object" || value === null) return false;
  const question = value as Partial<AdminQuestion>;
  return (
    typeof question.id === "string" &&
    typeof question.receiptCode === "string" &&
    typeof question.category === "string" &&
    typeof question.question === "string" &&
    typeof question.contactMethod === "string" &&
    (typeof question.contactValue === "string" || question.contactValue === null) &&
    typeof question.status === "string" &&
    QUESTION_STATUSES.includes(question.status as QuestionStatus) &&
    (typeof question.answer === "string" || question.answer === null) &&
    typeof question.createdAt === "string" &&
    typeof question.updatedAt === "string"
  );
}

export function countQuestions(questions: AdminQuestion[]): QuestionCounts {
  const counts: QuestionCounts = {
    all: questions.length,
    received: 0,
    reviewing: 0,
    answered: 0
  };
  for (const question of questions) counts[question.status] += 1;
  return counts;
}

export function filterQuestions(
  questions: AdminQuestion[],
  filter: QuestionFilter
): AdminQuestion[] {
  return filter === "all" ? questions : questions.filter((question) => question.status === filter);
}

export function findNewQuestionIds(
  questions: AdminQuestion[],
  knownQuestionIds: ReadonlySet<string>,
  hasLoadedBefore: boolean
): Set<string> {
  if (!hasLoadedBefore) return new Set();
  return new Set(
    questions
      .filter((question) => !knownQuestionIds.has(question.id))
      .map((question) => question.id)
  );
}
