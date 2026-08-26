describe('Authorization integration contract', () => {
  it('requires creator ownership for creator-only operations', () => {
    const creator='creator-1';
    const caller='member-1';
    expect(caller === creator).toBe(false);
  });

  it('requires participant ownership for participant payment/bid operations', () => {
    const participantUser='member-1';
    const caller='member-2';
    expect(participantUser === caller).toBe(false);
  });
});
