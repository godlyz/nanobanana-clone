## ADDED Requirements

### Requirement: GraphQL API Endpoint
The system SHALL provide a unified GraphQL API endpoint at `/api/graphql` that supports both queries (GET) and mutations (POST) using graphql-yoga server with Pothos schema builder.

#### Scenario: Access GraphQL Playground
- **WHEN** developer opens `/api/graphql` in browser via GET request
- **THEN** system returns GraphQL Playground with interactive documentation, schema explorer, and query testing interface

#### Scenario: Execute GraphQL Query via POST
- **WHEN** client sends POST request to `/api/graphql` with query in request body
- **THEN** system parses query, validates against schema, checks authentication, executes resolvers, and returns JSON response with data or errors

#### Scenario: Reject Invalid GraphQL Syntax
- **WHEN** client sends malformed GraphQL query (missing brackets, invalid field names)
- **THEN** system returns validation error with specific syntax error location and helpful message

---

### Requirement: Code-First Schema with Pothos GraphQL
The system SHALL use Pothos GraphQL to build GraphQL schema in TypeScript-first, code-first approach with full type safety.

#### Scenario: Generate GraphQL Schema from TypeScript Types
- **WHEN** server starts and initializes Pothos SchemaBuilder
- **THEN** system generates GraphQL schema SDL from TypeScript type definitions, ensures types match database models, and enables introspection for documentation

#### Scenario: Type-Safe Resolver Implementation
- **WHEN** developer implements resolver for GraphQL field
- **THEN** TypeScript compiler enforces correct return type, argument types, and context type, preventing runtime type errors

---

### Requirement: DataLoader Batch Loading for N+1 Prevention
The system SHALL implement DataLoader pattern to batch database queries and eliminate N+1 query problems with request-level caching.

#### Scenario: Batch Load Categories for Blog Posts
- **WHEN** GraphQL query requests 10 blog posts with their categories
- **THEN** system collects all category load requests, batches them into single query `SELECT * FROM blog_post_categories WHERE post_id IN (...)`, and distributes results to resolvers

#### Scenario: Cache DataLoader Results Within Request
- **WHEN** GraphQL query requests same entity multiple times (e.g., author appears in multiple posts)
- **THEN** DataLoader returns cached result from request-level cache without additional database query

#### Scenario: Clear DataLoader Cache After Request
- **WHEN** GraphQL request completes (success or error)
- **THEN** system clears all DataLoader caches to prevent memory leak and cross-request data leakage

#### Scenario: Reduce Blog List Queries from 40+ to <5
- **WHEN** client queries 10 blog posts with categories, tags, and authors via GraphQL
- **THEN** system makes maximum 5 database queries: (1) posts, (2) categories batch, (3) tags batch, (4) authors batch, (5) likes/comments counts batch

---

### Requirement: Core Entity Types (User, BlogPost, ForumThread, Comment)
The system SHALL implement GraphQL types for core entities with relationships and computed fields.

#### Scenario: Query User Type with Relationships
- **WHEN** client queries User type with fields `id`, `email`, `display_name`, `avatar_url`, `blogPosts`, `forumThreads`
- **THEN** system returns user data with relationships loaded via DataLoader, respects RLS policies, and hides sensitive fields (password hash, email if private)

#### Scenario: Query BlogPost Type with Nested Relationships
- **WHEN** client queries BlogPost with `author`, `categories`, `tags`, `likes_count`, `comments_count`
- **THEN** system returns blog post with all relationships in single response, batches related queries with DataLoader, and calculates computed fields (likes_count, comments_count)

#### Scenario: Query ForumThread Type with Pagination
- **WHEN** client queries forum threads with Relay pagination (`first: 10, after: "cursor"`)
- **THEN** system returns Connection type with edges, pageInfo, and cursor-based pagination support

#### Scenario: Query Comment Type with Hierarchical Structure
- **WHEN** client queries comments with nested replies (`comment.replies.replies`)
- **THEN** system returns comment tree structure, limits depth to 10 levels, and loads replies via DataLoader

---

### Requirement: Relay-Style Cursor-Based Pagination
The system SHALL implement Relay pagination specification with cursor-based paging for all list queries.

#### Scenario: Query First Page with Relay Pagination
- **WHEN** client queries `blogPosts(first: 10)` without cursor
- **THEN** system returns first 10 posts with `edges`, `pageInfo.hasNextPage = true`, `pageInfo.endCursor` pointing to last item

