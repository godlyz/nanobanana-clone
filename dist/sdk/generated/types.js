import gql from 'graphql-tag';
export const UserBasicInfoFragmentDoc = gql `
    fragment UserBasicInfo on User {
  id
  email
  displayName
  avatarUrl
}
    `;
export const UserDetailInfoFragmentDoc = gql `
    fragment UserDetailInfo on User {
  id
  email
  displayName
  avatarUrl
  bio
  location
  websiteUrl
  twitterHandle
  githubHandle
  followerCount
  followingCount
  postCount
  artworkCount
  totalLikes
}
    `;
export const BlogPostPreviewFragmentDoc = gql `
    fragment BlogPostPreview on BlogPost {
  id
  title
  slug
  excerpt
  coverImageUrl
  publishedAt
  viewCount
  likeCount
  commentCount
}
    `;
export const BlogPostDetailFragmentDoc = gql `
    fragment BlogPostDetail on BlogPost {
  id
  title
  slug
  content
  excerpt
  coverImageUrl
  status
  publishedAt
  createdAt
  updatedAt
  viewCount
  likeCount
  commentCount
  isLiked
  metaTitle
  metaDescription
  metaKeywords
}
    `;
export const TestHelloDocument = gql `
    query TestHello {
  hello
}
    `;
export const TestCurrentTimeDocument = gql `
    query TestCurrentTime {
  currentTime
}
    `;
export const TestCombinedDocument = gql `
    query TestCombined {
  hello
  currentTime
}
    `;
export const GetMeDocument = gql `
    query GetMe {
  me {
    id
    email
    createdAt
    updatedAt
    displayName
    avatarUrl
    bio
    location
    websiteUrl
    twitterHandle
    githubHandle
    instagramHandle
    followerCount
    followingCount
    postCount
    artworkCount
    totalLikes
  }
}
    `;
export const GetMeBasicDocument = gql `
    query GetMeBasic {
  me {
    id
    email
    displayName
    avatarUrl
  }
}
    `;
export const GetUserDocument = gql `
    query GetUser($userId: ID!) {
  user(id: $userId) {
    id
    email
    createdAt
    displayName
    avatarUrl
    bio
    followerCount
    followingCount
    postCount
    artworkCount
  }
}
    `;
export const GetUserSocialsDocument = gql `
    query GetUserSocials($userId: ID!) {
  user(id: $userId) {
    id
    displayName
    websiteUrl
    twitterHandle
    githubHandle
    instagramHandle
  }
}
    `;
export const GetPublishedBlogPostsDocument = gql `
    query GetPublishedBlogPosts($limit: Int, $offset: Int) {
  blogPosts(status: "published", limit: $limit, offset: $offset) {
    id
    title
    excerpt
    coverImageUrl
    publishedAt
    viewCount
    likeCount
    commentCount
    author {
      id
      displayName
      avatarUrl
    }
  }
}
    `;
export const GetBlogPostDocument = gql `
    query GetBlogPost($id: ID!) {
  blogPost(id: $id) {
    id
    title
    slug
    content
    excerpt
    coverImageUrl
    status
    publishedAt
    createdAt
    updatedAt
    viewCount
    likeCount
    commentCount
    isLiked
    metaTitle
    metaDescription
    metaKeywords
    author {
      id
      email
      displayName
      avatarUrl
      bio
    }
  }
}
    `;
export const GetBlogPostsWithAuthorDocument = gql `
    query GetBlogPostsWithAuthor {
  blogPosts(status: "published", limit: 10) {
    id
    title
    excerpt
    publishedAt
    author {
      id
      displayName
      avatarUrl
    }
  }
}
    `;
export const GetLatestBlogPostsDocument = gql `
    query GetLatestBlogPosts {
  blogPosts(status: "published", limit: 5, offset: 0) {
    id
    title
    excerpt
    coverImageUrl
    publishedAt
  }
}
    `;
export const GetDraftBlogPostsDocument = gql `
    query GetDraftBlogPosts {
  blogPosts(status: "draft", limit: 10) {
    id
    title
    excerpt
    status
    createdAt
    updatedAt
  }
}
    `;
