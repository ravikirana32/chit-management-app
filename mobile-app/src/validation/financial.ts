export function validatePaymentAmount(amount:number,outstanding:number){
 if(!Number.isFinite(amount)||amount<=0)return {valid:false,message:'Enter a valid payment amount.'};
 if(amount>outstanding)return {valid:false,message:'Payment cannot exceed outstanding amount.'};
 return {valid:true,message:''};
}
export function validateBidAmount(amount:number,pot:number){
 if(!Number.isFinite(amount)||amount<=0)return {valid:false,message:'Enter a valid bid.'};
 if(amount>=pot)return {valid:false,message:'Bid must be below the chit pot.'};
 return {valid:true,message:''};
}
