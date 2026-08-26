module.exports={
 testRunner:{args:{config:'e2e/config.js'}},
 apps:{
  'android.debug':{
   type:'android.apk',
   binaryPath:'android/app/build/outputs/apk/debug/app-debug.apk',
   build:'cd android && ./gradlew assembleDebug'
  }
 },
 devices:{simulator:{type:'android.emulator',device:{avdName:'Pixel_6_API_35'}}},
 configurations:{'android.debug':{device:'simulator',app:'android.debug'}}
};
