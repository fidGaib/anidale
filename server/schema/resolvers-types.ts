import { GraphQLResolveInfo, GraphQLScalarType, GraphQLScalarTypeConfig } from 'graphql'

export type Maybe<T> = T | null
export type InputMaybe<T> = Maybe<T>
export type Exact<T extends { [key: string]: unknown }> = { [K in keyof T]: T[K] }
export type MakeOptional<T, K extends keyof T> = Omit<T, K> & { [SubKey in K]?: Maybe<T[SubKey]> }
export type MakeMaybe<T, K extends keyof T> = Omit<T, K> & { [SubKey in K]: Maybe<T[SubKey]> }
export type RequireFields<T, K extends keyof T> = Omit<T, K> & { [P in K]-?: NonNullable<T[P]> }
/** All built-in and custom scalars, mapped to their actual values */
export type Scalars = {
  ID: string
  String: string
  Boolean: boolean
  Int: number
  Float: number
  Date: Date
  FILE: File
}

export type CreatePost = {
  description?: InputMaybe<Scalars['String']>
  images?: InputMaybe<Array<InputMaybe<Scalars['FILE']>>>
  owner: Scalars['Int']
}

export type Login = {
  email: Scalars['String']
  pass: Scalars['String']
}

export type Mutation = {
  __typename?: 'Mutation'
  createPost?: Maybe<Post>
  login?: Maybe<User>
  logout?: Maybe<Scalars['Boolean']>
  refresh?: Maybe<Refresh>
  registration?: Maybe<User>
  remove?: Maybe<Scalars['Boolean']>
  removePost?: Maybe<Scalars['Boolean']>
  update?: Maybe<UpdateUserQuery>
  updatePost?: Maybe<Post>
}

export type MutationCreatePostArgs = {
  post: CreatePost
}

export type MutationLoginArgs = {
  user: Login
}

export type MutationLogoutArgs = {
  refreshToken: Scalars['String']
}

export type MutationRegistrationArgs = {
  user: Registration
}

export type MutationRemoveArgs = {
  id: Scalars['Int']
}

export type MutationRemovePostArgs = {
  id: Scalars['Int']
}

export type MutationUpdateArgs = {
  id: Scalars['Int']
  user?: InputMaybe<UpdateUser>
}

export type MutationUpdatePostArgs = {
  id: Scalars['Int']
  post?: InputMaybe<UpdatePost>
}

export type Post = {
  __typename?: 'Post'
  countComm?: Maybe<Scalars['Int']>
  countLikes?: Maybe<Scalars['Int']>
  date?: Maybe<Scalars['Date']>
  description?: Maybe<Scalars['String']>
  id?: Maybe<Scalars['Int']>
  images?: Maybe<Array<Maybe<PostImages>>>
  owner?: Maybe<User>
}

export type PostImages = {
  __typename?: 'PostImages'
  date?: Maybe<Scalars['Date']>
  id?: Maybe<Scalars['Int']>
  minimize?: Maybe<Scalars['String']>
  oversize?: Maybe<Scalars['String']>
  postId?: Maybe<Scalars['Int']>
}

export type Query = {
  __typename?: 'Query'
  getPostByUser?: Maybe<Array<Maybe<Post>>>
  getPosts?: Maybe<Array<Maybe<Post>>>
  getUser?: Maybe<User>
  getUsers: Array<User>
}

export type QueryGetPostByUserArgs = {
  id: Scalars['Int']
  limit: Scalars['Int']
  page: Scalars['Int']
}

export type QueryGetPostsArgs = {
  limit: Scalars['Int']
  page: Scalars['Int']
}

export type QueryGetUserArgs = {
  id: Scalars['Int']
}

export type Refresh = {
  __typename?: 'Refresh'
  accessToken?: Maybe<Scalars['String']>
  refreshToken?: Maybe<Scalars['String']>
  user?: Maybe<RefreshUserQuery>
}

export type RefreshUserQuery = {
  __typename?: 'RefreshUserQuery'
  avatar?: Maybe<Scalars['String']>
  createdAt?: Maybe<Scalars['Date']>
  email?: Maybe<Scalars['String']>
  id?: Maybe<Scalars['Int']>
  isActivated?: Maybe<Scalars['Boolean']>
  login?: Maybe<Scalars['String']>
}

export type Registration = {
  email: Scalars['String']
  pass: Scalars['String']
  pass2: Scalars['String']
}

