import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import type { Stage1Data, Stage2Data } from './types';
import {
  buildStage3Questions,
  GENERIC_STAGE3_QUESTIONS,
  isSessionSpecificQuestions,
} from './stage3Questions';

const filledStage1: Stage1Data = {
  overallPerformance: 'Strong month on delivery',
  biggestWins: 'Closed the Q2 ledger three days early',
  whatWentWrong: 'Missed the vendor SLA twice',
  whatCouldBeDifferent: 'Escalate blocked invoices earlier',
  projectsConsumedTime: 'Vendor portal rework',
  feltStuckOrUnsupported: 'Needed finance ops cover',
  selfRating: 4,
};

const filledStage2: Stage2Data = {
  files: [],
  summary: 'Two workstreams with mixed punctuality.',
  summaryEdited: false,
  projectsIdentified: ['Ledger close', 'Vendor portal'],
  keyOutputs: ['Q2 pack'],
  contributionLevel: 'High',
  notes: '',
  contradictions: ['Claimed 100% on-time but files show 2 late invoices'],
};

describe('buildStage3Questions', () => {
  it('fills q2, q3, and q7 from rating, contradiction, and first project', () => {
    const questions = buildStage3Questions(filledStage1, filledStage2);
    assert.equal(questions.length, 10);
    const byId = Object.fromEntries(questions.map((q) => [q.id, q.question]));
    assert.match(byId.q2, /4\/10/);
    assert.match(byId.q2, /High/);
    assert.match(byId.q3, /Claimed 100% on-time/);
    assert.match(byId.q7, /Ledger close/);
    assert.match(byId.q7, /High/);
    assert.match(byId.q1, /Ledger close/);
    assert.match(byId.q8, /Vendor portal/);
  });

  it('returns 10 generic slots when Stage 1 and Stage 2 are empty', () => {
    const questions = buildStage3Questions(null, null);
    assert.equal(questions.length, 10);
    assert.deepEqual(questions, GENERIC_STAGE3_QUESTIONS);
  });

  it('uses generic q9 when fewer than three projects', () => {
    const questions = buildStage3Questions(filledStage1, filledStage2);
    assert.equal(questions[8].question, GENERIC_STAGE3_QUESTIONS[8].question);
  });
});

describe('isSessionSpecificQuestions', () => {
  it('requires at least three questions to mention session tokens', () => {
    const built = buildStage3Questions(filledStage1, filledStage2);
    assert.equal(isSessionSpecificQuestions(built, filledStage1, filledStage2), true);
    assert.equal(
      isSessionSpecificQuestions(GENERIC_STAGE3_QUESTIONS, filledStage1, filledStage2),
      false,
    );
  });
});
