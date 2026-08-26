import { api } from './client';
export const collectionsApi={
 overdue:(chitId:string)=>api.get(`/v1/collections/chits/${chitId}/overdue`),
};