export type UpdatePost = {
  description?: InputMaybe<Scalars['String']>
  images?: InputMaybe<Array<InputMaybe<Scalars['FILE']>>>
}

export type UpdateUser = {
  accessToken?: InputMaybe<Scalars['String']>
  activationLink?: InputMaybe<Scalars['String']>
  avatar?: InputMaybe<Scalars['String']>
  email?: InputMaybe<Scalars['String']>
  isActivated?: InputMaybe<Scalars['Boolean']>
  login?: InputMaybe<Scalars['String']>
  pass?: InputMaybe<Scalars['String']>
  refreshToken?: InputMaybe<Scalars['String']>
}

export type UpdateUserQuery = {
  __typename?: 'UpdateUserQuery'
  activationLink?: Maybe<Scalars['String']>
  avatar?: Maybe<Scalars['String']>
  createdAt?: Maybe<Scalars['Date']>
  email?: Maybe<Scalars['String']>
  id?: Maybe<Scalars['Int']>
  isActivated?: Maybe<Scalars['Boolean']>
  login?: Maybe<Scalars['String']>
}

export type User = {
  __typename?: 'User'
  accessToken?: Maybe<Scalars['String']>
  activationLink?: Maybe<Scalars['String']>
  avatar?: Maybe<Scalars['String']>
  createdAt?: Maybe<Scalars['Date']>
  email?: Maybe<Scalars['String']>
  id?: Maybe<Scalars['Int']>
  isActivated?: Maybe<Scalars['Boolean']>
  login?: Maybe<Scalars['String']>
  refreshToken?: Maybe<Scalars['String']>
}

export type ResolverTypeWrapper<T> = Promise<T> | T

export type ResolverWithResolve<TResult, TParent, TContext, TArgs> = {
  resolve: ResolverFn<TResult, TParent, TContext, TArgs>
}
export type Resolver<TResult, TParent = {}, TContext = {}, TArgs = {}> =
  | ResolverFn<TResult, TParent, TContext, TArgs>
  | ResolverWithResolve<TResult, TParent, TContext, TArgs>

export type ResolverFn<TResult, TParent, TContext, TArgs> = (
  parent: TParent,
  args: TArgs,
  context: TContext,
  info: GraphQLResolveInfo,
) => Promise<TResult> | TResult

export type SubscriptionSubscribeFn<TResult, TParent, TContext, TArgs> = (
  parent: TParent,
  args: TArgs,
  context: TContext,
  info: GraphQLResolveInfo,
) => AsyncIterable<TResult> | Promise<AsyncIterable<TResult>>

export type SubscriptionResolveFn<TResult, TParent, TContext, TArgs> = (
  parent: TParent,
  args: TArgs,
  context: TContext,
  info: GraphQLResolveInfo,
) => TResult | Promise<TResult>

export interface SubscriptionSubscriberObject<TResult, TKey extends string, TParent, TContext, TArgs> {
  subscribe: SubscriptionSubscribeFn<{ [key in TKey]: TResult }, TParent, TContext, TArgs>
  resolve?: SubscriptionResolveFn<TResult, { [key in TKey]: TResult }, TContext, TArgs>
}

export interface SubscriptionResolverObject<TResult, TParent, TContext, TArgs> {
  subscribe: SubscriptionSubscribeFn<any, TParent, TContext, TArgs>
  resolve: SubscriptionResolveFn<TResult, any, TContext, TArgs>
}

export type SubscriptionObject<TResult, TKey extends string, TParent, TContext, TArgs> =
  | SubscriptionSubscriberObject<TResult, TKey, TParent, TContext, TArgs>
  | SubscriptionResolverObject<TResult, TParent, TContext, TArgs>

export type SubscriptionResolver<TResult, TKey extends string, TParent = {}, TContext = {}, TArgs = {}> =
  | ((...args: any[]) => SubscriptionObject<TResult, TKey, TParent, TContext, TArgs>)
  | SubscriptionObject<TResult, TKey, TParent, TContext, TArgs>

export type TypeResolveFn<TTypes, TParent = {}, TContext = {}> = (
  parent: TParent,
  context: TContext,
  info: GraphQLResolveInfo,
) => Maybe<TTypes> | Promise<Maybe<TTypes>>

export type IsTypeOfResolverFn<T = {}, TContext = {}> = (
  obj: T,
  context: TContext,
  info: GraphQLResolveInfo,
) => boolean | Promise<boolean>

export type NextResolverFn<T> = () => Promise<T>

