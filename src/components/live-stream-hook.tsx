"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import type { LiveEvent } from "@/lib/espn-live";

/**
 * 实时 SSE 订阅 Hook
 * 
 * 使用方式：
 * const { events, connected, reconnect } = useLiveStream();
 * 
 * 返回：
 * - events: 最近的事件列表（最多200条）
 * - connected: 是否已连接
 * - reconnect: 手动重连
 */
export function useLiveStream() {
  const [events, setEvents] = useState<LiveEvent[]>([]);
  const [connected, setConnected] = useState(false);
  const eventsRef = useRef<LiveEvent[]>([]);
  const sourceRef = useRef<EventSource | null>(null);
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const connect = useCallback(() => {
    if (sourceRef.current) {
      sourceRef.current.close();
    }

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "";
    const es = new EventSource(`${baseUrl}/api/live`);

    es.onopen = () => {
      setConnected(true);
      console.log("[Live SSE] Connected");
    };

    es.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === "heartbeat") return;

        eventsRef.current = [...eventsRef.current, data].slice(-200);
        setEvents([...eventsRef.current]);
      } catch {
        // ignore parse errors
      }
    };

    es.onerror = () => {
      setConnected(false);
      es.close();

      // 5秒后自动重连
      reconnectTimeoutRef.current = setTimeout(() => {
        connect();
      }, 5000);
    };

    sourceRef.current = es;
  }, []);

  const reconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
    }
    connect();
  }, [connect]);

  useEffect(() => {
    connect();
    return () => {
      if (sourceRef.current) {
        sourceRef.current.close();
      }
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
    };
  }, [connect]);

  // 便捷筛选
  const scores = events.filter((e) => e.type === "score_update");
  const odds = events.filter((e) => e.type === "odds_update");
  const predictions = events.filter((e) => e.type === "prediction_update");
  const commentaries = events.filter((e) => e.type === "commentary");

  // 按比赛组织
  const matchStates = new Map<string, {
    matchId: string;
    score?: LiveEvent;
    odds?: LiveEvent;
    prediction?: LiveEvent;
  }>();

  for (const e of events) {
    if (e.type === "connected" || e.type === "heartbeat") continue;
    const mId = (e as any).matchId;
    if (!mId) continue;
    if (!matchStates.has(mId)) matchStates.set(mId, { matchId: mId });
    const ms = matchStates.get(mId)!;
    if (e.type === "score_update") ms.score = e;
    if (e.type === "odds_update") ms.odds = e;
    if (e.type === "prediction_update") ms.prediction = e;
  }

  return {
    events,
    connected,
    reconnect,
    scores,
    odds,
    predictions,
    commentaries,
    matchStates: Array.from(matchStates.values()),
  };
}
