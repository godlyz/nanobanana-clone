# Implementation Tasks: Add GraphQL API

**Change ID**: `add-graphql-api`
**Type**: Infrastructure Enhancement
**Phase**: Phase 4 (Week 29-31)
**Timeline**: 21 working days (3 weeks)
**Estimated Effort**: 120-160 hours

---

## Context

This task implements a GraphQL API gateway to solve the N+1 query problem in the current REST API architecture. The GraphQL endpoint will serve as the foundation for:

- **Week 32-34**: Challenges system (leverages GraphQL for flexible queries)
- **Week 35-37**: SDK generation (uses GraphQL Code Generator)

**Key Performance Target**: Reduce blog list queries from 40+ to <5 (60-90% improvement)

---

## Week 29: GraphQL Infrastructure (Days 1-7)

### Day 1-2: Environment Setup & Dependencies

- [ ] 1.1 Install GraphQL dependencies
  ```bash
  pnpm add @pothos/core graphql graphql-yoga dataloader
  pnpm add -D @graphql-codegen/cli @graphql-codegen/typescript
  ```
- [ ] 1.2 Create directory structure
  ```
  lib/graphql/
  ├── schema.ts           # Pothos schema builder
  ├── context.ts          # GraphQL context (auth, loaders)
  ├── dataloaders.ts      # DataLoader instances
  ├── complexity.ts       # Query complexity calculator
  ├── rate-limiter.ts     # GraphQL-specific rate limiting
  └── types/
      ├── user.ts         # User type and resolvers
      ├── blog-post.ts    # BlogPost type and resolvers
      ├── forum-thread.ts # ForumThread type and resolvers
      └── comment.ts      # Comment type and resolvers
  ```
- [ ] 1.3 Create GraphQL endpoint: `app/api/graphql/route.ts`
  - [ ] Configure graphql-yoga server
  - [ ] Enable GraphQL Playground for GET requests
  - [ ] Add CORS headers (if needed)
  - [ ] Set up request logging
- [ ] 1.4 Configure Pothos Schema Builder (`lib/graphql/schema.ts`)
  - [ ] Initialize SchemaBuilder with TypeScript types
  - [ ] Configure plugins (scope-auth, relay, errors)
  - [ ] Add Query and Mutation root types
- [ ] 1.5 Test GraphQL Playground
  - [ ] Access `/api/graphql` in browser
  - [ ] Verify introspection query works
  - [ ] Test basic "Hello World" query

### Day 3-4: Core Schema & User Type

- [ ] 2.1 Implement User type (`lib/graphql/types/user.ts`)
  - [ ] Define User object type with Pothos
  - [ ] Add fields: `id`, `email`, `display_name`, `avatar_url`, `created_at`
  - [ ] Implement `me` query (returns current authenticated user)
  - [ ] Implement `user(id: ID!)` query
  - [ ] Add auth directive (requires login)
- [ ] 2.2 Create GraphQL context (`lib/graphql/context.ts`)
  - [ ] Extract Supabase user from session
  - [ ] Initialize DataLoader instances per request
  - [ ] Add user to context for resolvers
- [ ] 2.3 Test User queries
  - [ ] Query `me` as authenticated user
  - [ ] Query `user(id: "xxx")` by ID
  - [ ] Verify auth protection (401 for unauthenticated)
- [ ] 2.4 Implement BlogPost type (`lib/graphql/types/blog-post.ts`)
  - [ ] Define BlogPost object type
  - [ ] Add fields: `id`, `title`, `content`, `slug`, `status`, `created_at`, `updated_at`
  - [ ] Add relationships: `author` (User), `categories` (Category[]), `tags` (Tag[])
  - [ ] Add computed fields: `likes_count`, `comments_count`
  - [ ] Implement `blogPosts` query (list all)
  - [ ] Implement `blogPost(id: ID!)` query (single)

### Day 5-7: DataLoader Optimization

- [ ] 3.1 Create DataLoader instances (`lib/graphql/dataloaders.ts`)
  - [ ] `userLoader`: Batch load users by ID
  - [ ] `categoriesLoader`: Batch load categories for post IDs
  - [ ] `tagsLoader`: Batch load tags for post IDs
  - [ ] `likesCountLoader`: Batch load likes count for post IDs
  - [ ] `commentsCountLoader`: Batch load comments count for post IDs
- [ ] 3.2 Integrate DataLoader in BlogPost resolvers
  - [ ] Replace direct Supabase queries with DataLoader calls
  - [ ] Example: `categories: (post, _args, ctx) => ctx.loaders.categoriesLoader.load(post.id)`
  - [ ] Ensure all relationship fields use DataLoader
