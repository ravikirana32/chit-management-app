import 'dotenv/config';
export default {
  expo:{
    name:'Chit Funds',
    slug:'chit-funds',
    version:'0.1.0',
    orientation:'portrait',
    scheme:'chitfunds',
    plugins:['expo-router'],
    android:{package:'com.example.chitfunds'},
    ios:{bundleIdentifier:'com.example.chitfunds'},
    extra:{
      apiUrl:process.env.EXPO_PUBLIC_API_URL,
      socketUrl:process.env.EXPO_PUBLIC_SOCKET_URL
    }
  }
};
