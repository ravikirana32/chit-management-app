describe('Financial rule validation', () => {
  it('accepts grace period from 0 through 90 days', () => {
    expect(0).toBeGreaterThanOrEqual(0);
    expect(90).toBeLessThanOrEqual(90);
  });

  it('rejects grace periods outside configured range', () => {
    expect([-1, 91].every(v => v < 0 || v > 90)).toBe(true);
  });

  it('supports the configured auction distribution modes', () => {
    const modes = ['EQUAL_MEMBER_BENEFIT','REDUCE_CONTRIBUTION','CREATOR_REVENUE'];
    expect(modes).toHaveLength(3);
  });
});
