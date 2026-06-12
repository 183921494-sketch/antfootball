/**
 * SSE 实时推送端点
 * 
 * GET /api/live
 * 
 * 功能：
 * - 服务端每30秒轮询ESPN比分+滚球盘口
 * - 比分/赔率变化时向所有客户端SSE广播
 * - 自动重算预测并推送
 * - AI自动生成赛事解说
 * 
 * 数据格式：SSE (Server-Sent Events)
 * 每行：data: {"type":"...","data":{...}}\n\n
 */

import { NextRequest } from "next/server";
import { createHash } from "crypto";
import {
  pollAllMatches,
  type LiveEvent,
} from "@/lib/espn-live";
import { fetchMatches } from "@/lib/espn-api";

const POLL_INTERVAL = 30_000; // 30秒轮询
const HEARTBEAT_INTERVAL = 25_000; // 25秒心跳
const MAX_CLIENTS = 100;

// 全局事件历史（供新客户端追赶）
const RECENT_EVENTS: LiveEvent[] = [];
const MAX_RECENT = 200;

// 活跃客户端
let activeClients = 0;
let pollTimer: ReturnType<typeof setInterval> | null = null;
let heartbeatTimer: ReturnType<typeof setInterval> | null = null;
let lastPollResults: LiveEvent[] = [];

/**
 * 全局轮询循环（所有客户端共享一个轮询）
 */
async function globalPoll(): Promise<void> {
  try {
    const events = await pollAllMatches();
    lastPollResults = events;

    // 将事件加入历史
    for (const event of events) {
      RECENT_EVENTS.push(event);
      if (RECENT_EVENTS.length > MAX_RECENT) {
        RECENT_EVENTS.shift();
      }
    }
  } catch (err) {
    console.error("[Live SSE] Global poll error:", err);
  }
}

/**
 * 确保全局轮询已启动
 */
function ensurePolling(): void {
  if (pollTimer) return;
  console.log("[Live SSE] Global polling started");

  // 首次立即轮询
  globalPoll().catch(console.error);
  
  pollTimer = setInterval(() => {
    globalPoll().catch(console.error);
  }, POLL_INTERVAL);
}

/**
 * 确保心跳已启动
 */
function ensureHeartbeat(controller: ReadableStreamDefaultController): void {
  if (heartbeatTimer) return;
  heartbeatTimer = setInterval(() => {
    if (activeClients === 0) {
      clearInterval(heartbeatTimer!);
      heartbeatTimer = null;
      return;
    }
    const encoder = new TextEncoder();
    controller.enqueue(encoder.encode(": heartbeat\n\n"));
  }, HEARTBEAT_INTERVAL);
}

/**
 * 连接消息
 */
function connectionMessage(encoder: TextEncoder, controller: ReadableStreamDefaultController): void {
  fetchMatches().then(matches => {
    const live = matches.filter(m => {
      const status = m.competitions?.[0]?.competitors?.[0]?.score ? 
        (m.status?.type?.state === "in" ? "live" : "finished") : "upcoming";
      return status === "live";
    });
    const msg: LiveEvent = {
      type: "connected",
      message: "已连接到蚂蚁足球实时推送",
      activeMatches: matches.length,
      liveMatches: live.length,
      timestamp: Date.now(),
    };
    controller.enqueue(encoder.encode(`data: ${JSON.stringify(msg)}\n\n`));
  }).catch(() => {
    const msg = { type: "connected", message: "已连接", timestamp: Date.now() };
    controller.enqueue(encoder.encode(`data: ${JSON.stringify(msg)}\n\n`));
  });
}

export async function GET(request: NextRequest) {
  let controller: ReadableStreamDefaultController;
  let closed = false;

  const stream = new ReadableStream({
    start(ctrl) {
      controller = ctrl;
      activeClients++;
      
      if (activeClients > MAX_CLIENTS) {
        controller.error(new Error("Too many clients"));
        return;
      }

      const encoder = new TextEncoder();

      // 发送连接确认
      connectionMessage(encoder, controller);

      // 推送历史事件
      for (const event of RECENT_EVENTS.slice(-20)) {
        if (closed) return;
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`));
      }

      // 启动全局轮询
      ensurePolling();
      ensureHeartbeat(controller);

      // 定期广播新事件
      const broadcastInterval = setInterval(() => {
        if (closed) {
          clearInterval(broadcastInterval);
          return;
        }
        for (const event of lastPollResults) {
          if (closed) return;
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`));
        }
        lastPollResults = [];
      }, POLL_INTERVAL + 1000); // 比轮询稍慢一点

      // 存储清理函数
      (controller as any)._broadcastInterval = broadcastInterval;
    },
    cancel() {
      closed = true;
      activeClients = Math.max(0, activeClients - 1);
      const bi = (controller as any)?._broadcastInterval;
      if (bi) clearInterval(bi);
    },
  });

  // 注册 cleanup
  request.signal?.addEventListener("abort", () => {
    closed = true;
    activeClients = Math.max(0, activeClients - 1);
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      "Connection": "keep-alive",
      "X-Accel-Buffering": "no",
      "Access-Control-Allow-Origin": "*",
    },
  });
}

export const dynamic = "force-dynamic";
export const revalidate = 0;