#### Scenario: Query Next Page Using Cursor
- **WHEN** client queries `blogPosts(first: 10, after: "cursor_xyz")`
- **THEN** system returns next 10 posts starting after cursor, updates `pageInfo.hasNextPage` based on remaining items, and provides new `endCursor`

#### Scenario: Query Previous Page Using Before Cursor
- **WHEN** client queries `blogPosts(last: 10, before: "cursor_xyz")`
- **THEN** system returns previous 10 posts ending before cursor, updates `pageInfo.hasPreviousPage`, and provides `startCursor`

#### Scenario: Handle Empty Results with Pagination
- **WHEN** client queries `blogPosts(first: 10)` but no posts exist
- **THEN** system returns empty edges array, `pageInfo.hasNextPage = false`, `pageInfo.hasPreviousPage = false`, and null cursors

---

### Requirement: Authentication and Authorization with Supabase
The system SHALL integrate Supabase Auth for GraphQL context and enforce RLS policies at database level.

#### Scenario: Extract User from Supabase Session
- **WHEN** GraphQL request includes Supabase session cookie
- **THEN** system extracts user from session, adds to GraphQL context, and makes available to all resolvers

#### Scenario: Require Authentication for Mutations
- **WHEN** unauthenticated user attempts to call mutation (e.g., `createBlogPost`)
- **THEN** system returns GraphQL error with code `UNAUTHENTICATED` and message `Authentication required`

#### Scenario: Enforce RLS Policies in Resolvers
- **WHEN** resolver queries Supabase database
- **THEN** Supabase client enforces RLS policies based on user context, hides unauthorized data, and returns only permitted rows

#### Scenario: Support Auth Directives on Fields
- **WHEN** GraphQL field has `@requireAuth` directive
- **THEN** system checks user session before executing resolver, returns `UNAUTHENTICATED` error if no session exists

---

### Requirement: Query Complexity Calculation and Limiting
The system SHALL calculate query complexity score based on field weights and reject queries exceeding maximum complexity of 1000.

#### Scenario: Calculate Query Complexity Score
- **WHEN** system receives GraphQL query
- **THEN** system calculates complexity by summing field weights: simple fields (1), relationships (5), lists (10), nested lists (50)

#### Scenario: Reject Query Exceeding Max Complexity
- **WHEN** calculated query complexity exceeds 1000
- **THEN** system rejects query before execution with error code `QUERY_TOO_COMPLEX` and suggests simplifying query (reduce nesting or use pagination)

#### Scenario: Allow Simple Queries Below Complexity Limit
- **WHEN** query complexity is 500 (below limit)
- **THEN** system executes query normally without restrictions

#### Scenario: Complex Query Example Rejection
- **WHEN** client queries `blogPosts(first: 100) { author { blogPosts(first: 100) { author { ... } } } }` (nested lists)
- **THEN** system calculates complexity >1000 and rejects with `QUERY_TOO_COMPLEX` error

---

### Requirement: Query Depth Limiting
The system SHALL limit GraphQL query nesting depth to maximum 10 levels to prevent recursive query attacks.

#### Scenario: Allow Query with Depth 5
- **WHEN** client queries `blogPosts { author { blogPosts { categories } } }` (depth: 4)
- **THEN** system executes query without restrictions

#### Scenario: Reject Query Exceeding Depth 10
- **WHEN** client queries with nesting depth >10 (e.g., `author.blogPosts.author.blogPosts...` repeated 11 times)
- **THEN** system rejects query with error code `QUERY_TOO_DEEP` and message `Maximum query depth is 10 levels`

---

### Requirement: Role-Based Rate Limiting
The system SHALL enforce role-based rate limits: Free users (100 queries/minute), Basic/Pro users (500 queries/minute), Max users (1000 queries/minute).

#### Scenario: Enforce Free User Rate Limit
- **WHEN** free user sends 150 GraphQL queries within 1 minute
- **THEN** system allows first 100 queries, returns 429 error for queries 101-150 with `Retry-After` header, and resets counter after 1 minute

#### Scenario: Enforce Pro User Rate Limit
- **WHEN** Pro user sends 600 queries within 1 minute
- **THEN** system allows first 500 queries, blocks remaining 100 with 429 error

#### Scenario: Allow Max User Higher Limit
- **WHEN** Max user sends 900 queries within 1 minute
- **THEN** system allows all queries (below 1000 limit)

