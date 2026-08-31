export interface Employee {
  id: string;
  name: string;
  department: string;
  role: string;
}

export interface Stage1Data {
  overallPerformance: string;
  biggestWins: string;
  whatWentWrong: string;
  whatCouldBeDifferent: string;
  projectsConsumedTime: string;
  feltStuckOrUnsupported: string;
  selfRating: number;
}

export interface UploadedFile {
  name: string;
  size: number;
  type: string;
  uploaded: boolean;
}

export interface Stage2Data {
  files: UploadedFile[];
  summary: string;
  summaryEdited: boolean;
  projectsIdentified: string[];
  keyOutputs: string[];
  contributionLevel: 'High' | 'Medium' | 'Low' | '';
  notes: string;
  contradictions: string[];
}

export interface InterviewQuestion {
  id: string;
  question: string;
  category: string;
}

export interface InterviewAnswer {
  questionId: string;
  question: string;
  answer: string;
  category: string;
  charCount?: number;
  timeSeconds?: number;
  pasteAttempts?: number;
}

export interface Stage3Data {
  questions: InterviewQuestion[];
  answers: InterviewAnswer[];
}

export interface PeerRating {
  colleagueId: string;
  colleagueName: string;
  ratings: {
    respondsOnTime: number;
    helpsWithTasks: number;
    helpsBeyondScope: number;
    cooperativeEnvironment: number;
    communicationQuality: number;
    professionalEtiquette: number;
    emailEtiquette: number;
    whatsappEtiquette: number;
  };
  interaction: boolean;
}

export interface Stage4Data {
  peerFeedback: PeerRating[];
}

export interface PerformanceDimension {
  name: string;
  score: number;
}

export interface Stage5Data {
  overallScore: number;
  dimensions: PerformanceDimension[];
  majorAchievements: string;
  keyGaps: string;
  developmentPriorities: string;
  peerFeedbackSummary: string;
  aiObservations: string;
}

export interface ReviewState {
  employeeId: string;
  employeeName: string;
  employeeDepartment: string;
  employeeRole: string;
  sessionId: string;
  month: string;
  year: number;
  stage1: Stage1Data | null;
  stage2: Stage2Data | null;
  stage3: Stage3Data | null;
  stage4: Stage4Data | null;
  stage5: Stage5Data | null;
}

export const INITIAL_REVIEW_STATE: ReviewState = {
  employeeId: '',
  employeeName: '',
  employeeDepartment: '',
  employeeRole: '',
  sessionId: '',
  month: '',
  year: 0,
  stage1: null,
  stage2: null,
  stage3: null,
  stage4: null,
  stage5: null,
};

export const STAGE_NAMES: Record<number, string> = {
  1: 'Self Assessment',
  2: 'Work Evidence',
  3: 'AI Interview',
  4: 'Peer Feedback',
  5: 'Final Report',
};

export const PEER_RATING_LABELS: Record<keyof PeerRating['ratings'], string> = {
  respondsOnTime: 'Responds on time',
  helpsWithTasks: 'Helps with tasks (their responsibility)',
  helpsBeyondScope: 'Helps beyond their scope',
  cooperativeEnvironment: 'Creates cooperative environment',
  communicationQuality: 'Communication quality',
  professionalEtiquette: 'Professional etiquette',
  emailEtiquette: 'Email etiquette',
  whatsappEtiquette: 'WhatsApp etiquette',
};