- [ ] 3.3 Write unit tests for DataLoader batch functions
  - [ ] Test `categoriesLoader` with 10 post IDs (should make 1 query)
  - [ ] Test `tagsLoader` with 10 post IDs (should make 1 query)
  - [ ] Test `userLoader` with duplicate IDs (should cache)
  - [ ] Test DataLoader error handling
- [ ] 3.4 Performance benchmarking
  - [ ] Create test: Query 10 blog posts with categories and tags
  - [ ] Measure database query count **before DataLoader** (should be 40+)
  - [ ] Measure database query count **after DataLoader** (should be <5)
  - [ ] Measure response time improvement (target: <200ms P95)
  - [ ] Document results in `PERFORMANCE_REPORT.md`

---

## Week 30: Advanced Features (Days 8-14)

### Day 8-9: Relay-Style Pagination

- [ ] 4.1 Add Pothos Relay plugin to schema builder
- [ ] 4.2 Implement BlogPostConnection type
  - [ ] Create Connection type with edges and pageInfo
  - [ ] Add cursor-based pagination logic
  - [ ] Support `first`, `after`, `last`, `before` arguments
- [ ] 4.3 Update `blogPosts` query to return Connection
  ```graphql
  query {
    blogPosts(first: 10, after: "cursor") {
      edges {
        node {
          id
          title
        }
        cursor
      }
      pageInfo {
        hasNextPage
        hasPreviousPage
        startCursor
        endCursor
      }
    }
  }
  ```
- [ ] 4.4 Add filtering arguments
  - [ ] `status: String` (published, draft, archived)
  - [ ] `categoryId: ID` (filter by category)
  - [ ] `authorId: ID` (filter by author)
- [ ] 4.5 Add sorting arguments
  - [ ] `sortBy: BlogPostSortBy` (enum: CREATED_AT, UPDATED_AT, LIKES_COUNT)
  - [ ] `sortOrder: SortOrder` (enum: ASC, DESC)
- [ ] 4.6 Test pagination
  - [ ] Query first 10 posts
  - [ ] Query next 10 posts using `after` cursor
  - [ ] Query previous 10 posts using `before` cursor
  - [ ] Verify `hasNextPage` and `hasPreviousPage` are correct

### Day 10-11: Mutations & Authentication

- [ ] 5.1 Implement createBlogPost mutation
  ```graphql
  mutation {
    createBlogPost(input: {
      title: "My Post"
      content: "..."
      categoryIds: ["cat1", "cat2"]
      tagIds: ["tag1"]
    }) {
      blogPost {
        id
        title
      }
      errors {
        field
        message
      }
    }
  }
  ```
  - [ ] Add input validation (Zod schema)
  - [ ] Require authentication
  - [ ] Create blog post in Supabase
  - [ ] Create category and tag associations
  - [ ] Return created blog post or errors
- [ ] 5.2 Implement updateBlogPost mutation
  - [ ] Require authentication (author only)
  - [ ] Update post fields
  - [ ] Update categories and tags
  - [ ] Return updated post or errors
- [ ] 5.3 Implement deleteBlogPost mutation
  - [ ] Require authentication (author or admin)
  - [ ] Soft delete (set `status = 'archived'`)
  - [ ] Return success boolean
- [ ] 5.4 Add auth directives
  - [ ] `@requireAuth` - Requires user login
  - [ ] `@requireRole(role: UserRole)` - Requires specific role
  - [ ] Implement in Pothos scope-auth plugin
- [ ] 5.5 Test mutations
  - [ ] Create blog post as authenticated user
  - [ ] Update own blog post
  - [ ] Fail to update other user's blog post
  - [ ] Delete own blog post

### Day 12-14: Rate Limiting & Query Complexity

- [ ] 6.1 Implement query complexity calculation (`lib/graphql/complexity.ts`)
  - [ ] Assign complexity scores to fields:
    - Simple fields (id, title): 1
    - Relationship fields (author, categories): 5
    - List fields (blogPosts): 10
    - Nested lists (blogPosts.categories): 50
  - [ ] Calculate total query complexity
  - [ ] Reject queries with complexity >1000
- [ ] 6.2 Add depth limiting
  - [ ] Reject queries with nesting depth >10 levels
  - [ ] Example: `blogPosts.author.blogPosts.author...` (10 levels)