export const GetBlogPostsConnectionDocument = gql `
    query GetBlogPostsConnection {
  blogPostsConnection(first: 10, orderBy: "created_at", orderDirection: "desc") {
    edges {
      cursor
      node {
        id
        title
        excerpt
        publishedAt
      }
    }
    pageInfo {
      hasNextPage
      hasPreviousPage
      startCursor
      endCursor
    }
  }
}
    `;
export const GetNextPageBlogPostsDocument = gql `
    query GetNextPageBlogPosts($cursor: String!) {
  blogPostsConnection(
    first: 10
    after: $cursor
    orderBy: "created_at"
    orderDirection: "desc"
  ) {
    edges {
      cursor
      node {
        id
        title
        excerpt
      }
    }
    pageInfo {
      hasNextPage
      endCursor
    }
  }
}
    `;
export const GetPreviousPageBlogPostsDocument = gql `
    query GetPreviousPageBlogPosts($cursor: String!) {
  blogPostsConnection(
    last: 10
    before: $cursor
    orderBy: "created_at"
    orderDirection: "desc"
  ) {
    edges {
      cursor
      node {
        id
        title
        excerpt
      }
    }
    pageInfo {
      hasPreviousPage
      startCursor
    }
  }
}
    `;
export const GetBlogPostsByViewCountDocument = gql `
    query GetBlogPostsByViewCount {
  blogPostsConnection(first: 10, orderBy: "view_count", orderDirection: "desc") {
    edges {
      node {
        id
        title
        viewCount
        likeCount
      }
    }
    pageInfo {
      hasNextPage
      endCursor
    }
  }
}
    `;
export const GetBlogPostsByLikeCountDocument = gql `
    query GetBlogPostsByLikeCount {
  blogPostsConnection(first: 10, orderBy: "like_count", orderDirection: "desc") {
    edges {
      node {
        id
        title
        likeCount
        commentCount
        author {
          id
          displayName
        }
      }
    }
    pageInfo {
      hasNextPage
      endCursor
    }
  }
}
    `;
export const GetFullBlogPostsConnectionDocument = gql `
    query GetFullBlogPostsConnection($first: Int, $after: String, $status: String) {
  blogPostsConnection(
    first: $first
    after: $after
    status: $status
    orderBy: "created_at"
    orderDirection: "desc"
  ) {
    edges {
      cursor
      node {
        id
        title
        slug
        excerpt
        coverImageUrl
        publishedAt
        viewCount
        likeCount
        commentCount
        isLiked
        author {
          id
          displayName
          avatarUrl
        }
      }
    }
    pageInfo {
      hasNextPage
      hasPreviousPage
      startCursor
      endCursor
    }
  }
}
    `;
export const TestEchoDocument = gql `
    mutation TestEcho($message: String!) {
  echo(message: $message)
}
    `;
export const GetDashboardDataDocument = gql `
    query GetDashboardData {
  me {
    id
    email
    displayName
    avatarUrl
    postCount
    followerCount
  }
  blogPosts(status: "published", limit: 5) {
    id
    title
    viewCount
    likeCount
  }
  currentTime
}
    `;
export const GetMultipleBlogPostListsDocument = gql `
    query GetMultipleBlogPostLists {
  latestPosts: blogPosts(status: "published", limit: 5, offset: 0) {
    id
    title
    publishedAt
  }
  popularPosts: blogPosts(status: "published", limit: 5, offset: 0) {
    id
    title
    viewCount
  }
}
    `;
export const GetBlogPostsWithFragmentsDocument = gql `
    query GetBlogPostsWithFragments {
  blogPosts(status: "published", limit: 10) {
    ...BlogPostPreview
    author {
      ...UserBasicInfo
    }
  }
}
    ${BlogPostPreviewFragmentDoc}
${UserBasicInfoFragmentDoc}`;
export const GetBlogPostWithFullAuthorInfoDocument = gql `
    query GetBlogPostWithFullAuthorInfo($postId: ID!) {
  blogPost(id: $postId) {
    id
    title
    content
    excerpt
    coverImageUrl
    publishedAt
    viewCount
    likeCount
    commentCount
    isLiked
    author {
      id
      email
      displayName
      avatarUrl
      bio
      location
      websiteUrl
      twitterHandle
      githubHandle
      followerCount
      followingCount
      postCount
      artworkCount
      totalLikes
    }
  }
}
    `;
