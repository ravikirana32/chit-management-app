import {Redirect} from 'expo-router';
import {useAppSelector} from '@/src/store';
import {resolveRole} from '@/src/navigation/role';

export default function RoleEntry(){
 const {token,bootstrapped,user}=useAppSelector(s=>s.auth);
 if(!bootstrapped)return null;
 if(!token)return <Redirect href="/login"/>;
 return resolveRole(user)==='CREATOR'
  ? <Redirect href="/(creator)"/>
  : <Redirect href="/(member)"/>;
}
