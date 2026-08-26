import { api } from './client';

export const auctionsApi = {
  state: (auctionId:string) => api.get(`/v1/auctions/${auctionId}/state`),
  bid: (auctionId:string,payload:any) => api.post(`/v1/auctions/${auctionId}/bids`,payload),
  finalize: (auctionId:string) => api.post(`/v1/auctions/${auctionId}/finalize`,{}),
};
