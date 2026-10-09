import { describe, expect, it } from 'vitest';
import { validateIndianLocation } from '../src/validations/location';

describe('India city and state validation', () => {
  it('accepts a real city in its state and normalizes case and spacing', () => {
    const result = validateIndianLocation('  mumbai ', 'maharashtra');
    expect(result.ok).toBe(true);
    expect(result.city).toBe('Mumbai');
    expect(result.state).toBe('Maharashtra');
  });

  it('rejects a city that belongs to a different state', () => {
    const result = validateIndianLocation('Mumbai', 'Kerala');
    expect(result.ok).toBe(false);
    expect(result.error).toContain('Mumbai');
    expect(result.error).toContain('Kerala');
  });

  it('rejects a city that does not exist', () => {
    const result = validateIndianLocation('NotARealCity', 'Maharashtra');
    expect(result.ok).toBe(false);
  });

  it('rejects an unknown state and blank values', () => {
    expect(validateIndianLocation('Mumbai', 'NotAState').ok).toBe(false);
    expect(validateIndianLocation(' ', 'Maharashtra').ok).toBe(false);
    expect(validateIndianLocation('Mumbai', '').ok).toBe(false);
  });

  it('rejects a misspelling instead of substituting another city', () => {
    const result = validateIndianLocation('Mumbay', 'Maharashtra');
    expect(result.ok).toBe(false);
    expect(result.city).toBeUndefined();
  });
});
