import { useEffect, useMemo, useState } from 'react';
import { fetchQuote, fetchStockOHLCV } from '@/modules/shared/services/yahooFinanceService';
import type { IhsgCandle, IhsgQuote } from '@/modules/dashboard/types/dashboard';

export function useIhsgOverview() {
  const [ihsgTrendData, setIhsgTrendData] = useState<IhsgCandle[]>([]);
  const [ihsgQuote, setIhsgQuote] = useState<IhsgQuote | null>(null);
  const [isLoadingIhsg, setIsLoadingIhsg] = useState(false);

  useEffect(() => {
    let isMounted = true;

    const loadIhsgData = async () => {
      setIsLoadingIhsg(true);
      try {
        const loadTrendWithFallback = async () => {
          const fallbackRanges = ['5y', '1y', '6mo', '3mo', '1mo'];
          for (const range of fallbackRanges) {
            try {
              const data = await fetchStockOHLCV('^JKSE', range);
              if (data?.length) return data;
            } catch {
              continue;
            }
          }
          return [];
        };

        const [trend, quote] = await Promise.all([
          loadTrendWithFallback(),
          fetchQuote('^JKSE'),
        ]);
        if (!isMounted) return;
        setIhsgTrendData(trend || []);
        setIhsgQuote(quote || null);
      } catch {
        if (!isMounted) return;
        setIhsgTrendData([]);
        setIhsgQuote(null);
      } finally {
        if (isMounted) setIsLoadingIhsg(false);
      }
    };

    loadIhsgData();

    return () => {
      isMounted = false;
    };
  }, []);

  const ihsgOverviewData = useMemo(() => ihsgTrendData.slice(-30), [ihsgTrendData]);

  const ihsgLatestCandle = useMemo(
    () => ihsgOverviewData[ihsgOverviewData.length - 1] || null,
    [ihsgOverviewData],
  );

  const ihsgPreviousClose = useMemo(
    () => ihsgOverviewData[ihsgOverviewData.length - 2]?.close ?? ihsgLatestCandle?.close ?? null,
    [ihsgLatestCandle, ihsgOverviewData],
  );

  const ihsgMetrics = useMemo(() => {
    if (ihsgOverviewData.length === 0) return null;
    const closes = ihsgOverviewData.map((item) => Number(item.close) || 0).filter(Boolean);
    if (closes.length === 0) return null;
    const last = closes[closes.length - 1];
    const first = closes[0];
    const high = Math.max(...closes);
    const low = Math.min(...closes);
    const change = last - first;
    const changePct = first > 0 ? (change / first) * 100 : 0;
    return { last, first, high, low, change, changePct };
  }, [ihsgOverviewData]);

  return {
    ihsgTrendData,
    ihsgQuote,
    isLoadingIhsg,
    ihsgOverviewData,
    ihsgLatestCandle,
    ihsgPreviousClose,
    ihsgMetrics,
  };
}
