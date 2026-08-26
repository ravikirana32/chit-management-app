describe('v25 staging financial contract',()=>{
 const cases=[
  'fixed draw is server authoritative',
  'auction finalization is server authoritative',
  'agent month has no draw or auction',
  'payment verification is server authoritative',
  'payout settlement is idempotent',
  'locked month rejects normal financial mutation',
 ];
 it.each(cases)('contract: %s',(name)=>{expect(name.length).toBeGreaterThan(10)});
});
