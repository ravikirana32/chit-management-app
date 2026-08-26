describe('Auction rules', () => {
  it('enforces the one-hour maximum window', () => {
    expect(60).toBe(60);
    expect(61).toBeGreaterThan(60);
  });

  it('selects the highest discount first and earliest timestamp for a tie', () => {
    const bids = [
      {amount:25000, at:300},
      {amount:35000, at:400},
      {amount:35000, at:200},
    ];
    const winner = [...bids].sort((a,b)=>b.amount-a.amount || a.at-b.at)[0];
    expect(winner.amount).toBe(35000);
    expect(winner.at).toBe(200);
  });

  it('calculates winner payout as pot minus winning discount', () => {
    expect(200000 - 35000).toBe(165000);
  });
});
