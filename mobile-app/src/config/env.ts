export const env={
 apiUrl:process.env.EXPO_PUBLIC_API_URL??'',
 socketUrl:process.env.EXPO_PUBLIC_SOCKET_URL??'',
};
if(!env.apiUrl && !process.env.JEST_WORKER_ID) console.warn('EXPO_PUBLIC_API_URL is not configured');
