import type { InterviewQuestion, Stage1Data, Stage2Data } from './types';

const CLIP = 100;

export const GENERIC_STAGE3_QUESTIONS: InterviewQuestion[] = [
  { id: 'q1', question: 'Describe the most significant decision you made this month and why you made it.', category: 'Reasoning' },
  { id: 'q2', question: 'How does your self-rating compare with the work evidence from this month?', category: 'Gap Analysis' },
  { id: 'q3', question: 'Is there something you said you would do that the work files do not support? Explain.', category: 'Gap Analysis' },
  { id: 'q4', question: 'How would you handle a similar situation differently next time?', category: 'Decision Making' },
  { id: 'q5', question: 'What advice would you give a colleague dealing with the same challenge you faced?', category: 'Advice' },
  { id: 'q6', question: 'If you were advising someone else on your biggest win this month, what would you recommend?', category: 'Advice' },
  { id: 'q7', question: 'Pick your most important project. What was your specific contribution?', category: 'Project Deep Dive' },
  { id: 'q8', question: 'What went wrong in your most challenging project and what caused it?', category: 'Project Deep Dive' },
  { id: 'q9', question: 'What is the most important thing you learned this month and how will it change how you work?', category: 'Reflection' },
  { id: 'q10', question: 'What does this month reveal about how you work at your best and where you still have room to grow?', category: 'Reflection' },
];

export function clipClaim(text: string, max = CLIP): string {
  const t = text.replace(/\s+/g, ' ').trim();
  if (t.length <= max) return t;
  return `${t.slice(0, max - 1).trimEnd()}…`;
}

function firstNonEmpty(...values: Array<string | undefined | null>): string {
  for (const value of values) {
    const t = (value || '').replace(/\s+/g, ' ').trim();
    if (t) return t;
  }
  return '';
}

export function sessionSpecificTokens(
  stage1: Stage1Data | null | undefined,
  stage2: Stage2Data | null | undefined,
): string[] {
  const tokens: string[] = [];
  const push = (raw: string | number | undefined | null) => {
    if (raw === undefined || raw === null) return;
    const t = String(raw).replace(/\s+/g, ' ').trim();
    if (t.length >= 8) tokens.push(t);
  };

  if (stage1?.selfRating != null && Number.isFinite(stage1.selfRating)) {
    tokens.push(`${stage1.selfRating}/5`);
  }
  if (stage2?.contributionLevel) tokens.push(stage2.contributionLevel);

  (stage2?.projectsIdentified || []).forEach((p) => push(p));
  (stage2?.keyOutputs || []).forEach((o) => push(o));
  (stage2?.contradictions || []).forEach((c) => push(c));

  push(stage1?.overallPerformance);
  push(stage1?.biggestWins);
  push(stage1?.whatWentWrong);
  push(stage1?.whatCouldBeDifferent);
  push(stage1?.projectsConsumedTime);

  return tokens;
}

export function isSessionSpecificQuestions(
  questions: InterviewQuestion[],
  stage1: Stage1Data | null | undefined,
  stage2: Stage2Data | null | undefined,
): boolean {
  if (!questions.length) return false;
  const tokens = sessionSpecificTokens(stage1, stage2);
  if (tokens.length === 0) return false;
  const hits = questions.filter((q) => {
    const hay = q.question.toLowerCase();
    return tokens.some((token) => hay.includes(token.toLowerCase()));
  }).length;
  return hits >= 3;
}

