'use strict';
module.exports={
 async up(q,S){
  try{await q.addConstraint('user_payment_profiles',{fields:['user_id'],type:'unique',name:'uq_user_payment_profile_user'});}catch{}
  try{await q.addConstraint('user_roles',{fields:['user_id','role'],type:'unique',name:'uq_user_role'});}catch{}
 },
 async down(q,S){
  try{await q.removeConstraint('user_payment_profiles','uq_user_payment_profile_user');}catch{}
  try{await q.removeConstraint('user_roles','uq_user_role');}catch{}
 }
};
