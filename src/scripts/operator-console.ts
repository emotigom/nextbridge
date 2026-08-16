import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import {
  QUESTION_POLL_INTERVAL_MS,
  canEditQuestions,
  countQuestions,
  filterQuestions,
  findNewQuestionIds,
  isAdminQuestion,
  isOperatorRole,
  type AdminQuestion,
  type OperatorRole,
  type QuestionFilter,
  type QuestionStatus
} from "@/lib/operator-console";

const consoleRoot = document.querySelector<HTMLElement>("[data-admin-console]");
const login = consoleRoot?.querySelector<HTMLFormElement>("[data-operator-login]");
const passwordSetup = consoleRoot?.querySelector<HTMLFormElement>("[data-password-setup]");
const workspace = consoleRoot?.querySelector<HTMLElement>("[data-operator-workspace]");
const loginMessage = consoleRoot?.querySelector<HTMLElement>("[data-admin-message]");
const passwordSetupMessage = consoleRoot?.querySelector<HTMLElement>(
  "[data-password-setup-message]"
);
const requestPasswordReset = consoleRoot?.querySelector<HTMLButtonElement>(
  "[data-request-password-reset]"
);
const workspaceMessage = consoleRoot?.querySelector<HTMLElement>("[data-workspace-message]");
const list = consoleRoot?.querySelector<HTMLElement>("[data-admin-question-list]");
const refresh = consoleRoot?.querySelector<HTMLButtonElement>("[data-refresh-questions]");
const logout = consoleRoot?.querySelector<HTMLButtonElement>("[data-operator-logout]");
const roleLabel = consoleRoot?.querySelector<HTMLElement>("[data-operator-role]");
const roleGuidance = consoleRoot?.querySelector<HTMLElement>("[data-role-guidance]");
const lastChecked = consoleRoot?.querySelector<HTMLTimeElement>("[data-last-checked]");
const filterButtons = consoleRoot?.querySelectorAll<HTMLButtonElement>("[data-question-filter]");

const roleLabels: Record<OperatorRole, string> = {
  owner: "소유자",
  operator: "운영자",
  viewer: "조회자"
};

const roleGuidanceText: Record<OperatorRole, string> = {
  owner: "질문 조회와 상태·답변 변경이 가능합니다. 활성 탭에서 60초마다 자동 확인합니다.",
  operator: "질문 조회와 상태·답변 변경이 가능합니다. 활성 탭에서 60초마다 자동 확인합니다.",
  viewer: "읽기 전용 권한입니다. 활성 탭에서 60초마다 자동 확인합니다."
};

const statusLabels: Record<QuestionStatus, string> = {
  received: "접수",
  reviewing: "확인 중",
  answered: "답변 완료"
};

const categoryLabels: Record<string, string> = {
  schedule: "일정",
  signature: "등록부 서명",
  room: "협의실",
  lodging_meal: "숙박·식사",
  transport_parking: "교통·주차",
  submission: "제출",
  other: "기타"
};

let client: SupabaseClient | null = null;
let accessToken = "";
let currentRole: OperatorRole | null = null;
let currentFilter: QuestionFilter = "all";
let questions: AdminQuestion[] = [];
let knownQuestionIds = new Set<string>();
let newQuestionIds = new Set<string>();
let hasLoadedQuestions = false;
let questionPollTimer: number | null = null;
let isLoadingQuestions = false;

