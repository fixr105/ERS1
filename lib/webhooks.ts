import type { PeerRating, ReviewState, Stage1Data, Stage2Data } from './types';
import {
  buildStage3Questions,
  GENERIC_STAGE3_QUESTIONS,
  isSessionSpecificQuestions,
} from './stage3Questions';

const N8N_PREFIX = process.env.NEXT_PUBLIC_N8N_PREFIX || '/api/n8n';

export const WEBHOOKS = {
  getEmployees: `${N8N_PREFIX}/get-employees`,
  submitStage1: `${N8N_PREFIX}/submit-stage1`,
  ingestStage2File: `${N8N_PREFIX}/ingest-stage2-file`,
  submitStage2: `${N8N_PREFIX}/submit-stage2`,
  getStage2Summary: `${N8N_PREFIX}/stage2-summary`,
  getStage3Questions: `${N8N_PREFIX}/stage3-questions`,
  submitStage3: `${N8N_PREFIX}/submit-stage3`,
  submitStage4: `${N8N_PREFIX}/submit-stage4`,
  generateReport: `${N8N_PREFIX}/generate-report`,
} as const;

export function validateWebhooks(): string[] {
  return Object.values(WEBHOOKS).filter((url) => !url);
}

export function isAirtableRecordId(id: string | undefined | null): id is string {
  return typeof id === 'string' && id.startsWith('rec');
}

export class WebhookError extends Error {
  status?: number;

  constructor(message: string, status?: number) {
    super(message);
    this.name = 'WebhookError';
    this.status = status;
  }
}

async function parseResponse<T>(res: Response): Promise<T> {
  const text = await res.text();
  if (!res.ok) {
    throw new WebhookError(
      `Request failed: ${res.status}${text ? ` — ${text.slice(0, 180)}` : ''}`,
      res.status,
    );
  }
  if (!text.trim()) {
    return {} as T;
  }
  return JSON.parse(text) as T;
}

function linkedRecordId(value: unknown): string | undefined {
  if (!value) return undefined;
  if (typeof value === 'string' && value.startsWith('rec')) return value;
  if (Array.isArray(value) && value.length > 0) return linkedRecordId(value[0]);
  if (typeof value === 'object' && value !== null && 'id' in value) {
    return String((value as { id: string }).id);
  }
  return undefined;
}

function normalizeStage1Result(raw: unknown, fallbackSessionId: string): Stage1SubmitResult {
  if (raw && typeof raw === 'object' && !Array.isArray(raw) && 'success' in raw) {
    const typed = raw as Stage1SubmitResult;
    return {
      success: typed.success !== false,
      sessionId: typed.sessionId || fallbackSessionId,
      stage1Id: typed.stage1Id,
    };
  }

  const record = Array.isArray(raw) ? raw[0] : raw;
  if (record && typeof record === 'object' && 'id' in record) {
    const fields = (record as { fields?: Record<string, unknown> }).fields || {};
    return {
      success: true,
      sessionId:
        linkedRecordId(fields.Session) ||
        linkedRecordId(fields['Session ID']) ||
        fallbackSessionId,
      stage1Id: String((record as { id: string }).id),
    };
  }

  return { success: true, sessionId: fallbackSessionId };
}

async function getJSON<T>(url: string): Promise<T> {
  if (!url) throw new WebhookError('Webhook URL not configured');
  const res = await fetch(url, { method: 'GET', headers: { Accept: 'application/json' } });
  return parseResponse<T>(res);
}

async function postJSON<T>(url: string, body: unknown, timeoutMs?: number): Promise<T> {
  if (!url) throw new WebhookError('Webhook URL not configured');
  const controller = timeoutMs ? new AbortController() : undefined;
  const timer = timeoutMs ? setTimeout(() => controller!.abort(), timeoutMs) : undefined;
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify(body),
      signal: controller?.signal,
    });
    return parseResponse<T>(res);
  } catch (err) {
    if (err instanceof Error && err.name === 'AbortError') {
      throw new WebhookError('Request timed out');
    }
    throw err;
  } finally {
    if (timer) clearTimeout(timer);
  }
}

function toCsv(values: string[] | string | undefined): string {
  if (Array.isArray(values)) return values.filter(Boolean).join(', ');
  return values || '';
}