- [ ] 6.3 Implement role-based rate limiting (`lib/graphql/rate-limiter.ts`)
  - [ ] Free users: 100 queries/minute
  - [ ] Basic/Pro users: 500 queries/minute
  - [ ] Max users: 1000 queries/minute
  - [ ] Use Redis or in-memory cache for rate limit tracking
  - [ ] Return 429 error with retry-after header
- [ ] 6.4 Add request logging
  - [ ] Log query, variables, user_id, complexity, duration
  - [ ] Send logs to analytics service (optional)
- [ ] 6.5 Test rate limiting
  - [ ] Send 150 queries as free user (should block after 100)
  - [ ] Verify 429 error response
  - [ ] Test complexity calculation (create query with complexity >1000)

---

## Week 31: Testing & Documentation (Days 15-21)

### Day 15-16: Unit Testing

- [ ] 7.1 Test GraphQL schema generation
  - [ ] Verify schema introspection returns correct types
  - [ ] Test type relationships (User → BlogPost)
  - [ ] Test enum types (BlogPostStatus, SortOrder)
- [ ] 7.2 Test DataLoader batch functions (expand coverage)
  - [ ] Test `categoriesLoader` with empty result
  - [ ] Test `userLoader` with non-existent IDs
  - [ ] Test `likesCountLoader` caching
  - [ ] Test DataLoader clear() on request end
- [ ] 7.3 Test resolver logic
  - [ ] Test `me` query with valid session
  - [ ] Test `me` query with expired session
  - [ ] Test `blogPosts` filtering
  - [ ] Test `createBlogPost` validation errors
- [ ] 7.4 Test error handling
  - [ ] Test GraphQL validation errors (invalid syntax)
  - [ ] Test authentication errors (401)
  - [ ] Test authorization errors (403)
  - [ ] Test custom errors (e.g., "Post not found")
- [ ] 7.5 Achieve target coverage
  - [ ] Unit test coverage: ≥85%
  - [ ] All DataLoader functions covered
  - [ ] All resolvers covered
  - [ ] All mutations covered

### Day 17-18: Integration Testing

- [ ] 8.1 Set up integration test environment
  - [ ] Create test database with seed data
  - [ ] Create test users with different roles
  - [ ] Create test blog posts with relationships
- [ ] 8.2 End-to-end query tests
  - [ ] Test complex query: 10 blog posts with author, categories, tags
  - [ ] Verify response structure matches schema
  - [ ] Verify data accuracy (correct authors, categories)
  - [ ] Measure query count (should be <5)
- [ ] 8.3 End-to-end mutation tests
  - [ ] Create blog post → Query it → Update it → Delete it
  - [ ] Verify database state after each mutation
  - [ ] Test optimistic locking (concurrent updates)
- [ ] 8.4 Performance regression tests
  - [ ] Baseline: Query 10 posts with REST API (40+ queries)
  - [ ] GraphQL: Query 10 posts with GraphQL (<5 queries)
  - [ ] Assert: GraphQL is at least 60% faster
  - [ ] Alert if performance degrades
- [ ] 8.5 Rate limiting integration tests
  - [ ] Test free user hitting 100/min limit
  - [ ] Test Pro user with 500/min limit
  - [ ] Verify rate limit reset after 1 minute
- [ ] 8.6 Achieve target coverage
  - [ ] Integration test coverage: ≥80%
  - [ ] All API endpoints covered
  - [ ] All authentication flows covered

### Day 19-21: Documentation & Launch Preparation

- [ ] 9.1 Write API documentation
  - [ ] GraphQL Playground documentation (auto-generated)
  - [ ] Add field descriptions in Pothos schema
  - [ ] Add example queries in schema descriptions
  - [ ] Document authentication requirements
- [ ] 9.2 Create developer guide
  - [ ] Getting started with GraphQL API
  - [ ] Authentication guide (API key + session)
  - [ ] Pagination guide (Relay cursor-based)
  - [ ] Error handling guide
  - [ ] Rate limiting guide
- [ ] 9.3 Create migration guide (REST → GraphQL)
  - [ ] Table: REST endpoint → GraphQL query mapping
  - [ ] Example: `GET /api/blog/posts` → `query { blogPosts { ... } }`
  - [ ] Migration checklist for developers
  - [ ] Performance comparison (REST vs GraphQL)
- [ ] 9.4 Update `next.config.mjs`
  - [ ] Ensure `/api/graphql` is not cached
  - [ ] Add GraphQL-specific headers
- [ ] 9.5 Update `.env.local.example`
  - [ ] Add GraphQL-specific environment variables (if any)
  - [ ] Document rate limiting configuration
