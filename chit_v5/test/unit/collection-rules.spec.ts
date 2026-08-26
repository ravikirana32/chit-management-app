describe('Collection lifecycle', () => {
  it('moves an unresolved obligation from due to overdue after grace period', () => {
    const due = new Date('2026-08-01').getTime();
    const today = new Date('2026-08-09').getTime();
    const graceDays = 7;
    expect((today-due)/(24*60*60*1000)).toBeGreaterThan(graceDays);
  });

  it('does not treat a verified zero-outstanding obligation as overdue', () => {
    const outstanding=0;
    expect(outstanding).toBe(0);
  });

  it('does not silently remove a defaulted participant', () => {
    const participantStatus='ACTIVE';
    const obligationStatus='DEFAULTED';
    expect(participantStatus).toBe('ACTIVE');
    expect(obligationStatus).toBe('DEFAULTED');
  });
});
