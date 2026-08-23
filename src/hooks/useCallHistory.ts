import { useState, useEffect, useCallback } from 'react';
import { prismaService } from '../services/prismaService';

export interface CallRecord {
  id: string;
  callerId: string;
  receiverId: string;
  callType: string;
  status: string;
  duration: number;
  createdAt: string;
}

export function useCallHistory(userId: string) {
  const [calls, setCalls] = useState<CallRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [offset, setOffset] = useState(0);

  const loadCalls = useCallback(async (reset: boolean = false) => {
    if (loading) return;
    
    setLoading(true);
    try {
      const currentOffset = reset ? 0 : offset;
      const rawCalls = await prismaService.getCallHistory(userId, 50, currentOffset);
      const newCalls: CallRecord[] = rawCalls.map(call => ({
        id: call.id,
        callerId: call.callerId,
        receiverId: call.receiverId,
        callType: call.callType,
        status: call.status,
        duration: call.duration,
        createdAt: call.createdAt instanceof Date ? call.createdAt.toISOString() : call.createdAt
      }));
      
      if (reset) {
        setCalls(newCalls);
        setOffset(50);
      } else {
        setCalls(prev => [...prev, ...newCalls]);
        setOffset(prev => prev + 50);
      }
      
      setHasMore(newCalls.length === 50);
    } catch (error) {
      console.error('Failed to load call history:', error);
    } finally {
      setLoading(false);
    }
  }, [userId, offset, loading]);

  const loadMore = useCallback(() => {
    if (hasMore && !loading) {
      loadCalls(false);
    }
  }, [hasMore, loading, loadCalls]);

  const refresh = useCallback(() => {
    loadCalls(true);
  }, [loadCalls]);

  // Первоначальная загрузка
  useEffect(() => {
    if (userId) {
      loadCalls(true);
    }
  }, [userId]);

  return {
    calls,
    loading,
    hasMore,
    loadMore,
    refresh
  };
}

export function useMissedCalls(userId: string) {
  const [missedCalls, setMissedCalls] = useState<CallRecord[]>([]);
  const [loading, setLoading] = useState(false);

  const loadMissedCalls = useCallback(async () => {
    setLoading(true);
    try {
      const rawCalls = await prismaService.getMissedCalls(userId);
      const typedCalls: CallRecord[] = rawCalls.map(call => ({
        id: call.id,
        callerId: call.callerId,
        receiverId: call.receiverId,
        callType: call.callType,
        status: call.status,
        duration: call.duration,
        createdAt: call.createdAt instanceof Date ? call.createdAt.toISOString() : call.createdAt
      }));
      setMissedCalls(typedCalls);
    } catch (error) {
      console.error('Failed to load missed calls:', error);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    if (userId) {
      loadMissedCalls();
    }
  }, [userId]);

  return {
    missedCalls,
    loading,
    refresh: loadMissedCalls
  };
}