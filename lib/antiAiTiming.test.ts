import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  isAnsweredWithAi,
  minMsForField,
  shouldInvalidateReport,
  STAGE1_TEXT_MIN_MS,
  timingFieldsForReview,
} from './antiAiTiming';

describe('isAnsweredWithAi', () => {
  it('flags missing tickets as AI', () => {
    assert.equal(isAnsweredWithAi(null, Date.now(), 45_000), true);
  });

  it('flags answers submitted before the minimum dwell', () => {
    const issued = 1_000_000;
    assert.equal(isAnsweredWithAi(issued, issued + 5_000, STAGE1_TEXT_MIN_MS), true);
  });

  it('allows answers that waited the minimum dwell', () => {
    const issued = 1_000_000;
    assert.equal(isAnsweredWithAi(issued, issued + STAGE1_TEXT_MIN_MS, STAGE1_TEXT_MIN_MS), false);
  });
});

describe('shouldInvalidateReport', () => {
  it('keeps the score when 0 or 1 answers are flagged', () => {
    assert.equal(shouldInvalidateReport(0), false);
    assert.equal(shouldInvalidateReport(1), false);
  });

  it('zeros the report when more than one answer is flagged', () => {
    assert.equal(shouldInvalidateReport(2), true);
  });
});

describe('minMsForField', () => {
  it('maps stage prefixes', () => {
    assert.equal(minMsForField('s1.overallPerformance'), STAGE1_TEXT_MIN_MS);
    assert.ok(minMsForField('s3.q1') > 0);
  });
});

describe('timingFieldsForReview', () => {
  it('includes filled stage 1 and 3 answers', () => {
    const fields = timingFieldsForReview({
      stage1: { overallPerformance: 'hello', biggestWins: '' },
      stage2: { summaryEdited: true },
      stage3: { answers: [{ questionId: 'q1', answer: 'typed' }] },
    });
    assert.deepEqual(fields, ['s1.overallPerformance', 's2.editedSummary', 's3.q1']);
  });
});