function fromCsv(value: unknown): string[] {
  if (Array.isArray(value)) return value.map(String).map((s) => s.trim()).filter(Boolean);
  if (typeof value === 'string') return value.split(',').map((s) => s.trim()).filter(Boolean);
  return [];
}

function stage1ToQ(stage1: Stage1Data | null | undefined) {
  return {
    q1: stage1?.overallPerformance || '',
    q2: stage1?.biggestWins || '',
    q3: stage1?.whatWentWrong || '',
    q4: stage1?.whatCouldBeDifferent || '',
    q5: stage1?.projectsConsumedTime || '',
    q6: stage1?.feltStuckOrUnsupported || '',
    q7: stage1?.selfRating ?? '',
  };
}

export interface EmployeeResponse {
  id: string;
  name: string;
  department: string;
  role: string;
  email?: string;
}

interface EmployeesWebhookResponse {
  employees?: EmployeeResponse[];
  count?: number;
}

function isRealEmployee(employee: EmployeeResponse): boolean {
  const name = (employee.name || '').trim();
  if (!name) return false;
  if (/^NOTES:/i.test(name)) return false;
  const junk = new Set(['name', 'single line text', 'email', 'department', 'role']);
  if (junk.has(name.toLowerCase())) return false;
  if (employee.email?.includes('@')) return true;
  return Boolean(employee.department && employee.role);
}

export async function fetchEmployees(): Promise<EmployeeResponse[]> {
  const data = await getJSON<EmployeesWebhookResponse | EmployeeResponse[]>(WEBHOOKS.getEmployees);
  const list = Array.isArray(data) ? data : data.employees;
  if (!list) throw new WebhookError('Employee list missing from webhook response');
  return list.filter(isRealEmployee);
}

export interface Stage1SubmitResult {
  success: boolean;
  sessionId?: string;
  stage1Id?: string;
}

export function submitStage1(
  employeeId: string,
  employeeName: string,
  sessionId: string,
  month: string,
  year: number,
  answers: Record<string, string | number>,
  timeSpentSeconds: number,
): Promise<Stage1SubmitResult> {
  const ordered = [
    String(answers.overallPerformance || ''),
    String(answers.biggestWins || ''),
    String(answers.whatWentWrong || ''),
    String(answers.whatCouldBeDifferent || ''),
    String(answers.projectsConsumedTime || ''),
    String(answers.feltStuckOrUnsupported || ''),
    answers.selfRating ?? 5,
  ];

  return postJSON<unknown>(WEBHOOKS.submitStage1, {
    employeeId,
    employeeName,
    sessionId,
    month,
    year,
    answers: ordered.map((answer) => ({
      answer,
      charCount: typeof answer === 'string' ? answer.length : 0,
    })),
    timeSpentSeconds,
    weeklyContext: '',
  }, 20000).then((raw) => normalizeStage1Result(raw, sessionId));
}

export interface Stage2FilePayload {
  name: string;
  type: string;
  size: number;
  parsedContent?: string;
  url?: string;
}

export interface Stage2SummaryResponse {
  summary: string;
  projectsIdentified: string[];
  keyOutputs: string[];
  contributionLevel: 'High' | 'Medium' | 'Low';
  notes: string;
  contradictions: string[];
}

async function postForm<T>(url: string, form: FormData): Promise<T> {
  if (!url) throw new WebhookError('Webhook URL not configured');
  const res = await fetch(url, {
    method: 'POST',
    headers: { Accept: 'application/json' },
    body: form,
  });
  return parseResponse<T>(res);
}

export async function ingestStage2File(input: {
  sessionId: string;
  employeeId: string;
  file: File;
  url?: string;
}): Promise<{ success: boolean; fileId?: string; parsed?: boolean }> {
  const form = new FormData();
  form.append('sessionId', input.sessionId);
  form.append('employeeId', input.employeeId);
  form.append('name', input.file.name);
  form.append('type', input.file.type || 'application/pdf');
  form.append('size', String(input.file.size));
  form.append('url', input.url || '');
  form.append('file', input.file, input.file.name);
  return postForm(WEBHOOKS.ingestStage2File, form);
}