- [ ] 9.6 Soft launch to internal users
  - [ ] Deploy to staging environment
  - [ ] Test with 5-10 internal users
  - [ ] Collect feedback on API usability
  - [ ] Fix critical issues
- [ ] 9.7 Monitoring setup
  - [ ] Add query performance dashboards
  - [ ] Add error rate alerts (>1%)
  - [ ] Add rate limit hit alerts
  - [ ] Add slow query alerts (>500ms)
- [ ] 9.8 Create rollback plan
  - [ ] Document steps to disable GraphQL endpoint
  - [ ] Prepare feature flag (if applicable)
  - [ ] Test rollback procedure
- [ ] 9.9 Final validation
  - [ ] Run `openspec validate add-graphql-api --strict`
  - [ ] All tests passing (unit + integration)
  - [ ] Performance benchmarks achieved (60%+ improvement)
  - [ ] Documentation complete
  - [ ] Staging environment stable

---

## Completion Checklist

Before marking this change as complete:

- [ ] All tasks above marked as `[x]`
- [ ] `openspec validate add-graphql-api --strict` passes
- [ ] Unit test coverage ≥85%
- [ ] Integration test coverage ≥80%
- [ ] GraphQL endpoint operational at `/api/graphql`
- [ ] GraphQL Playground accessible
- [ ] DataLoader reduces queries from 40+ to <5
- [ ] Rate limiting enforced (100/500/1000 per minute)
- [ ] Query complexity calculation working (max 1000)
- [ ] P95 response time <200ms for complex queries
- [ ] API documentation complete
- [ ] Developer migration guide complete
- [ ] Monitoring dashboards deployed
- [ ] Soft launch to 5-10 internal users successful
- [ ] No critical bugs in staging

---

## Success Metrics (Week 31 Exit Criteria)

**Performance**:
- ✅ Blog list queries reduced from 40+ to <5 (60-90% improvement)
- ✅ P95 response time <200ms (vs ~800ms for REST)
- ✅ Error rate <0.5%

**Coverage**:
- ✅ Unit tests: ≥85%
- ✅ Integration tests: ≥80%

**Functionality**:
- ✅ Core queries working: `me`, `user`, `blogPosts`, `blogPost`
- ✅ Core mutations working: `createBlogPost`, `updateBlogPost`, `deleteBlogPost`
- ✅ Pagination working (Relay cursor-based)
- ✅ Authentication working (Supabase session)
- ✅ Rate limiting working (100/500/1000 per minute)

**Documentation**:
- ✅ GraphQL Playground documentation auto-generated
- ✅ Developer guide published
- ✅ Migration guide (REST → GraphQL) published

**Readiness**:
- ✅ Challenges system can leverage GraphQL (Week 32-34)
- ✅ SDK generation ready (GraphQL Code Generator) (Week 35-37)

---

## Dependencies

**Technical Dependencies**:
- `@pothos/core` v4.x - TypeScript-first GraphQL schema builder
- `graphql` v16.x - GraphQL implementation
- `graphql-yoga` v5.x - Lightweight GraphQL server
- `dataloader` v2.x - Batch loading and caching

**Project Dependencies**:
- Supabase Auth - User authentication
- Supabase Client - Database access
- Existing RLS policies - Data security
- Vercel Edge Functions - Deployment platform

**Blockers**:
- None (all dependencies are available)

---

## Risks and Mitigation

**Risk 1: DataLoader complexity**
- **Mitigation**: Start with simple loaders, add complexity incrementally
- **Fallback**: Can revert to direct Supabase queries if needed

**Risk 2: Query complexity abuse**
- **Mitigation**: Implement complexity calculation early (Day 12)
- **Monitoring**: Alert on queries with complexity >800

**Risk 3: Rate limiting bypass**
- **Mitigation**: Use Redis for distributed rate limiting
- **Monitoring**: Log rate limit hits and investigate patterns

**Risk 4: Migration confusion (REST vs GraphQL)**
- **Mitigation**: Clear migration guide with side-by-side examples
- **Support**: Dedicated support channel for migration questions

---

## Notes

- Keep REST API available during GraphQL rollout (gradual migration)
- Monitor GraphQL adoption rate (target: 20% of API traffic by Week 32)
- Collect developer feedback in Week 31-32 for improvements
- Plan for GraphQL Subscriptions in future phase (real-time updates)
- Consider adding GraphQL Code Generator in Week 35-37 for SDK generation
