import { api } from './client';
export const winnersApi={
 fixed:(chitId:string)=>api.get(`/v1/draws/chits/${chitId}/winners`),
 auction:(chitId:string)=>api.get(`/v1/auctions/chits/${chitId}/winners`),
};
