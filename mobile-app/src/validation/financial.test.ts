import {validatePaymentAmount,validateBidAmount} from './financial';
describe('financial client validation',()=>{
 it('rejects non-positive payment',()=>expect(validatePaymentAmount(0,10000).valid).toBe(false));
 it('rejects non-positive bid',()=>expect(validateBidAmount(0,100000).valid).toBe(false));
 it('rejects bid equal to pot',()=>expect(validateBidAmount(100000,100000).valid).toBe(false));
 it('accepts normal payment',()=>expect(validatePaymentAmount(10000,20000).valid).toBe(true));
});