const authHash = new URLSearchParams(window.location.hash.replace(/^#/, ""));
const authQuery = new URLSearchParams(window.location.search);
const authFlowType = authHash.get("type") ?? authQuery.get("type") ?? "";
const authErrorCode = authHash.get("error_code") ?? authQuery.get("error_code") ?? "";

class SessionExpiredError extends Error {}

class ApiRequestError extends Error {
  constructor(
    message: string,
    public readonly status: number
  ) {
    super(message);
  }
}

function cleanAuthUrl() {
  if (window.location.hash || window.location.search) {
    window.history.replaceState(null, "", window.location.pathname);
  }
}

function stopQuestionPolling() {
  if (questionPollTimer !== null) {
    window.clearInterval(questionPollTimer);
    questionPollTimer = null;
  }
}

function startQuestionPolling() {
  stopQuestionPolling();
  if (!accessToken || !currentRole || workspace?.hidden || document.visibilityState !== "visible") {
    return;
  }
  questionPollTimer = window.setInterval(() => {
    if (document.visibilityState === "visible" && workspace && !workspace.hidden) {
      void loadQuestions("automatic");
    }
  }, QUESTION_POLL_INTERVAL_MS);
}

function resetWorkspaceState() {
  stopQuestionPolling();
  currentRole = null;
  currentFilter = "all";
  questions = [];
  knownQuestionIds = new Set();
  newQuestionIds = new Set();
  hasLoadedQuestions = false;
  list?.replaceChildren();
  if (lastChecked) {
    lastChecked.removeAttribute("datetime");
    lastChecked.textContent = "아직 확인하지 않음";
  }
  updateFilterSummary();
}

function showPasswordSetup(email?: string) {
  resetWorkspaceState();
  if (login) login.hidden = true;
  if (workspace) workspace.hidden = true;
  if (passwordSetup) passwordSetup.hidden = false;
  const emailInput = login?.elements.namedItem("email");
  if (email && emailInput instanceof HTMLInputElement) emailInput.value = email;
}

function showLogin(message?: string) {
  accessToken = "";
  resetWorkspaceState();
  if (passwordSetup) passwordSetup.hidden = true;
  if (workspace) workspace.hidden = true;
  if (login) login.hidden = false;
  if (message && loginMessage) loginMessage.textContent = message;
}

function showWorkspace(role: OperatorRole) {
  currentRole = role;
  if (passwordSetup) passwordSetup.hidden = true;
  if (login) login.hidden = true;
  if (workspace) workspace.hidden = false;
  if (roleLabel) roleLabel.textContent = roleLabels[role];
  if (roleGuidance) roleGuidance.textContent = roleGuidanceText[role];
  startQuestionPolling();
}

function handleSessionExpired() {
  const wasSignedIn = Boolean(accessToken || currentRole);
  showLogin("로그인 세션이 만료되었습니다. 비밀번호로 다시 로그인해 주세요.");
  if (wasSignedIn) void client?.auth.signOut().catch(() => undefined);
}

function addText(parent: HTMLElement, tag: string, text: string, className?: string) {
  const element = document.createElement(tag);
  element.textContent = text;
  if (className) element.className = className;
  parent.append(element);
  return element;
}

function formatDateTime(value: string | Date): string {
  return new Intl.DateTimeFormat("ko-KR", {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(typeof value === "string" ? new Date(value) : value);
}

function updateFilterSummary() {
  const counts = countQuestions(questions);
  for (const button of filterButtons ?? []) {
    const filter = button.dataset.questionFilter as QuestionFilter | undefined;
    if (!filter || !(filter in counts)) continue;
    button.setAttribute("aria-pressed", String(filter === currentFilter));
    const count = button.querySelector<HTMLElement>("[data-filter-count]");
    if (count) count.textContent = String(counts[filter]);
  }
}

function appendQuestionBadges(header: HTMLElement, question: AdminQuestion) {
  const badges = document.createElement("div");
  badges.className = "admin-question-badges";
  if (newQuestionIds.has(question.id)) addText(badges, "span", "새 질문", "new-question-badge");
  addText(
    badges,
    "span",
    statusLabels[question.status],
    "question-status-badge is-" + question.status
  );
  addText(badges, "span", categoryLabels[question.category] ?? question.category, "category-badge");
  header.append(badges);
}

function appendContact(article: HTMLElement, question: AdminQuestion) {
  const contact = document.createElement("dl");
  const contactRow = document.createElement("div");
  addText(contactRow, "dt", "연락");
  addText(
    contactRow,
    "dd",
    question.contactValue ? question.contactMethod + " · " + question.contactValue : "연락처 없음"
  );
  contact.append(contactRow);
  article.append(contact);
}

function appendReadonlyAnswer(article: HTMLElement, question: AdminQuestion) {
  const panel = document.createElement("div");
  panel.className = "admin-answer-readonly";
  addText(panel, "strong", "조회 전용");
  addText(
    panel,
    "p",
    question.answer ? "등록된 답변: " + question.answer : "아직 등록된 답변이 없습니다."
  );
  article.append(panel);
}

function appendAnswerForm(article: HTMLElement, question: AdminQuestion) {
  const form = document.createElement("form");
  form.className = "admin-answer-form";
  form.dataset.answerForm = "";

  const selectLabel = document.createElement("label");
  addText(selectLabel, "span", "처리 상태");
  const select = document.createElement("select");
  select.name = "status";
  for (const [value, label] of Object.entries(statusLabels)) {
    const option = document.createElement("option");
    option.value = value;
    option.textContent = label;
    option.selected = question.status === value;
    select.append(option);
  }
  selectLabel.append(select);

  const answerLabel = document.createElement("label");
  addText(answerLabel, "span", "참가자에게 표시할 답변");
  const textarea = document.createElement("textarea");
  textarea.name = "answer";
  textarea.rows = 4;
  textarea.maxLength = 2000;
  textarea.value = question.answer ?? "";
  answerLabel.append(textarea);

  const button = document.createElement("button");
  button.type = "submit";
  button.className = "button button-primary";
  button.textContent = "상태·답변 저장";
  form.append(selectLabel, answerLabel, button);
  article.append(form);
}

function renderQuestions() {
  if (!list) return;
  list.replaceChildren();
  const visibleQuestions = filterQuestions(questions, currentFilter);
  if (visibleQuestions.length === 0) {
    addText(
      list,
      "p",
      questions.length === 0 ? "접수된 질문이 없습니다." : "선택한 상태의 질문이 없습니다.",
      "empty-state"
    );
    return;
  }

  for (const question of visibleQuestions) {
    const article = document.createElement("article");
    article.className = "admin-question-card";
    if (newQuestionIds.has(question.id)) article.classList.add("is-new");
    article.dataset.questionId = question.id;

    const header = document.createElement("header");
    const meta = document.createElement("div");
    addText(meta, "strong", question.receiptCode);
    addText(meta, "span", formatDateTime(question.createdAt));
    header.append(meta);
    appendQuestionBadges(header, question);
    article.append(header);

    addText(article, "p", question.question, "admin-question-text");
    appendContact(article, question);
    if (canEditQuestions(currentRole)) appendAnswerForm(article, question);
    else appendReadonlyAnswer(article, question);
    list.append(article);
  }
}

async function api(path: string, init?: RequestInit): Promise<unknown> {
  if (!accessToken) {
    handleSessionExpired();
    throw new SessionExpiredError();
  }
  const headers = new Headers(init?.headers);
  headers.set("Content-Type", "application/json");
  headers.set("Authorization", "Bearer " + accessToken);
  const apiBase = consoleRoot?.dataset.apiBase ?? "";
  const response = await fetch(apiBase.replace(/\/$/, "") + path, { ...init, headers });
  const result: unknown = await response.json().catch(() => null);
  if (response.status === 401) {
    handleSessionExpired();
    throw new SessionExpiredError();
  }
  if (!response.ok) {
    const message =
      typeof result === "object" &&
      result !== null &&
      "message" in result &&
      typeof result.message === "string"
        ? result.message
        : "요청을 처리하지 못했습니다.";
    throw new ApiRequestError(message, response.status);
  }
  return result;
}

type LoadSource = "initial" | "manual" | "automatic" | "saved";

async function loadQuestions(source: LoadSource) {
  if (!accessToken || isLoadingQuestions) return;
  isLoadingQuestions = true;
  if (refresh) refresh.disabled = true;
  if (source !== "automatic" && workspaceMessage) {
    workspaceMessage.textContent = "질문을 불러오는 중…";
  }
  try {
    const result = await api(
      "/admin-questions?eventSlug=" + encodeURIComponent(consoleRoot?.dataset.eventSlug ?? "")
    );
    const nextQuestions =
      typeof result === "object" &&
      result !== null &&
      "questions" in result &&
      Array.isArray(result.questions)
        ? result.questions.filter(isAdminQuestion)
        : [];
    newQuestionIds = findNewQuestionIds(nextQuestions, knownQuestionIds, hasLoadedQuestions);
    questions = nextQuestions;
    knownQuestionIds = new Set(nextQuestions.map((question) => question.id));
    hasLoadedQuestions = true;
    updateFilterSummary();
    renderQuestions();

    const checkedAt = new Date();
    if (lastChecked) {
      lastChecked.dateTime = checkedAt.toISOString();
      lastChecked.textContent = formatDateTime(checkedAt);
    }
    if (workspaceMessage) {
      if (newQuestionIds.size > 0) {
        workspaceMessage.textContent = "새 질문 " + newQuestionIds.size + "건을 확인했습니다.";
      } else if (source === "saved") {
        workspaceMessage.textContent = "상태와 답변을 저장하고 목록을 갱신했습니다.";
      } else {
        workspaceMessage.textContent = questions.length + "건을 확인했습니다.";
      }
    }
  } catch (error) {
    if (error instanceof SessionExpiredError) return;
    if (workspaceMessage) {
      workspaceMessage.textContent =
        error instanceof Error
          ? error.message + " 기존 목록을 유지합니다."
          : "질문을 불러오지 못했습니다. 기존 목록을 유지합니다.";
    }
  } finally {
    isLoadingQuestions = false;
    if (refresh) refresh.disabled = false;
  }
}

if (consoleRoot?.dataset.supabaseUrl && consoleRoot.dataset.publishableKey) {
  client = createClient(consoleRoot.dataset.supabaseUrl, consoleRoot.dataset.publishableKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: true,
      detectSessionInUrl: true
    }
  });

  client.auth.onAuthStateChange((event, session) => {
    if (session?.access_token) accessToken = session.access_token;
    if (event === "TOKEN_REFRESHED" && session?.access_token) {
      accessToken = session.access_token;
    }
    if (event === "SIGNED_OUT") {
      const workspaceWasOpen = Boolean(workspace && !workspace.hidden);
      accessToken = "";
      stopQuestionPolling();
      if (workspaceWasOpen) showLogin("로그인 세션이 종료되었습니다. 다시 로그인해 주세요.");
    }
  });
}

async function initializeAuthLink() {
  if (!client) return;
  if (authErrorCode) {
    showLogin(
      "인증 링크가 만료되었거나 이미 사용됐습니다. 이메일을 입력한 뒤 새 비밀번호 설정 메일을 요청해 주세요."
    );
    cleanAuthUrl();
    return;
  }
  if (!["invite", "recovery"].includes(authFlowType)) return;

  const { data, error } = await client.auth.getSession();
  if (error || !data.session) {
    showLogin(
      "인증 세션을 확인하지 못했습니다. 이메일을 입력한 뒤 새 비밀번호 설정 메일을 요청해 주세요."
    );
    cleanAuthUrl();
    return;
  }

  accessToken = data.session.access_token;
  showPasswordSetup(data.session.user.email);
  cleanAuthUrl();
}

void initializeAuthLink();

requestPasswordReset?.addEventListener("click", async () => {
  if (!client || !login) return;
  const emailInput = login.elements.namedItem("email");
  if (!(emailInput instanceof HTMLInputElement) || !emailInput.checkValidity()) {
    if (emailInput instanceof HTMLInputElement) emailInput.reportValidity();
    return;
  }

  requestPasswordReset.disabled = true;
  if (loginMessage) loginMessage.textContent = "안전한 비밀번호 설정 메일을 요청하는 중…";
  const redirectTo = new URL(window.location.pathname, window.location.origin).toString();
  const { error } = await client.auth.resetPasswordForEmail(emailInput.value.trim(), {
    redirectTo
  });
  if (loginMessage) {
    loginMessage.textContent = error
      ? "메일 요청을 처리하지 못했습니다. 잠시 후 다시 시도해 주세요."
      : "계정 존재 여부와 관계없이 요청을 처리했습니다. 받은편지함에서 가장 최근 메일만 열어 주세요.";
  }
  requestPasswordReset.disabled = false;
});

passwordSetup?.addEventListener("submit", async (event) => {
  event.preventDefault();
  if (!client) return;
  const data = new FormData(passwordSetup);
  const password = String(data.get("password") ?? "");
  const confirmation = String(data.get("passwordConfirm") ?? "");
  if (password.length < 12) {
    if (passwordSetupMessage) {
      passwordSetupMessage.textContent = "비밀번호를 12자 이상 입력해 주세요.";
    }
    return;
  }
  if (password !== confirmation) {
    if (passwordSetupMessage) passwordSetupMessage.textContent = "두 비밀번호가 서로 다릅니다.";
    return;
  }

  const button = passwordSetup.querySelector<HTMLButtonElement>('button[type="submit"]');
  if (button) {
    button.disabled = true;
    button.textContent = "비밀번호 저장 중…";
  }
  const { error } = await client.auth.updateUser({ password });
  passwordSetup.reset();
  if (error) {
    if (passwordSetupMessage) {
      passwordSetupMessage.textContent =
        "비밀번호를 저장하지 못했습니다. 새 설정 메일을 다시 요청해 주세요.";
    }
    if (button) {
      button.disabled = false;
      button.textContent = "비밀번호 저장";
    }
    return;
  }

  accessToken = "";
  try {
    await client.auth.signOut();
  } finally {
    showLogin("비밀번호 설정을 마쳤습니다. 새 비밀번호로 로그인해 주세요.");
  }
  if (button) {
    button.disabled = false;
    button.textContent = "비밀번호 저장";
  }
});

login?.addEventListener("submit", async (event) => {
  event.preventDefault();
  if (!client) return;
  const data = new FormData(login);
  const button = login.querySelector<HTMLButtonElement>('button[type="submit"]');
  if (button) button.disabled = true;
  if (loginMessage) loginMessage.textContent = "권한을 확인하는 중…";
  const { data: authData, error } = await client.auth.signInWithPassword({
    email: String(data.get("email") ?? ""),
    password: String(data.get("password") ?? "")
  });
  if (error || !authData.session) {
    if (loginMessage) loginMessage.textContent = "로그인 정보를 확인해 주세요.";
    if (button) button.disabled = false;
    return;
  }

  accessToken = authData.session.access_token;
  try {
    const authorization = await api("/admin-questions/authorize", {
      method: "POST",
      body: JSON.stringify({ eventSlug: consoleRoot?.dataset.eventSlug ?? "" })
    });
    const role =
      typeof authorization === "object" &&
      authorization !== null &&
      "role" in authorization &&
      isOperatorRole(authorization.role)
        ? authorization.role
        : null;
    if (!role) throw new Error("운영진 권한 정보를 확인하지 못했습니다.");
    showWorkspace(role);
    await loadQuestions("initial");
  } catch (authorizationError) {
    if (authorizationError instanceof SessionExpiredError) return;
    const message =
      authorizationError instanceof Error
        ? authorizationError.message
        : "이 행사에 대한 운영진 권한이 없습니다.";
    accessToken = "";
    try {
      await client.auth.signOut();
    } finally {
      showLogin(message);
    }
  } finally {
    if (button) button.disabled = false;
  }
});

refresh?.addEventListener("click", () => void loadQuestions("manual"));

logout?.addEventListener("click", async () => {
  accessToken = "";
  try {
    await client?.auth.signOut();
  } finally {
    showLogin("안전하게 로그아웃했습니다.");
  }
});

for (const button of filterButtons ?? []) {
  button.addEventListener("click", () => {
    const filter = button.dataset.questionFilter;
    if (!filter || !["all", "received", "reviewing", "answered"].includes(filter)) return;
    currentFilter = filter as QuestionFilter;
    updateFilterSummary();
    renderQuestions();
  });
}

list?.addEventListener("submit", async (event) => {
  const target = event.target;
  if (!(target instanceof HTMLFormElement) || !target.matches("[data-answer-form]")) return;
  event.preventDefault();
  if (!canEditQuestions(currentRole)) return;
  const card = target.closest<HTMLElement>("[data-question-id]");
  if (!card) return;
  const question = questions.find((item) => item.id === card.dataset.questionId);
  if (!question) return;
  const data = new FormData(target);
  const button = target.querySelector<HTMLButtonElement>('button[type="submit"]');
  if (button) {
    button.disabled = true;
    button.textContent = "저장 중…";
  }
  try {
    await api("/admin-questions/" + encodeURIComponent(card.dataset.questionId ?? ""), {
      method: "PATCH",
      body: JSON.stringify({
        eventSlug: consoleRoot?.dataset.eventSlug ?? "",
        expectedUpdatedAt: question.updatedAt,
        status: String(data.get("status") ?? ""),
        answer: String(data.get("answer") ?? "")
      })
    });
    await loadQuestions("saved");
  } catch (error) {
    if (error instanceof SessionExpiredError) return;
    if (error instanceof ApiRequestError && error.status === 409) {
      await loadQuestions("manual");
      if (workspaceMessage) {
        workspaceMessage.textContent =
          "다른 운영진의 변경을 반영했습니다. 최신 상태에서 다시 저장해 주세요.";
      }
    } else if (workspaceMessage) {
      workspaceMessage.textContent =
        error instanceof Error ? error.message : "답변을 저장하지 못했습니다.";
    }
  } finally {
    if (button) {
      button.disabled = false;
      button.textContent = "상태·답변 저장";
    }
  }
});

document.addEventListener("visibilitychange", () => {
  if (document.visibilityState !== "visible") {
    stopQuestionPolling();
    return;
  }
  if (accessToken && currentRole && workspace && !workspace.hidden) {
    startQuestionPolling();
    void loadQuestions("automatic");
  }
});

window.addEventListener("pagehide", stopQuestionPolling);
window.addEventListener("pageshow", startQuestionPolling);
