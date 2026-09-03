import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { resumeStageForProgress } from './reviewProgress';

describe('resumeStageForProgress', () => {
  it('opens Stage 1 when nothing is completed', () => {
    assert.equal(resumeStageForProgress(0), 1);
  });

  it('opens the last completed stage, not the next empty one', () => {
    assert.equal(resumeStageForProgress(1), 1);
    assert.equal(resumeStageForProgress(2), 2);
    assert.equal(resumeStageForProgress(5), 5);
  });
});
