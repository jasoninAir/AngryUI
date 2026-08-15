import { useEffect, useState } from 'react';
import { useWebSocket } from './useWebSocket';

function wsUrl(): string {
  const proto = location.protocol === 'https:' ? 'wss' : 'ws';
  return `${proto}://${location.host}/ws`;
}

export function useQuota() {
  const { send, lastMessage } = useWebSocket(wsUrl());
  const [output, setOutput] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (lastMessage?.type === 'quota:result') {
      setOutput(lastMessage.payload.output);
      setLoading(false);
    }
  }, [lastMessage]);

  const refresh = () => {
    setLoading(true);
    send({
      type: 'chat:quota',
      conversationId: 'system',
      payload: {},
      timestamp: Date.now()
    });
  };

  return { output, loading, refresh };
}