#### Scenario: Reset Rate Limit After 1 Minute
- **WHEN** 1 minute passes since first query in window
- **THEN** system resets query counter to 0 and allows new queries

---

### Requirement: GraphQL Mutations for Blog Post Management
The system SHALL provide mutations to create, update, and delete blog posts with input validation and error handling.

#### Scenario: Create Blog Post with Valid Input
- **WHEN** authenticated user calls `createBlogPost(input: { title: "...", content: "...", categoryIds: [...] })`
- **THEN** system validates input with Zod schema, creates blog post in database, creates category associations, and returns created BlogPost with generated ID

#### Scenario: Reject Invalid Create Input
- **WHEN** user calls `createBlogPost(input: { title: "" })` (empty title)
- **THEN** system validates input, finds validation errors, returns GraphQL error with field-level error messages: `{ field: "title", message: "Title is required" }`

#### Scenario: Update Own Blog Post
- **WHEN** authenticated user updates their own blog post via `updateBlogPost(id: "...", input: { title: "New Title" })`
- **THEN** system verifies user is author or admin, updates post fields, updates categories/tags associations, and returns updated BlogPost

#### Scenario: Reject Update of Other User's Post
- **WHEN** user attempts to update blog post authored by different user (not admin)
- **THEN** system returns GraphQL error with code `FORBIDDEN` and message `You can only update your own posts`

#### Scenario: Soft Delete Blog Post
- **WHEN** author or admin calls `deleteBlogPost(id: "...")`
- **THEN** system verifies permissions, sets `status = 'archived'` (soft delete), keeps data in database for audit, and returns success boolean

---

### Requirement: GraphQL Error Handling and Logging
The system SHALL provide structured error responses with error codes, field-level errors, and request logging for debugging.

#### Scenario: Return GraphQL Validation Error
- **WHEN** client sends query with invalid field name `blogPosts { invalidField }`
- **THEN** system returns GraphQL error with path, message `Cannot query field "invalidField" on type "BlogPost"`, and locations array

#### Scenario: Return Authentication Error
- **WHEN** unauthenticated user calls protected mutation
- **THEN** system returns GraphQL error with extensions `{ code: "UNAUTHENTICATED" }` and message `Authentication required`

#### Scenario: Return Field-Level Validation Errors
- **WHEN** mutation input validation fails with multiple errors
- **THEN** system returns errors array with field paths: `[{ field: "title", message: "Required" }, { field: "content", message: "Too short" }]`

#### Scenario: Log GraphQL Request for Debugging
- **WHEN** GraphQL request is executed (success or error)
- **THEN** system logs query, variables, user_id, complexity score, execution duration, and error details (if any) to monitoring service

---

### Requirement: GraphQL Schema Introspection and Documentation
The system SHALL support GraphQL introspection for auto-generated API documentation and schema exploration.

#### Scenario: Query Schema via Introspection
- **WHEN** GraphQL Playground or client sends introspection query `{ __schema { types { name } } }`
- **THEN** system returns complete schema metadata including types, fields, arguments, and descriptions

#### Scenario: View Field Descriptions in Playground
- **WHEN** developer opens GraphQL Playground and explores schema
- **THEN** system displays field descriptions, argument types, deprecation notices, and examples defined in Pothos schema

#### Scenario: Deprecate Field with Warning
- **WHEN** schema marks field as deprecated: `field.deprecated({ reason: "Use newField instead" })`
- **THEN** GraphQL Playground shows deprecation warning, field still works but suggests migration to new field

---

### Requirement: Performance Monitoring and Alerts
The system SHALL monitor GraphQL API performance metrics and send alerts for slow queries, high error rates, and rate limit hits.

#### Scenario: Alert on Slow Query
- **WHEN** GraphQL query takes >500ms to execute
- **THEN** system logs slow query details (query, variables, duration) and sends alert to monitoring dashboard

#### Scenario: Alert on High Error Rate
- **WHEN** error rate exceeds 1% over 5-minute window
- **THEN** system triggers alert with error breakdown (validation, auth, database, rate limit)

#### Scenario: Alert on Rate Limit Hits
- **WHEN** 10+ users hit rate limit within 1 minute
- **THEN** system alerts DevOps team to investigate potential abuse or need to increase limits

#### Scenario: Dashboard Metrics
- **WHEN** admin views GraphQL monitoring dashboard
- **THEN** system displays: queries per minute, P95 response time, error rate, top queries by execution time, DataLoader cache hit rate, database query count
