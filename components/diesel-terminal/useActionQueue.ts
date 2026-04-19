import { useState, useCallback, useRef, useEffect } from 'react';
import type { ActionQueueItem, ActionType } from './types';

interface ActionExecutors {
  onMint: (chainId: string, mintCount: number, feeRate: number) => Promise<void>;
  onRbf: (chainId: string, targetRate: number) => Promise<void>;
  onCpfp: (chainId: string, targetRate: number) => Promise<void>;
}

export function useActionQueue(executors: ActionExecutors) {
  const [queue, setQueue] = useState<ActionQueueItem[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const processingRef = useRef(false);
  const executorsRef = useRef(executors);
  executorsRef.current = executors;

  const enqueue = useCallback((item: ActionQueueItem) => {
    setQueue(prev => {
      // Dedup: don't add if same chainId+type already in queue
      if (prev.some(q => q.chainId === item.chainId && q.type === item.type)) {
        return prev;
      }
      return [...prev, item];
    });
  }, []);

  const removeFromQueue = useCallback((chainId: string, type: ActionType) => {
    setQueue(prev => prev.filter(q => !(q.chainId === chainId && q.type === type)));
  }, []);

  const hasAction = useCallback((chainId: string, type?: ActionType) => {
    return queue.some(q => q.chainId === chainId && (type === undefined || q.type === type));
  }, [queue]);

  // Process queue sequentially
  useEffect(() => {
    if (processingRef.current || queue.length === 0) return;

    const processNext = async () => {
      if (processingRef.current) return;
      processingRef.current = true;
      setIsProcessing(true);

      const item = queue[0];
      if (!item) {
        processingRef.current = false;
        setIsProcessing(false);
        return;
      }

      try {
        switch (item.type) {
          case 'mint':
            await executorsRef.current.onMint(
              item.chainId,
              item.params.mintCount || 20,
              item.params.feeRate || 1
            );
            break;
          case 'rbf':
            await executorsRef.current.onRbf(
              item.chainId,
              item.params.targetRate || 1
            );
            break;
          case 'cpfp':
            await executorsRef.current.onCpfp(
              item.chainId,
              item.params.targetRate || 1
            );
            break;
        }
      } catch (err) {
        // Error handling done inside executors (they update chainsMap autoState)
        console.error(`Action ${item.type} failed for ${item.chainId}:`, err);
      }

      // Remove processed item
      setQueue(prev => prev.slice(1));
      processingRef.current = false;
      setIsProcessing(false);
    };

    processNext();
  }, [queue]);

  return {
    queue,
    isProcessing,
    enqueue,
    removeFromQueue,
    hasAction,
  };
}
