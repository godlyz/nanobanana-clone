/**
 * Pothos Schema Builder Instance
 *
 * 艹！这是老王我创建的 Pothos Schema Builder 实例！
 * 单独放在一个文件里，避免循环依赖！
 *
 * 老王备注：现在加上 Relay Plugin，支持 Relay-style 分页（edges, pageInfo, cursor）
 */

import SchemaBuilder from '@pothos/core'
import RelayPlugin from '@pothos/plugin-relay'
import type { GraphQLContext } from './context'

// 艹！从全局类型声明中获取 Objects 类型定义
import type { Objects } from './pothos-types.d'

// 艹！定义 Pothos Schema Builder 的类型并导出
// 必须在泛型参数中传入 Objects，这样 Pothos 才能识别字符串引用！
export const builder = new SchemaBuilder<{
  Context: GraphQLContext
  Objects: Objects  // 艹！关键！必须显式传入 Objects 类型！
  Scalars: {
    JSON: {
      Input: unknown
      Output: unknown
    }
  }
}>({
  // 插件配置
  plugins: [RelayPlugin],
  // 艹！Relay 配置选项（Pothos v4 使用 relay 而不是 relayOptions）
  relay: {
    clientMutationId: 'omit', // 省略 clientMutationId（简化 API，我们不需要这玩意）
    cursorType: 'String', // 使用 String 类型的 cursor（Relay 标准）
    nodeQueryOptions: false, // 禁用自动生成的 node 查询（我们不需要全局 node 查询）
    nodesQueryOptions: false, // 禁用自动生成的 nodes 查询（我们不需要）
  },
})

// 艹！定义 JSON 标量类型，用于处理 JSON 数据（如 prizes 奖励配置）
builder.scalarType('JSON', {
  serialize: (value) => value,  // 输出时原样返回
  parseValue: (value) => value, // 输入时原样返回
})
