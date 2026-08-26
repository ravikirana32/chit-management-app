import {Tabs} from 'expo-router';
export default function MemberTabs(){
 return <Tabs screenOptions={{headerShown:false}}>
  <Tabs.Screen name="index" options={{title:'Home'}}/>
  <Tabs.Screen name="chits" options={{title:'My Chits'}}/>
  <Tabs.Screen name="notifications" options={{title:'Alerts'}}/>
  <Tabs.Screen name="profile" options={{title:'Profile'}}/>
 </Tabs>
}
