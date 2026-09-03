import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { employeeCodeForName } from './employeeCodes';

describe('employeeCodeForName', () => {
  it('maps known directory names to EMP codes', () => {
    assert.equal(employeeCodeForName('Rahul'), 'EMP001');
    assert.equal(employeeCodeForName('Priyanka'), 'EMPPRI');
    assert.equal(employeeCodeForName('Govind Pandey'), 'EMPGOV');
    assert.equal(employeeCodeForName('Ankitha H'), 'EMPANK');
  });

  it('matches extra role text after the name', () => {
    assert.equal(employeeCodeForName('Rahul Marketing/HR'), 'EMP001');
  });

  it('returns the original name when unknown', () => {
    assert.equal(employeeCodeForName('Unknown Person'), 'Unknown Person');
  });
});
