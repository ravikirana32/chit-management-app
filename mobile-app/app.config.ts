import type { ExpoConfig } from 'expo/config';
export default ():ExpoConfig=>({name:'Chit Management',slug:'chit-management',version:'1.0.0',scheme:'chitmanagement',plugins:['expo-router'],android:{package:'com.ravikirana.chitmanagement'},ios:{bundleIdentifier:'com.ravikirana.chitmanagement'}});
