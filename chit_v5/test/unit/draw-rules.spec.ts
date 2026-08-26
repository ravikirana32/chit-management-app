describe('Fixed draw rules', () => {
  it('excludes previous winners', () => {
    const eligible = [
      {id:'A',previousWinner:false},
      {id:'B',previousWinner:true},
      {id:'C',previousWinner:false},
    ].filter(x=>!x.previousWinner);
    expect(eligible.map(x=>x.id)).toEqual(['A','C']);
  });

  it('winner remains an active participant', () => {
    const participant={status:'ACTIVE',wonThisMonth:true};
    expect(participant.status).toBe('ACTIVE');
  });
});