export type DirectiveResolverFn<TResult = {}, TParent = {}, TContext = {}, TArgs = {}> = (
  next: NextResolverFn<TResult>,
  parent: TParent,
  args: TArgs,
  context: TContext,
  info: GraphQLResolveInfo,
) => TResult | Promise<TResult>

/** Mapping between all available schema types and the resolvers types */
export type ResolversTypes = {
  Boolean: ResolverTypeWrapper<Scalars['Boolean']>
  CreatePost: CreatePost
  Date: ResolverTypeWrapper<Scalars['Date']>
  FILE: ResolverTypeWrapper<Scalars['FILE']>
  Int: ResolverTypeWrapper<Scalars['Int']>
  Login: Login
  Mutation: ResolverTypeWrapper<{}>
  Post: ResolverTypeWrapper<Post>
  PostImages: ResolverTypeWrapper<PostImages>
  Query: ResolverTypeWrapper<{}>
  Refresh: ResolverTypeWrapper<Refresh>
  RefreshUserQuery: ResolverTypeWrapper<RefreshUserQuery>
  Registration: Registration
  String: ResolverTypeWrapper<Scalars['String']>
  UpdatePost: UpdatePost
  UpdateUser: UpdateUser
  UpdateUserQuery: ResolverTypeWrapper<UpdateUserQuery>
  User: ResolverTypeWrapper<User>
}

/** Mapping between all available schema types and the resolvers parents */
export type ResolversParentTypes = {
  Boolean: Scalars['Boolean']
  CreatePost: CreatePost
  Date: Scalars['Date']
  FILE: Scalars['FILE']
  Int: Scalars['Int']
  Login: Login
  Mutation: {}
  Post: Post
  PostImages: PostImages
  Query: {}
  Refresh: Refresh
  RefreshUserQuery: RefreshUserQuery
  Registration: Registration
  String: Scalars['String']
  UpdatePost: UpdatePost
  UpdateUser: UpdateUser
  UpdateUserQuery: UpdateUserQuery
  User: User
}

export interface DateScalarConfig extends GraphQLScalarTypeConfig<ResolversTypes['Date'], any> {
  name: 'Date'
}

export interface FileScalarConfig extends GraphQLScalarTypeConfig<ResolversTypes['FILE'], any> {
  name: 'FILE'
}

export type MutationResolvers<
  ContextType = any,
  ParentType extends ResolversParentTypes['Mutation'] = ResolversParentTypes['Mutation'],
> = {
  createPost?: Resolver<
    Maybe<ResolversTypes['Post']>,
    ParentType,
    ContextType,
    RequireFields<MutationCreatePostArgs, 'post'>
  >
  login?: Resolver<Maybe<ResolversTypes['User']>, ParentType, ContextType, RequireFields<MutationLoginArgs, 'user'>>
  logout?: Resolver<
    Maybe<ResolversTypes['Boolean']>,
    ParentType,
    ContextType,
    RequireFields<MutationLogoutArgs, 'refreshToken'>
  >
  refresh?: Resolver<Maybe<ResolversTypes['Refresh']>, ParentType, ContextType>
  registration?: Resolver<
    Maybe<ResolversTypes['User']>,
    ParentType,
    ContextType,
    RequireFields<MutationRegistrationArgs, 'user'>
  >
  remove?: Resolver<Maybe<ResolversTypes['Boolean']>, ParentType, ContextType, RequireFields<MutationRemoveArgs, 'id'>>
  removePost?: Resolver<
    Maybe<ResolversTypes['Boolean']>,
    ParentType,
    ContextType,
    RequireFields<MutationRemovePostArgs, 'id'>
  >
  update?: Resolver<
    Maybe<ResolversTypes['UpdateUserQuery']>,
    ParentType,
    ContextType,
    RequireFields<MutationUpdateArgs, 'id'>
  >
  updatePost?: Resolver<
    Maybe<ResolversTypes['Post']>,
    ParentType,
    ContextType,
    RequireFields<MutationUpdatePostArgs, 'id'>
  >
}

export type PostResolvers<
  ContextType = any,
  ParentType extends ResolversParentTypes['Post'] = ResolversParentTypes['Post'],
