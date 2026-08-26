import {Tabs} from 'expo-router';
export default function CreatorTabs(){
 return <Tabs screenOptions={{headerShown:false}}>
  <Tabs.Screen name="index" options={{title:'Dashboard'}}/>
  <Tabs.Screen name="chits" options={{title:'Chits'}}/>
  <Tabs.Screen name="collections" options={{title:'Collections'}}/>
  <Tabs.Screen name="payouts" options={{title:'Payouts'}}/>
  <Tabs.Screen name="profile" options={{title:'Profile'}}/>
 </Tabs>
}