interface RawStage2Summary {
  summary?: string;
  aiSummary?: string;
  projectsIdentified?: string | string[];
  keyOutputs?: string | string[];
  contributionLevel?: string;
  notes?: string;
  aiObservations?: string;
  contradictions?: string[];
}

function normalizeContribution(value: unknown): 'High' | 'Medium' | 'Low' {
  const raw = String(value || '').toLowerCase();
  if (raw === 'high') return 'High';
  if (raw === 'low') return 'Low';
  return 'Medium';
}

export async function getStage2Summary(
  employeeId: string,
  sessionId: string,
  stage1: Stage1Data | null,
  fileList: Stage2FilePayload[],
): Promise<Stage2SummaryResponse> {
  const raw = await postJSON<RawStage2Summary>(WEBHOOKS.getStage2Summary, {
    employeeId,
    sessionId,
    stage1: stage1ToQ(stage1),
    fileList,
  });

  return {
    summary: raw.aiSummary || raw.summary || '',
    projectsIdentified: fromCsv(raw.projectsIdentified),
    keyOutputs: fromCsv(raw.keyOutputs),
    contributionLevel: normalizeContribution(raw.contributionLevel),
    notes: raw.aiObservations || raw.notes || '',
    contradictions: fromCsv(raw.contradictions),
  };
}

export function confirmStage2Summary(input: {
  employeeId: string;
  sessionId: string;
  files: Stage2FilePayload[];
  summary: string;
  edited: boolean;
  projectsIdentified: string[];
  keyOutputs: string[];
  contributionLevel: string;
  aiObservations: string;
  contradictions?: string[];
  timeSpentSeconds: number;
}): Promise<{ success: boolean; stage2Id?: string }> {
  const contradictionBlock = (input.contradictions || []).length
    ? `\n\nContradictions:\n${input.contradictions!.map((c) => `- ${c}`).join('\n')}`
    : '';

  return postJSON(WEBHOOKS.submitStage2, {
    sessionId: input.sessionId,
    employeeId: input.employeeId,
    files: input.files,
    summary: input.summary,
    aiRawSummary: input.summary,
    edited: input.edited,
    projectsIdentified: toCsv(input.projectsIdentified),
    keyOutputs: toCsv(input.keyOutputs),
    contributionLevel: input.contributionLevel || 'Medium',
    aiObservations: `${input.aiObservations}${contradictionBlock}`,
    contradictions: input.contradictions || [],
    confirmationAccepted: true,
    timeSpentSeconds: input.timeSpentSeconds,
  });
}

export interface Stage3QuestionsResponse {
  questions: { id: string; question: string; category: string }[];
}

function unwrapStage3Questions(raw: unknown): Stage3QuestionsResponse {
  if (Array.isArray(raw)) {
    const first = raw[0] as
      | { questions?: Stage3QuestionsResponse['questions']; question?: string }
      | undefined;
    if (first?.questions && Array.isArray(first.questions)) {
      return { questions: first.questions };
    }
    if (first && typeof first.question === 'string') {
      return { questions: raw as Stage3QuestionsResponse['questions'] };
    }
    return { questions: [] };
  }
  if (raw && typeof raw === 'object' && Array.isArray((raw as Stage3QuestionsResponse).questions)) {
    return raw as Stage3QuestionsResponse;
  }
  return { questions: [] };
}

export const FALLBACK_STAGE3_QUESTIONS = GENERIC_STAGE3_QUESTIONS;

