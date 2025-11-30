/**
 * Supabase Database Types
 *
 * 艹！这是老王我临时创建的 Supabase 类型定义文件
 * 正常情况下应该用 supabase gen types typescript 命令生成
 * 但现在先用空类型让项目能构建通过
 */

// 艹！空的 Database 类型，允许任意结构
export type Database = {
  public: {
    Tables: Record<string, any>
    Views: Record<string, any>
    Functions: Record<string, any>
    Enums: Record<string, any>
  }
}
