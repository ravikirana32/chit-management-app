import { io, Socket } from 'socket.io-client';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_BASE_URL } from '@/src/api/client';

const SOCKET_BASE = API_BASE_URL.replace(/\/api\/?$/, '');
let socket: Socket | null = null;

export async function getWinnerRevealSocket(): Promise<Socket> {
  const token = await AsyncStorage.getItem('accessToken');
  if (socket?.connected) return socket;
  socket = io(`${SOCKET_BASE}/winner-reveal`, {
    transports: ['websocket'],
    auth: { token },
    autoConnect: true,
    reconnection: true,
    reconnectionAttempts: Infinity,
  });
  return socket;
}

export async function joinWinnerReveal(kind: 'DRAW'|'AUCTION', id: string, onStarted: (data:any)=>void, onRevealed:(data:any)=>void) {
  const s = await getWinnerRevealSocket();
  const room = `${kind.toLowerCase()}:${id}`;
  const join = () => s.emit('winner-reveal.join', { kind, id });
  s.off('winner-reveal.started', onStarted).off('winner-reveal.revealed', onRevealed);
  s.on('winner-reveal.started', onStarted);
  s.on('winner-reveal.revealed', onRevealed);
  if (s.connected) join(); else s.once('connect', join);
  return () => {
    s.emit('winner-reveal.leave', { kind, id });
    s.off('winner-reveal.started', onStarted);
    s.off('winner-reveal.revealed', onRevealed);
  };
}