export const GetMultipleUsersDocument = gql `
    query GetMultipleUsers($userId1: ID!, $userId2: ID!, $userId3: ID!) {
  user1: user(id: $userId1) {
    ...UserBasicInfo
  }
  user2: user(id: $userId2) {
    ...UserBasicInfo
  }
  user3: user(id: $userId3) {
    ...UserBasicInfo
  }
}
    ${UserBasicInfoFragmentDoc}`;
export const GetConditionalDataDocument = gql `
    query GetConditionalData($includeEmail: Boolean = false) {
  me {
    id
    email @include(if: $includeEmail)
    displayName
    avatarUrl
  }
}
    `;
export const GetOptimizedBlogPostListDocument = gql `
    query GetOptimizedBlogPostList {
  blogPosts(status: "published", limit: 20) {
    id
    title
    excerpt
    publishedAt
    author {
      id
      displayName
    }
  }
}
    `;
export const GetDeepNestedDataDocument = gql `
    query GetDeepNestedData {
  me {
    id
    displayName
    followerCount
  }
  blogPosts(status: "published", limit: 3) {
    id
    title
    author {
      id
      displayName
      postCount
    }
  }
}
    `;
export const OnNewBlogPostDocument = gql `
    subscription OnNewBlogPost {
  newBlogPost {
    id
    title
    slug
    excerpt
    coverImageUrl
    status
    publishedAt
    createdAt
    viewCount
    likeCount
    commentCount
    author {
      id
      displayName
      avatarUrl
    }
  }
}
    `;
export const OnCurrentTimeDocument = gql `
    subscription OnCurrentTime {
  currentTime
}
    `;
export const OnNewBlogPostSimpleDocument = gql `
    subscription OnNewBlogPostSimple {
  newBlogPost {
    id
    title
    publishedAt
    author {
      displayName
    }
  }
}
    `;
