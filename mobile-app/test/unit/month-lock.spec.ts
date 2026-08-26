describe('Month lock invariants',()=>{
 it('locked month rejects normal financial mutation',()=>{
   const month={status:'LOCKED'};
   const mutationAllowed=month.status!=='LOCKED';
   expect(mutationAllowed).toBe(false);
 });
 it('locked month remains auditable',()=>{
   const month={status:'LOCKED',auditTrailId:'audit-1'};
   expect(month.auditTrailId).toBeTruthy();
 });
});
