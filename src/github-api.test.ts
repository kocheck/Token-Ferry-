import { describe, it, expect } from 'vitest';
import { generateBranchName, generatePRBody } from './github-api';

describe('generateBranchName', () => {
  it('matches expected format', () => {
    const name = generateBranchName();
    expect(name).toMatch(/^tokens\/update-\d{8}-\d{6}$/);
  });

  it('starts with tokens/update-', () => {
    expect(generateBranchName().startsWith('tokens/update-')).toBe(true);
  });
});

describe('generatePRBody', () => {
  it('includes collection names as bold list', () => {
    const body = generatePRBody(['brand', 'semantic']);
    expect(body).toContain('- **brand**');
    expect(body).toContain('- **semantic**');
  });

  it('includes header', () => {
    const body = generatePRBody(['colors']);
    expect(body).toContain('## Token Ferry Sync');
  });

  it('mentions Token Ferry', () => {
    const body = generatePRBody(['colors']);
    expect(body).toContain('Token Ferry');
  });

  it('handles single collection', () => {
    const body = generatePRBody(['primitives']);
    expect(body).toContain('- **primitives**');
  });

  it('handles empty array', () => {
    const body = generatePRBody([]);
    expect(body).toContain('## Token Ferry Sync');
  });
});
