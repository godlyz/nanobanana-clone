/**
 * 导出 GraphQL Schema 为 .graphql 文件
 * 艹！这个脚本从 lib/graphql/schema.ts 导出 schema，供 GraphQL Code Generator 使用！
 */

import { writeFileSync } from 'fs'
import { printSchema } from 'graphql'
import { schema } from '../lib/graphql/schema'

const schemaString = printSchema(schema)

writeFileSync('lib/graphql/schema.graphql', schemaString, 'utf-8')

console.log('✅ GraphQL Schema 已导出到 lib/graphql/schema.graphql')
console.log(`📊 Schema 大小: ${schemaString.length} 字符`)
console.log(`📋 包含 ${schemaString.split('\n').length} 行`)