> = {
  countComm?: Resolver<Maybe<ResolversTypes['Int']>, ParentType, ContextType>
  countLikes?: Resolver<Maybe<ResolversTypes['Int']>, ParentType, ContextType>
  date?: Resolver<Maybe<ResolversTypes['Date']>, ParentType, ContextType>
  description?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>
  id?: Resolver<Maybe<ResolversTypes['Int']>, ParentType, ContextType>
  images?: Resolver<Maybe<Array<Maybe<ResolversTypes['PostImages']>>>, ParentType, ContextType>
  owner?: Resolver<Maybe<ResolversTypes['User']>, ParentType, ContextType>
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>
}

export type PostImagesResolvers<
  ContextType = any,
  ParentType extends ResolversParentTypes['PostImages'] = ResolversParentTypes['PostImages'],
> = {
  date?: Resolver<Maybe<ResolversTypes['Date']>, ParentType, ContextType>
  id?: Resolver<Maybe<ResolversTypes['Int']>, ParentType, ContextType>
  minimize?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>
  oversize?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>
  postId?: Resolver<Maybe<ResolversTypes['Int']>, ParentType, ContextType>
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>
}

export type QueryResolvers<
  ContextType = any,
  ParentType extends ResolversParentTypes['Query'] = ResolversParentTypes['Query'],
> = {
  getPostByUser?: Resolver<
    Maybe<Array<Maybe<ResolversTypes['Post']>>>,
    ParentType,
    ContextType,
    RequireFields<QueryGetPostByUserArgs, 'id' | 'limit' | 'page'>
  >
  getPosts?: Resolver<
    Maybe<Array<Maybe<ResolversTypes['Post']>>>,
    ParentType,
    ContextType,
    RequireFields<QueryGetPostsArgs, 'limit' | 'page'>
  >
  getUser?: Resolver<Maybe<ResolversTypes['User']>, ParentType, ContextType, RequireFields<QueryGetUserArgs, 'id'>>
  getUsers?: Resolver<Array<ResolversTypes['User']>, ParentType, ContextType>
  refresh?: any
}

export type RefreshResolvers<
  ContextType = any,
  ParentType extends ResolversParentTypes['Refresh'] = ResolversParentTypes['Refresh'],
> = {
  accessToken?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>
  refreshToken?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>
  user?: Resolver<Maybe<ResolversTypes['RefreshUserQuery']>, ParentType, ContextType>
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>
}

export type RefreshUserQueryResolvers<
  ContextType = any,
  ParentType extends ResolversParentTypes['RefreshUserQuery'] = ResolversParentTypes['RefreshUserQuery'],
> = {
  avatar?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>
  createdAt?: Resolver<Maybe<ResolversTypes['Date']>, ParentType, ContextType>
  email?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>
  id?: Resolver<Maybe<ResolversTypes['Int']>, ParentType, ContextType>
  isActivated?: Resolver<Maybe<ResolversTypes['Boolean']>, ParentType, ContextType>
  login?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>
}

export type UpdateUserQueryResolvers<
  ContextType = any,
  ParentType extends ResolversParentTypes['UpdateUserQuery'] = ResolversParentTypes['UpdateUserQuery'],
> = {
  activationLink?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>
  avatar?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>
  createdAt?: Resolver<Maybe<ResolversTypes['Date']>, ParentType, ContextType>
  email?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>
  id?: Resolver<Maybe<ResolversTypes['Int']>, ParentType, ContextType>
  isActivated?: Resolver<Maybe<ResolversTypes['Boolean']>, ParentType, ContextType>
  login?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>
}

export type UserResolvers<
  ContextType = any,
  ParentType extends ResolversParentTypes['User'] = ResolversParentTypes['User'],
> = {
  accessToken?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>
  activationLink?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>
  avatar?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>
  createdAt?: Resolver<Maybe<ResolversTypes['Date']>, ParentType, ContextType>
  email?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>
  id?: Resolver<Maybe<ResolversTypes['Int']>, ParentType, ContextType>
  isActivated?: Resolver<Maybe<ResolversTypes['Boolean']>, ParentType, ContextType>
  login?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>
  refreshToken?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>
}

export type Resolvers<ContextType = any> = {
  Date?: GraphQLScalarType
  FILE?: GraphQLScalarType
  Mutation?: MutationResolvers<ContextType>
  Post?: PostResolvers<ContextType>
  PostImages?: PostImagesResolvers<ContextType>
  Query?: QueryResolvers<ContextType>
  Refresh?: RefreshResolvers<ContextType>
  RefreshUserQuery?: RefreshUserQueryResolvers<ContextType>
  UpdateUserQuery?: UpdateUserQueryResolvers<ContextType>
  User?: UserResolvers<ContextType>
}
