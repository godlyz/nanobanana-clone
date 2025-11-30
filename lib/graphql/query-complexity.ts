/**
 * GraphQL Query Complexity 计算器
 * 老王备注：计算 GraphQL 查询的复杂度，防止过于复杂的查询导致服务器压力过大
 *
 * 艹！这个复杂度计算器用于限制查询的复杂度，避免恶意查询！
 */

import type {
  FieldNode,
  SelectionSetNode,
  DocumentNode,
  OperationDefinitionNode,
  FragmentDefinitionNode,
} from 'graphql'

/**
 * 复杂度权重配置
 * 艹！不同字段/类型的基础复杂度不同
 */
export const COMPLEXITY_WEIGHTS = {
  // 基础字段（标量类型）
  scalarField: 1,

  // 对象字段（需要额外查询）
  objectField: 5,

  // 列表字段（需要批量查询）
  listField: 10,

  // Connection 字段（分页查询）
  connectionField: 10,

  // 关联字段（需要 DataLoader 或 JOIN）
  relationField: 5,

  // Mutation 操作
  mutation: 10,
}

/**
 * 计算查询复杂度
 * 艹！递归遍历 GraphQL AST，计算总复杂度
 *
 * @param document - GraphQL 查询文档
 * @returns 总复杂度
 */
export function calculateQueryComplexity(document: DocumentNode): number {
  let totalComplexity = 0

  // 艹！遍历所有操作（Query, Mutation, Subscription）
  for (const definition of document.definitions) {
    if (definition.kind === 'OperationDefinition') {
      const operation = definition as OperationDefinitionNode

      // 艹！Mutation 的基础复杂度更高
      if (operation.operation === 'mutation') {
        totalComplexity += COMPLEXITY_WEIGHTS.mutation
      }

      // 艹！递归计算 selection set 的复杂度
      if (operation.selectionSet) {
        totalComplexity += calculateSelectionSetComplexity(operation.selectionSet, new Map())
      }
    }
  }

  return totalComplexity
}

/**
 * 计算 Selection Set 的复杂度
 * 艹！递归计算嵌套字段的复杂度
 *
 * @param selectionSet - 选择集
 * @param fragments - Fragment 定义（用于解析 Fragment Spread）
 * @returns 总复杂度
 */
function calculateSelectionSetComplexity(
  selectionSet: SelectionSetNode,
  fragments: Map<string, FragmentDefinitionNode>
): number {
  let complexity = 0

  for (const selection of selectionSet.selections) {
    if (selection.kind === 'Field') {
      const field = selection as FieldNode

      // 艹！基础字段复杂度
      complexity += COMPLEXITY_WEIGHTS.scalarField

      // 艹！特殊字段类型判断
      if (field.name.value.endsWith('Connection')) {
        // Connection 字段（分页查询）
        complexity += COMPLEXITY_WEIGHTS.connectionField
      } else if (field.name.value.endsWith('s') || field.name.value.includes('List')) {
        // 列表字段（批量查询）
        complexity += COMPLEXITY_WEIGHTS.listField
      } else if (field.selectionSet) {
        // 对象字段（嵌套查询）
        complexity += COMPLEXITY_WEIGHTS.objectField
      }

      // 艹！递归计算嵌套字段
      if (field.selectionSet) {
        complexity += calculateSelectionSetComplexity(field.selectionSet, fragments)
      }
    } else if (selection.kind === 'FragmentSpread') {
      // 艹！Fragment Spread 暂时不处理（需要额外的 Fragment 定义解析）
      // TODO: 实现 Fragment 复杂度计算
      complexity += COMPLEXITY_WEIGHTS.scalarField
    } else if (selection.kind === 'InlineFragment') {
      // 艹！Inline Fragment 递归计算
      if (selection.selectionSet) {
        complexity += calculateSelectionSetComplexity(selection.selectionSet, fragments)
      }
    }
  }

  return complexity
}

/**
 * 验证查询复杂度是否超限
 * 艹！超过限制则抛出错误
 *
 * @param document - GraphQL 查询文档
 * @param maxComplexity - 最大复杂度
 * @throws 如果复杂度超过限制
 */
export function validateQueryComplexity(document: DocumentNode, maxComplexity: number): void {
  const complexity = calculateQueryComplexity(document)

  if (complexity > maxComplexity) {
    throw new Error(
      `Query complexity ${complexity} exceeds maximum allowed complexity ${maxComplexity}. ` +
      `Please simplify your query or upgrade your subscription tier.`
    )
  }
}