export async function getStage3Questions(
  employeeId: string,
  sessionId: string,
  stage1: Stage1Data | null,
  stage2: Stage2Data | null,
): Promise<Stage3QuestionsResponse> {
  const built = buildStage3Questions(stage1, stage2);
  const stage1Summary = stage1
    ? `Overall: ${stage1.overallPerformance}. Wins: ${stage1.biggestWins}. Issues: ${stage1.whatWentWrong}. Rating: ${stage1.selfRating}/10. Could be different: ${stage1.whatCouldBeDifferent}. Time sinks: ${stage1.projectsConsumedTime}`
    : '';
  const projects = stage2?.projectsIdentified || [];

  try {
    const raw = await postJSON<unknown>(WEBHOOKS.getStage3Questions, {
      employeeId,
      sessionId,
      stage1Summary,
      stage2Summary: stage2?.summary || '',
      projectsIdentified: toCsv(projects),
      projectsIdentifiedList: projects,
      selfRating: stage1?.selfRating,
      contributionLevel: stage2?.contributionLevel || '',
      contradictions: stage2?.contradictions || [],
      keyOutputs: stage2?.keyOutputs || [],
    });
    const res = unwrapStage3Questions(raw);
    if (res.questions?.length && isSessionSpecificQuestions(res.questions, stage1, stage2)) {
      return res;
    }
    if (!res.questions?.length) {
      console.warn('stage3-questions returned no questions, using templated questions');
    } else {
      console.warn('stage3-questions looked generic, using templated questions');
    }
    return { questions: built };
  } catch (err) {
    console.warn('stage3-questions webhook failed, using templated questions', err);
    return { questions: built };
  }
}

export interface Stage3QAPayload {
  questionId?: string;
  question: string;
  answer: string;
  category?: string;
  charCount?: number;
  timeSeconds?: number;
  pasteAttempts?: number;
}

export function submitStage3(
  employeeId: string,
  sessionId: string,
  qa: Stage3QAPayload[],
  timeSpentSeconds: number,
  contextUsed = '',
): Promise<{ success: boolean; stage3Id?: string; pasteAttempts?: number; flagged?: boolean }> {
  return postJSON(WEBHOOKS.submitStage3, {
    employeeId,
    sessionId,
    qa: qa.map((item) => ({
      question: item.question,
      category: item.category || '',
      answer: item.answer,
      charCount: item.charCount ?? item.answer.length,
      timeSeconds: item.timeSeconds || 0,
      pasteAttempts: item.pasteAttempts || 0,
    })),
    contextUsed,
    aiGenerated: true,
    timeSpentSeconds,
  });
}

export function submitStage4(
  employeeId: string,
  employeeName: string,
  sessionId: string,
  month: string,
  peerFeedback: PeerRating[],
  timeSpentSeconds: number,
  biasWarningShown = false,
): Promise<{ success: boolean }> {
  return postJSON(WEBHOOKS.submitStage4, {
    employeeId,
    employeeName,
    sessionId,
    month,
    timeSpentSeconds,
    peerFeedback: peerFeedback.map((peer) => ({
      colleagueId: peer.colleagueName,
      colleagueName: peer.colleagueName,
      revieweeName: peer.colleagueName,
      interaction: peer.interaction,
      biasWarningShown,
      ratings: {
        respondsOnTime: peer.ratings.respondsOnTime,
        helpsWithOwnTasks: peer.ratings.helpsWithTasks,
        helpsBeyondScope: peer.ratings.helpsBeyondScope,
        cooperativeEnvironment: peer.ratings.cooperativeEnvironment,
        communicationQuality: peer.ratings.communicationQuality,
        professionalEtiquette: peer.ratings.professionalEtiquette,
        emailEtiquette: peer.ratings.emailEtiquette,
        whatsappEtiquette: peer.ratings.whatsappEtiquette,
      },
    })),
  });
}

export interface Stage5ReportResponse {
  overallScore: number;
  dimensions: { name: string; score: number }[];
  majorAchievements: string;
  keyGaps: string;
  developmentPriorities: string;
  peerFeedbackSummary: string;
  aiObservations: string;
  fullReportMarkdown?: string;
}

const DIMENSION_LABELS: Record<string, string> = {
  qualityOfWork: 'Quality of Work',
  quantityOfOutput: 'Quantity of Output',
  problemSolving: 'Problem Solving',
  ownership: 'Ownership',
  decisionMaking: 'Decision Making',
  communication: 'Communication',
  collaboration: 'Collaboration',
  selfAwareness: 'Self-Awareness',
};

function normalizeDimensions(raw: unknown): { name: string; score: number }[] {
  if (Array.isArray(raw)) {
    return raw
      .map((item) => ({
        name: String(item?.name || ''),
        score: Number(item?.score || 0),
      }))
      .filter((item) => item.name);
  }
  if (raw && typeof raw === 'object') {
    return Object.entries(raw as Record<string, number>).map(([key, score]) => ({
      name: DIMENSION_LABELS[key] || key,
      score: Number(score || 0),
    }));
  }
  return [];
}

