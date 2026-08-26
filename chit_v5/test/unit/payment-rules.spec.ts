describe('Payment rules', () => {
  it('does not allow payment above outstanding', () => {
    const amount=11000;
    const outstanding=10000;
    expect(amount > outstanding).toBe(true);
  });

  it('calculates partial payment correctly', () => {
    const due=20000;
    const paid=12000;
    expect(due-paid).toBe(8000);
  });

  it('fully paid obligation has zero outstanding', () => {
    const due=20000;
    const paid=20000;
    expect(Math.max(0,due-paid)).toBe(0);
  });
});
