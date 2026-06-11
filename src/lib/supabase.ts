import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// 客户端组件使用（浏览器环境）
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// 服务端组件/API路由使用（服务端环境，需要Service Role Key）
export const supabaseAdmin = createClient(
  supabaseUrl,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// 类型定义
export type Database = {
  public: {
    Tables: {
      teams: {
        Row: {
          id: string;
          name: string;
          country: string;
          group: string;
          ms_i_score: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          country: string;
          group: string;
          ms_i_score?: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          country?: string;
          group?: string;
          ms_i_score?: number;
          created_at?: string;
        };
      };
      // 其他表类型定义...
    };
  };
};
