import React from 'react';
import { useCallHistory, CallRecord } from '../hooks/useCallHistory';

interface CallHistoryProps {
  currentUserId: string;
  onSelectCall?: (call: CallRecord) => void;
}

export const CallHistory: React.FC<CallHistoryProps> = ({ currentUserId, onSelectCall }) => {
  const { calls, loading, hasMore, loadMore } = useCallHistory(currentUserId);
  return (
    <div style={{ padding: '20px', color: '#9ca3af' }}>
      История звонков
    </div>
  );
};

export default CallHistory;