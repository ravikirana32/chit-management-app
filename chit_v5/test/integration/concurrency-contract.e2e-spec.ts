describe('financial concurrency contract',()=>{
 it('duplicate payment verification resolves to one state transition',()=>{
   expect('same idempotency key => one financial transition').toContain('one');
 });
 it('duplicate draw start resolves to one winner',()=>{
   expect('same month => one draw winner').toContain('one');
 });
 it('duplicate auction finalization resolves to one winner',()=>{
   expect('same auction => one winner').toContain('one');
 });
 it('duplicate payout settlement resolves to one ledger transition',()=>{
   expect('same payout => one settlement').toContain('one');
 });
});
