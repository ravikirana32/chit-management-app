export const financialHttpScenarios=[
 {name:'create fixed chit',method:'POST',path:'/v1/chits'},
 {name:'create auction chit',method:'POST',path:'/v1/chits'},
 {name:'list participants',method:'GET',path:'/v1/chits/:chitId/participants'},
 {name:'publish chit',method:'POST',path:'/v1/chits/:chitId/publish'},
 {name:'submit payment',method:'POST',path:'/v1/payments'},
 {name:'verify payment',method:'POST',path:'/v1/payments/:id/verify'},
 {name:'start fixed draw',method:'POST',path:'/v1/draws/chits/:chitId/start'},
 {name:'place auction bid',method:'POST',path:'/v1/auctions/:auctionId/bids'},
 {name:'finalize auction',method:'POST',path:'/v1/auctions/:auctionId/finalize'},
 {name:'create payout',method:'POST',path:'/v1/payouts'},
 {name:'settle payout',method:'POST',path:'/v1/payouts/:id/settle'}
];
