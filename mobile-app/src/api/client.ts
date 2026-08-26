import axios from 'axios';
import {createRequestId} from './observability';

export const api=axios.create({
  baseURL:process.env.EXPO_PUBLIC_API_URL,
  timeout:15000
});

api.interceptors.request.use(config=>{
  config.headers=config.headers??{};
  config.headers['X-Request-Id']=createRequestId();
  config.headers['X-Client-Version']='0.1.0';
  return config;
});

export function setAccessToken(token:string){
  if(token) api.defaults.headers.common.Authorization=`Bearer ${token}`;
  else delete api.defaults.headers.common.Authorization;
}
