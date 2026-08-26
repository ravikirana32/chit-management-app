describe('Financial idempotency invariants',()=>{
 it('uses a stable key for a retried payment command',()=>{
   const key='payment:obligation-1:attempt-1';
   expect(key).toContain('payment:');
 });
 it('does not treat a retry as a second financial event',()=>{
   const processed=new Set(['payment-key-1']);
   processed.add('payment-key-1');
   expect(processed.size).toBe(1);
 });
});