const defaultWrapper = (action, _operationName, _operationType, _variables) => action();
export function getSdk(client, withWrapper = defaultWrapper) {
    return {
        TestHello(variables, requestHeaders, signal) {
            return withWrapper((wrappedRequestHeaders) => client.request({ document: TestHelloDocument, variables, requestHeaders: { ...requestHeaders, ...wrappedRequestHeaders }, signal }), 'TestHello', 'query', variables);
        },
        TestCurrentTime(variables, requestHeaders, signal) {
            return withWrapper((wrappedRequestHeaders) => client.request({ document: TestCurrentTimeDocument, variables, requestHeaders: { ...requestHeaders, ...wrappedRequestHeaders }, signal }), 'TestCurrentTime', 'query', variables);
        },
        TestCombined(variables, requestHeaders, signal) {
            return withWrapper((wrappedRequestHeaders) => client.request({ document: TestCombinedDocument, variables, requestHeaders: { ...requestHeaders, ...wrappedRequestHeaders }, signal }), 'TestCombined', 'query', variables);
        },
        GetMe(variables, requestHeaders, signal) {
            return withWrapper((wrappedRequestHeaders) => client.request({ document: GetMeDocument, variables, requestHeaders: { ...requestHeaders, ...wrappedRequestHeaders }, signal }), 'GetMe', 'query', variables);
        },
        GetMeBasic(variables, requestHeaders, signal) {
            return withWrapper((wrappedRequestHeaders) => client.request({ document: GetMeBasicDocument, variables, requestHeaders: { ...requestHeaders, ...wrappedRequestHeaders }, signal }), 'GetMeBasic', 'query', variables);
        },
        GetUser(variables, requestHeaders, signal) {
            return withWrapper((wrappedRequestHeaders) => client.request({ document: GetUserDocument, variables, requestHeaders: { ...requestHeaders, ...wrappedRequestHeaders }, signal }), 'GetUser', 'query', variables);
        },
        GetUserSocials(variables, requestHeaders, signal) {
            return withWrapper((wrappedRequestHeaders) => client.request({ document: GetUserSocialsDocument, variables, requestHeaders: { ...requestHeaders, ...wrappedRequestHeaders }, signal }), 'GetUserSocials', 'query', variables);
        },
        GetPublishedBlogPosts(variables, requestHeaders, signal) {
            return withWrapper((wrappedRequestHeaders) => client.request({ document: GetPublishedBlogPostsDocument, variables, requestHeaders: { ...requestHeaders, ...wrappedRequestHeaders }, signal }), 'GetPublishedBlogPosts', 'query', variables);
        },
        GetBlogPost(variables, requestHeaders, signal) {
            return withWrapper((wrappedRequestHeaders) => client.request({ document: GetBlogPostDocument, variables, requestHeaders: { ...requestHeaders, ...wrappedRequestHeaders }, signal }), 'GetBlogPost', 'query', variables);
        },
        GetBlogPostsWithAuthor(variables, requestHeaders, signal) {
            return withWrapper((wrappedRequestHeaders) => client.request({ document: GetBlogPostsWithAuthorDocument, variables, requestHeaders: { ...requestHeaders, ...wrappedRequestHeaders }, signal }), 'GetBlogPostsWithAuthor', 'query', variables);
        },
        GetLatestBlogPosts(variables, requestHeaders, signal) {
            return withWrapper((wrappedRequestHeaders) => client.request({ document: GetLatestBlogPostsDocument, variables, requestHeaders: { ...requestHeaders, ...wrappedRequestHeaders }, signal }), 'GetLatestBlogPosts', 'query', variables);
        },
        GetDraftBlogPosts(variables, requestHeaders, signal) {
            return withWrapper((wrappedRequestHeaders) => client.request({ document: GetDraftBlogPostsDocument, variables, requestHeaders: { ...requestHeaders, ...wrappedRequestHeaders }, signal }), 'GetDraftBlogPosts', 'query', variables);
        },
        GetBlogPostsConnection(variables, requestHeaders, signal) {
            return withWrapper((wrappedRequestHeaders) => client.request({ document: GetBlogPostsConnectionDocument, variables, requestHeaders: { ...requestHeaders, ...wrappedRequestHeaders }, signal }), 'GetBlogPostsConnection', 'query', variables);
        },
        GetNextPageBlogPosts(variables, requestHeaders, signal) {
            return withWrapper((wrappedRequestHeaders) => client.request({ document: GetNextPageBlogPostsDocument, variables, requestHeaders: { ...requestHeaders, ...wrappedRequestHeaders }, signal }), 'GetNextPageBlogPosts', 'query', variables);
        },
        GetPreviousPageBlogPosts(variables, requestHeaders, signal) {
            return withWrapper((wrappedRequestHeaders) => client.request({ document: GetPreviousPageBlogPostsDocument, variables, requestHeaders: { ...requestHeaders, ...wrappedRequestHeaders }, signal }), 'GetPreviousPageBlogPosts', 'query', variables);
        },
        GetBlogPostsByViewCount(variables, requestHeaders, signal) {
            return withWrapper((wrappedRequestHeaders) => client.request({ document: GetBlogPostsByViewCountDocument, variables, requestHeaders: { ...requestHeaders, ...wrappedRequestHeaders }, signal }), 'GetBlogPostsByViewCount', 'query', variables);
        },
        GetBlogPostsByLikeCount(variables, requestHeaders, signal) {
            return withWrapper((wrappedRequestHeaders) => client.request({ document: GetBlogPostsByLikeCountDocument, variables, requestHeaders: { ...requestHeaders, ...wrappedRequestHeaders }, signal }), 'GetBlogPostsByLikeCount', 'query', variables);
        },
        GetFullBlogPostsConnection(variables, requestHeaders, signal) {
            return withWrapper((wrappedRequestHeaders) => client.request({ document: GetFullBlogPostsConnectionDocument, variables, requestHeaders: { ...requestHeaders, ...wrappedRequestHeaders }, signal }), 'GetFullBlogPostsConnection', 'query', variables);
        },
        TestEcho(variables, requestHeaders, signal) {
            return withWrapper((wrappedRequestHeaders) => client.request({ document: TestEchoDocument, variables, requestHeaders: { ...requestHeaders, ...wrappedRequestHeaders }, signal }), 'TestEcho', 'mutation', variables);
        },
        GetDashboardData(variables, requestHeaders, signal) {
            return withWrapper((wrappedRequestHeaders) => client.request({ document: GetDashboardDataDocument, variables, requestHeaders: { ...requestHeaders, ...wrappedRequestHeaders }, signal }), 'GetDashboardData', 'query', variables);
        },
        GetMultipleBlogPostLists(variables, requestHeaders, signal) {
            return withWrapper((wrappedRequestHeaders) => client.request({ document: GetMultipleBlogPostListsDocument, variables, requestHeaders: { ...requestHeaders, ...wrappedRequestHeaders }, signal }), 'GetMultipleBlogPostLists', 'query', variables);
        },
        GetBlogPostsWithFragments(variables, requestHeaders, signal) {
            return withWrapper((wrappedRequestHeaders) => client.request({ document: GetBlogPostsWithFragmentsDocument, variables, requestHeaders: { ...requestHeaders, ...wrappedRequestHeaders }, signal }), 'GetBlogPostsWithFragments', 'query', variables);
        },
        GetBlogPostWithFullAuthorInfo(variables, requestHeaders, signal) {
            return withWrapper((wrappedRequestHeaders) => client.request({ document: GetBlogPostWithFullAuthorInfoDocument, variables, requestHeaders: { ...requestHeaders, ...wrappedRequestHeaders }, signal }), 'GetBlogPostWithFullAuthorInfo', 'query', variables);
        },
        GetMultipleUsers(variables, requestHeaders, signal) {
            return withWrapper((wrappedRequestHeaders) => client.request({ document: GetMultipleUsersDocument, variables, requestHeaders: { ...requestHeaders, ...wrappedRequestHeaders }, signal }), 'GetMultipleUsers', 'query', variables);
        },
        GetConditionalData(variables, requestHeaders, signal) {
            return withWrapper((wrappedRequestHeaders) => client.request({ document: GetConditionalDataDocument, variables, requestHeaders: { ...requestHeaders, ...wrappedRequestHeaders }, signal }), 'GetConditionalData', 'query', variables);
        },
        GetOptimizedBlogPostList(variables, requestHeaders, signal) {
            return withWrapper((wrappedRequestHeaders) => client.request({ document: GetOptimizedBlogPostListDocument, variables, requestHeaders: { ...requestHeaders, ...wrappedRequestHeaders }, signal }), 'GetOptimizedBlogPostList', 'query', variables);
        },
        GetDeepNestedData(variables, requestHeaders, signal) {
            return withWrapper((wrappedRequestHeaders) => client.request({ document: GetDeepNestedDataDocument, variables, requestHeaders: { ...requestHeaders, ...wrappedRequestHeaders }, signal }), 'GetDeepNestedData', 'query', variables);
        },
        OnNewBlogPost(variables, requestHeaders, signal) {
            return withWrapper((wrappedRequestHeaders) => client.request({ document: OnNewBlogPostDocument, variables, requestHeaders: { ...requestHeaders, ...wrappedRequestHeaders }, signal }), 'OnNewBlogPost', 'subscription', variables);
        },
        OnCurrentTime(variables, requestHeaders, signal) {
            return withWrapper((wrappedRequestHeaders) => client.request({ document: OnCurrentTimeDocument, variables, requestHeaders: { ...requestHeaders, ...wrappedRequestHeaders }, signal }), 'OnCurrentTime', 'subscription', variables);
        },
        OnNewBlogPostSimple(variables, requestHeaders, signal) {
            return withWrapper((wrappedRequestHeaders) => client.request({ document: OnNewBlogPostSimpleDocument, variables, requestHeaders: { ...requestHeaders, ...wrappedRequestHeaders }, signal }), 'OnNewBlogPostSimple', 'subscription', variables);
        }
    };
}
//# sourceMappingURL=types.js.map