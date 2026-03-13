import { getDnsInstructions, isApexDomain } from '../dns-instructions';

describe('dns instructions', () => {
  it('treats a root domain as an apex domain', () => {
    expect(isApexDomain('barriemenshockey.com')).toBe(true);

    const instructions = getDnsInstructions('barriemenshockey.com');
    expect(instructions.primaryRecord.type).toBe('A');
    expect(instructions.primaryRecord.host).toBe('@');
    expect(instructions.additionalRecords[0]?.host).toBe('www');
  });

  it('treats a nested host as a subdomain', () => {
    expect(isApexDomain('play.barriemenshockey.com')).toBe(false);

    const instructions = getDnsInstructions('play.barriemenshockey.com');
    expect(instructions.primaryRecord.type).toBe('CNAME');
    expect(instructions.primaryRecord.host).toBe('play');
    expect(instructions.additionalRecords).toHaveLength(0);
  });

  it('handles common compound suffixes as apex domains', () => {
    expect(isApexDomain('league.co.uk')).toBe(true);
    expect(isApexDomain('play.league.co.uk')).toBe(false);
  });
});
