/**
 * GraphQL Relay-style Connection Types
 *
 * 艹！这是老王我用 Pothos 定义的 Relay-style Connection 类型！
 * 用于实现基于游标的高性能分页查询！
 *
 * Relay Cursor Connections Specification:
 * https://relay.dev/graphql/connections.htm
 */

import { builder } from '../builder'

/**
 * 艹！Pothos Relay Plugin 已经自动创建了 PageInfo 类型！
 * 老王我不需要重复定义，直接使用 builder.pageInfoRef() 即可！
 *
 * PageInfo 类型结构：
 * - hasNextPage: boolean
 * - hasPreviousPage: boolean
 * - startCursor: string | null
 * - endCursor: string | null
 */

/**
 * Edge Helper - 创建 Edge 类型的辅助函数
 *
 * 艹！这个函数用于为任意类型创建对应的 Edge 类型！
 * Edge 包含一个 node（实际数据）和一个 cursor（游标）！
 */
export function createEdgeType<T>(
  typeName: string,
  nodeTypeName: string
) {
  return builder.objectRef<{
    cursor: string
    node: T
  }>(`${typeName}Edge`).implement({
    description: `${typeName} Edge（包含游标和节点）`,
    fields: (t) => ({
      cursor: t.exposeString('cursor', {
        description: '游标（Base64 编码）'
      }),
      node: t.field({
        type: nodeTypeName as any,
        description: `${typeName} 节点`,
        resolve: (parent) => parent.node as any // 泛型类型推导需要断言
      })
    })
  })
}

/**
 * Connection Helper - 创建 Connection 类型的辅助函数
 *
 * 艹！这个函数用于为任意类型创建对应的 Connection 类型！
 * Connection 包含 edges（边列表）和 pageInfo（分页信息）！
 */
export function createConnectionType<T>(
  typeName: string,
  edgeTypeName: string
) {
  return builder.objectRef<{
    edges: Array<{ cursor: string; node: T }>
    pageInfo: {
      hasNextPage: boolean
      hasPreviousPage: boolean
      startCursor?: string | null
      endCursor?: string | null
    }
    totalCount?: number
  }>(`${typeName}Connection`).implement({
    description: `${typeName} Connection（Relay-style 分页）`,
    fields: (t) => ({
      edges: t.field({
        type: [edgeTypeName as any],
        description: `${typeName} 边列表`,
        resolve: (parent) => parent.edges
      }),
      pageInfo: t.field({
        type: 'PageInfo',
        description: '分页信息',
        resolve: (parent) => parent.pageInfo as any // 艹！pageInfo 的 cursor 字段可能是 undefined，需要断言
      }),
      totalCount: t.int({
        description: '总数（可选，可能影响性能）',
        nullable: true,
        resolve: (parent) => parent.totalCount ?? null
      })
    })
  })
}

/**
 * 艹！导出通用的游标解析和生成函数！
 */

/**
 * 解析游标（Base64 解码）
 *
 * 艹！这个函数用于解析 Base64 编码的游标！
 * 游标格式：{sortValue}|{id}
 */
export function parseCursor(cursor: string): { value: string; id: string } | null {
  try {
    const decoded = Buffer.from(cursor, 'base64').toString('utf-8')
    const [value, id] = decoded.split('|')
    if (!value || !id) return null
    return { value, id }
  } catch {
    return null
  }
}

/**
 * 生成游标（Base64 编码）
 *
 * 艹！这个函数用于生成 Base64 编码的游标！
 * 游标格式：{sortValue}|{id}
 */
export function encodeCursor(value: string | number, id: string): string {
  return Buffer.from(`${value}|${id}`).toString('base64')
}

/**
 * 创建 PageInfo
 *
 * 艹！这个函数用于根据查询结果创建 PageInfo 对象！
 */
export function createPageInfo(
  edges: Array<{ cursor: string }>,
  hasMore: boolean,
  direction: 'forward' | 'backward'
): {
  hasNextPage: boolean
  hasPreviousPage: boolean
  startCursor: string | null
  endCursor: string | null
} {
  return {
    hasNextPage: direction === 'forward' ? hasMore : false,
    hasPreviousPage: direction === 'backward' ? hasMore : false,
    startCursor: edges.length > 0 ? edges[0].cursor : null,
    endCursor: edges.length > 0 ? edges[edges.length - 1].cursor : null
  }
}