interface RawStage5Report {
  overallScore?: number;
  dimensions?: unknown;
  majorAchievements?: string;
  keyGaps?: string;
  developmentPriorities?: string;
  peerFeedbackSummary?: string;
  aiObservations?: string;
  crossStageObservations?: string;
  fullReportMarkdown?: string;
}

function unwrapReportPayload(raw: unknown): RawStage5Report {
  if (Array.isArray(raw)) {
    const first = raw[0];
    if (first && typeof first === 'object' && !Array.isArray(first)) {
      return first as RawStage5Report;
    }
    return {};
  }
  if (raw && typeof raw === 'object') return raw as RawStage5Report;
  return {};
}

let generateReportInflight: Promise<Stage5ReportResponse> | null = null;

export function generateReport(
  employeeId: string,
  sessionId: string,
  reviewState: ReviewState,
  timeSpentSeconds: number,
): Promise<Stage5ReportResponse> {
  if (generateReportInflight) return generateReportInflight;

  const stage3Qa = (reviewState.stage3?.answers || []).map((item) => ({
    question: item.question,
    category: item.category,
    answer: item.answer,
    charCount: item.charCount ?? item.answer.length,
    timeSeconds: item.timeSeconds || 0,
    pasteAttempts: item.pasteAttempts || 0,
  }));

  generateReportInflight = postJSON<unknown>(WEBHOOKS.generateReport, {
    employeeId,
    sessionId,
    employeeName: reviewState.employeeName,
    month: reviewState.month,
    year: reviewState.year,
    role: reviewState.employeeRole,
    department: reviewState.employeeDepartment,
    timeSpentSeconds,
    stage1: stage1ToQ(reviewState.stage1),
    stage2: {
      finalSummary: reviewState.stage2?.summary || '',
      projectsIdentified: toCsv(reviewState.stage2?.projectsIdentified),
      keyOutputs: toCsv(reviewState.stage2?.keyOutputs),
      contributionLevel: reviewState.stage2?.contributionLevel || '',
      employeeEditedSummary: !!reviewState.stage2?.summaryEdited,
      aiObservations: reviewState.stage2?.notes || '',
    },
    stage3: {
      qa: stage3Qa,
      totalPasteAttempts: stage3Qa.reduce((sum, item) => sum + (item.pasteAttempts || 0), 0),
    },
    stage4: (reviewState.stage4?.peerFeedback || []).map((peer) => ({
      colleagueId: peer.colleagueName,
      colleagueName: peer.colleagueName,
      revieweeName: peer.colleagueName,
      interaction: peer.interaction,
      ratings: {
        respondsOnTime: peer.ratings.respondsOnTime,
        helpsWithOwnTasks: peer.ratings.helpsWithTasks,
        helpsBeyondScope: peer.ratings.helpsBeyondScope,
        cooperativeEnvironment: peer.ratings.cooperativeEnvironment,
        communicationQuality: peer.ratings.communicationQuality,
        professionalEtiquette: peer.ratings.professionalEtiquette,
        emailEtiquette: peer.ratings.emailEtiquette,
        whatsappEtiquette: peer.ratings.whatsappEtiquette,
      },
    })),
  }, 180000).then((raw) => {
    const body = unwrapReportPayload(raw);
    const hasContent =
      body.overallScore != null ||
      Boolean(body.fullReportMarkdown) ||
      Boolean(body.majorAchievements) ||
      (Array.isArray(body.dimensions) && body.dimensions.length > 0);
    if (!hasContent) {
      throw new WebhookError('Empty report response');
    }
    return {
      overallScore: Number(body.overallScore || 0),
      dimensions: normalizeDimensions(body.dimensions),
      majorAchievements: body.majorAchievements || '',
      keyGaps: body.keyGaps || '',
      developmentPriorities: body.developmentPriorities || '',
      peerFeedbackSummary: body.peerFeedbackSummary || '',
      aiObservations: body.aiObservations || body.crossStageObservations || '',
      fullReportMarkdown: body.fullReportMarkdown || '',
    };
  }).finally(() => {
    generateReportInflight = null;
  });

  return generateReportInflight;
}
