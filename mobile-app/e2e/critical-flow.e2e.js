describe('critical chit flow',()=>{
  beforeAll(async()=>{ /* launch app + seed test environment */ });
  it('logs in',async()=>{
    // await element(by.id('login-mobile')).typeText(process.env.TEST_CREATOR_MOBILE);
    // await element(by.id('login-submit')).tap();
    // await element(by.id('login-otp')).typeText(process.env.TEST_OTP);
    // await element(by.id('login-submit')).tap();
  });
  it('runs payment flow',async()=>{
    // await element(by.id('payment-amount')).typeText('200000');
    // await element(by.id('payment-submit')).tap();
  });
  it('runs auction bid flow',async()=>{
    // await element(by.id('auction-bid')).typeText('20000');
    // await element(by.id('auction-submit')).tap();
  });
  it('runs fixed draw flow',async()=>{
    // await element(by.id('fixed-draw-submit')).tap();
  });
  it('logs out',async()=>{
    // await element(by.id('logout-button')).tap();
  });
});
