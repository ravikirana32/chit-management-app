import http from 'k6/http';
import {check,sleep} from 'k6';
export const options={vus:10,duration:'30s'};
export default function(){
 const base=__ENV.TEST_API_URL||'http://localhost:3000';
 const r=http.get(`${base}/health`);
 check(r,{'health 200':x=>x.status===200});
 sleep(1);
}