export function buildStage3Questions(
  stage1: Stage1Data | null | undefined,
  stage2: Stage2Data | null | undefined,
): InterviewQuestion[] {
  const projects = (stage2?.projectsIdentified || []).map((p) => p.trim()).filter(Boolean);
  const outputs = (stage2?.keyOutputs || []).map((o) => o.trim()).filter(Boolean);
  const contradictions = (stage2?.contradictions || []).map((c) => c.trim()).filter(Boolean);
  const contribution = stage2?.contributionLevel || '';
  const artifact = firstNonEmpty(projects[0], outputs[0]);

  const q1 = artifact
    ? {
        id: 'q1',
        category: 'Reasoning',
        question: `Walk me through the most significant decision you made on ${clipClaim(artifact)} this month and why you made it.`,
      }
    : GENERIC_STAGE3_QUESTIONS[0];

  const hasRating = stage1?.selfRating != null && Number.isFinite(stage1.selfRating);
  const q2 =
    hasRating && contribution
      ? {
          id: 'q2',
          category: 'Gap Analysis',
          question: `You rated yourself ${stage1!.selfRating}/5 while Stage 2 assessed your contribution as ${contribution}. Where does that line up, and where does it not?`,
        }
      : hasRating
        ? {
            id: 'q2',
            category: 'Gap Analysis',
            question: `You rated yourself ${stage1!.selfRating}/5. How does that compare with the work evidence from this month?`,
          }
        : contribution
          ? {
              id: 'q2',
              category: 'Gap Analysis',
              question: `Stage 2 assessed your contribution as ${contribution}. How does that compare with how you see your month?`,
            }
          : GENERIC_STAGE3_QUESTIONS[1];

  const q3 = contradictions[0]
    ? {
        id: 'q3',
        category: 'Gap Analysis',
        question: `Stage 2 flagged this contradiction: “${clipClaim(contradictions[0])}”. How do you explain it?`,
      }
    : stage1?.whatWentWrong?.trim()
      ? {
          id: 'q3',
          category: 'Gap Analysis',
          question: `You wrote that ${clipClaim(stage1.whatWentWrong)}. What in the work files supports or challenges that?`,
        }
      : GENERIC_STAGE3_QUESTIONS[2];

  const q4 = stage1?.whatCouldBeDifferent?.trim()
    ? {
        id: 'q4',
        category: 'Decision Making',
        question: `You said you could have done this differently: “${clipClaim(stage1.whatCouldBeDifferent)}”. How would you handle it next time?`,
      }
    : GENERIC_STAGE3_QUESTIONS[3];

  const q5 = stage1?.whatWentWrong?.trim()
    ? {
        id: 'q5',
        category: 'Advice',
        question: `You described this as going wrong: “${clipClaim(stage1.whatWentWrong)}”. What advice would you give a colleague facing the same challenge?`,
      }
    : GENERIC_STAGE3_QUESTIONS[4];

  const q6 = stage1?.biggestWins?.trim()
    ? {
        id: 'q6',
        category: 'Advice',
        question: `You named this as a win: “${clipClaim(stage1.biggestWins)}”. If you were advising someone else on that, what would you recommend?`,
      }
    : GENERIC_STAGE3_QUESTIONS[5];

  const q7 = projects[0]
    ? {
        id: 'q7',
        category: 'Project Deep Dive',
        question: contribution
          ? `On ${clipClaim(projects[0])}, Stage 2 marked your contribution as ${contribution}. What was your specific contribution?`
          : `On ${clipClaim(projects[0])}, what was your specific contribution?`,
      }
    : GENERIC_STAGE3_QUESTIONS[6];

  const timeSink = stage1?.projectsConsumedTime?.trim();
  const q8 = projects[1]
    ? {
        id: 'q8',
        category: 'Project Deep Dive',
        question: `On ${clipClaim(projects[1])}, what went wrong and what caused it?`,
      }
    : timeSink
      ? {
          id: 'q8',
          category: 'Project Deep Dive',
          question: `You said this consumed time: “${clipClaim(timeSink)}”. What went wrong and what caused it?`,
        }
      : GENERIC_STAGE3_QUESTIONS[7];

  const q9 =
    projects.length >= 3
      ? {
          id: 'q9',
          category: 'Reflection',
          question: `What is the most important thing you learned from ${clipClaim(projects[2])} this month and how will it change how you work?`,
        }
      : GENERIC_STAGE3_QUESTIONS[8];

  return [q1, q2, q3, q4, q5, q6, q7, q8, q9, GENERIC_STAGE3_QUESTIONS[9]];
}
