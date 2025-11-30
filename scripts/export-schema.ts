/**
 * GraphQL Schema 导出脚本
 * 艹！这个脚本用于导出 Pothos 生成的 GraphQL Schema 到 schema.graphql 文件
 *
 * 用法：pnpm export-schema
 */

import { writeFileSync } from 'fs'
import { printSchema } from 'graphql'
import { schema } from '../lib/graphql/schema'
import { join } from 'path'

// 艹！导出 Schema 到 lib/graphql/schema.graphql
const schemaPath = join(process.cwd(), 'lib/graphql/schema.graphql')
const schemaString = printSchema(schema)

try {
  writeFileSync(schemaPath, schemaString, 'utf-8')
  console.log('✅ [Schema Export] 成功导出 GraphQL Schema 到:', schemaPath)
  console.log(`📝 [Schema Export] Schema 包含 ${schemaString.split('\n').length} 行定义`)
} catch (error) {
  console.error('❌ [Schema Export] 导出失败:', error)
  process.exit(1)
}
