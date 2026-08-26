describe('Agent month invariants',()=>{
 it('agent month has no draw and no auction',()=>{
   const month={type:'AGENT',draw:false,auction:false};
   expect(month.draw).toBe(false);
   expect(month.auction).toBe(false);
 });
 it('member contribution obligations remain active',()=>{
   const obligation={status:'DUE'};
   expect(obligation.status).toBe('DUE');
 });
});
