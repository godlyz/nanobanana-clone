import type { GraphQLContext } from './context'

// 简化的Resolver，先让基础功能跑起来
export const resolvers = {
  Query: {
    // 获取当前用户
    me: async (_parent: any, _args: any, context: GraphQLContext) => {
      if (!context.user) return null

      return {
        id: context.user.id,
        email: context.user.email!,
        createdAt: new Date(context.user.created_at || ''),
        updatedAt: new Date(context.user.updated_at || '')
      }
    },

    // 测试查询
    hello: async (_parent: any, { name }: { name?: string }) => {
      return `Hello, ${name || 'World'}!`
    }
  },

  Mutation: {
    // 测试mutation
    test: async (_parent: any, { message }: { message: string }) => {
      return `Received: ${message}`
    }
  }
}