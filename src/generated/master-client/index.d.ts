
/**
 * Client
**/

import * as runtime from './runtime/library.js';
import $Types = runtime.Types // general types
import $Public = runtime.Types.Public
import $Utils = runtime.Types.Utils
import $Extensions = runtime.Types.Extensions
import $Result = runtime.Types.Result

export type PrismaPromise<T> = $Public.PrismaPromise<T>


/**
 * Model Studio
 * 
 */
export type Studio = $Result.DefaultSelection<Prisma.$StudioPayload>
/**
 * Model MasterUser
 * 
 */
export type MasterUser = $Result.DefaultSelection<Prisma.$MasterUserPayload>
/**
 * Model StudioMembership
 * 
 */
export type StudioMembership = $Result.DefaultSelection<Prisma.$StudioMembershipPayload>
/**
 * Model OtpCode
 * 
 */
export type OtpCode = $Result.DefaultSelection<Prisma.$OtpCodePayload>
/**
 * Model Session
 * 
 */
export type Session = $Result.DefaultSelection<Prisma.$SessionPayload>

/**
 * ##  Prisma Client ʲˢ
 *
 * Type-safe database client for TypeScript & Node.js
 * @example
 * ```
 * const prisma = new PrismaClient()
 * // Fetch zero or more Studios
 * const studios = await prisma.studio.findMany()
 * ```
 *
 *
 * Read more in our [docs](https://www.prisma.io/docs/reference/tools-and-interfaces/prisma-client).
 */
export class PrismaClient<
  ClientOptions extends Prisma.PrismaClientOptions = Prisma.PrismaClientOptions,
  const U = 'log' extends keyof ClientOptions ? ClientOptions['log'] extends Array<Prisma.LogLevel | Prisma.LogDefinition> ? Prisma.GetEvents<ClientOptions['log']> : never : never,
  ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs
> {
  [K: symbol]: { types: Prisma.TypeMap<ExtArgs>['other'] }

    /**
   * ##  Prisma Client ʲˢ
   *
   * Type-safe database client for TypeScript & Node.js
   * @example
   * ```
   * const prisma = new PrismaClient()
   * // Fetch zero or more Studios
   * const studios = await prisma.studio.findMany()
   * ```
   *
   *
   * Read more in our [docs](https://www.prisma.io/docs/reference/tools-and-interfaces/prisma-client).
   */

  constructor(optionsArg ?: Prisma.Subset<ClientOptions, Prisma.PrismaClientOptions>);
  $on<V extends U>(eventType: V, callback: (event: V extends 'query' ? Prisma.QueryEvent : Prisma.LogEvent) => void): PrismaClient;

  /**
   * Connect with the database
   */
  $connect(): $Utils.JsPromise<void>;

  /**
   * Disconnect from the database
   */
  $disconnect(): $Utils.JsPromise<void>;

/**
   * Executes a prepared raw query and returns the number of affected rows.
   * @example
   * ```
   * const result = await prisma.$executeRaw`UPDATE User SET cool = ${true} WHERE email = ${'user@email.com'};`
   * ```
   *
   * Read more in our [docs](https://www.prisma.io/docs/reference/tools-and-interfaces/prisma-client/raw-database-access).
   */
  $executeRaw<T = unknown>(query: TemplateStringsArray | Prisma.Sql, ...values: any[]): Prisma.PrismaPromise<number>;

  /**
   * Executes a raw query and returns the number of affected rows.
   * Susceptible to SQL injections, see documentation.
   * @example
   * ```
   * const result = await prisma.$executeRawUnsafe('UPDATE User SET cool = $1 WHERE email = $2 ;', true, 'user@email.com')
   * ```
   *
   * Read more in our [docs](https://www.prisma.io/docs/reference/tools-and-interfaces/prisma-client/raw-database-access).
   */
  $executeRawUnsafe<T = unknown>(query: string, ...values: any[]): Prisma.PrismaPromise<number>;

  /**
   * Performs a prepared raw query and returns the `SELECT` data.
   * @example
   * ```
   * const result = await prisma.$queryRaw`SELECT * FROM User WHERE id = ${1} OR email = ${'user@email.com'};`
   * ```
   *
   * Read more in our [docs](https://www.prisma.io/docs/reference/tools-and-interfaces/prisma-client/raw-database-access).
   */
  $queryRaw<T = unknown>(query: TemplateStringsArray | Prisma.Sql, ...values: any[]): Prisma.PrismaPromise<T>;

  /**
   * Performs a raw query and returns the `SELECT` data.
   * Susceptible to SQL injections, see documentation.
   * @example
   * ```
   * const result = await prisma.$queryRawUnsafe('SELECT * FROM User WHERE id = $1 OR email = $2;', 1, 'user@email.com')
   * ```
   *
   * Read more in our [docs](https://www.prisma.io/docs/reference/tools-and-interfaces/prisma-client/raw-database-access).
   */
  $queryRawUnsafe<T = unknown>(query: string, ...values: any[]): Prisma.PrismaPromise<T>;


  /**
   * Allows the running of a sequence of read/write operations that are guaranteed to either succeed or fail as a whole.
   * @example
   * ```
   * const [george, bob, alice] = await prisma.$transaction([
   *   prisma.user.create({ data: { name: 'George' } }),
   *   prisma.user.create({ data: { name: 'Bob' } }),
   *   prisma.user.create({ data: { name: 'Alice' } }),
   * ])
   * ```
   * 
   * Read more in our [docs](https://www.prisma.io/docs/concepts/components/prisma-client/transactions).
   */
  $transaction<P extends Prisma.PrismaPromise<any>[]>(arg: [...P], options?: { isolationLevel?: Prisma.TransactionIsolationLevel }): $Utils.JsPromise<runtime.Types.Utils.UnwrapTuple<P>>

  $transaction<R>(fn: (prisma: Omit<PrismaClient, runtime.ITXClientDenyList>) => $Utils.JsPromise<R>, options?: { maxWait?: number, timeout?: number, isolationLevel?: Prisma.TransactionIsolationLevel }): $Utils.JsPromise<R>


  $extends: $Extensions.ExtendsHook<"extends", Prisma.TypeMapCb<ClientOptions>, ExtArgs, $Utils.Call<Prisma.TypeMapCb<ClientOptions>, {
    extArgs: ExtArgs
  }>>

      /**
   * `prisma.studio`: Exposes CRUD operations for the **Studio** model.
    * Example usage:
    * ```ts
    * // Fetch zero or more Studios
    * const studios = await prisma.studio.findMany()
    * ```
    */
  get studio(): Prisma.StudioDelegate<ExtArgs, ClientOptions>;

  /**
   * `prisma.masterUser`: Exposes CRUD operations for the **MasterUser** model.
    * Example usage:
    * ```ts
    * // Fetch zero or more MasterUsers
    * const masterUsers = await prisma.masterUser.findMany()
    * ```
    */
  get masterUser(): Prisma.MasterUserDelegate<ExtArgs, ClientOptions>;

  /**
   * `prisma.studioMembership`: Exposes CRUD operations for the **StudioMembership** model.
    * Example usage:
    * ```ts
    * // Fetch zero or more StudioMemberships
    * const studioMemberships = await prisma.studioMembership.findMany()
    * ```
    */
  get studioMembership(): Prisma.StudioMembershipDelegate<ExtArgs, ClientOptions>;

  /**
   * `prisma.otpCode`: Exposes CRUD operations for the **OtpCode** model.
    * Example usage:
    * ```ts
    * // Fetch zero or more OtpCodes
    * const otpCodes = await prisma.otpCode.findMany()
    * ```
    */
  get otpCode(): Prisma.OtpCodeDelegate<ExtArgs, ClientOptions>;

  /**
   * `prisma.session`: Exposes CRUD operations for the **Session** model.
    * Example usage:
    * ```ts
    * // Fetch zero or more Sessions
    * const sessions = await prisma.session.findMany()
    * ```
    */
  get session(): Prisma.SessionDelegate<ExtArgs, ClientOptions>;
}

export namespace Prisma {
  export import DMMF = runtime.DMMF

  export type PrismaPromise<T> = $Public.PrismaPromise<T>

  /**
   * Validator
   */
  export import validator = runtime.Public.validator

  /**
   * Prisma Errors
   */
  export import PrismaClientKnownRequestError = runtime.PrismaClientKnownRequestError
  export import PrismaClientUnknownRequestError = runtime.PrismaClientUnknownRequestError
  export import PrismaClientRustPanicError = runtime.PrismaClientRustPanicError
  export import PrismaClientInitializationError = runtime.PrismaClientInitializationError
  export import PrismaClientValidationError = runtime.PrismaClientValidationError

  /**
   * Re-export of sql-template-tag
   */
  export import sql = runtime.sqltag
  export import empty = runtime.empty
  export import join = runtime.join
  export import raw = runtime.raw
  export import Sql = runtime.Sql



  /**
   * Decimal.js
   */
  export import Decimal = runtime.Decimal

  export type DecimalJsLike = runtime.DecimalJsLike

  /**
   * Metrics
   */
  export type Metrics = runtime.Metrics
  export type Metric<T> = runtime.Metric<T>
  export type MetricHistogram = runtime.MetricHistogram
  export type MetricHistogramBucket = runtime.MetricHistogramBucket

  /**
  * Extensions
  */
  export import Extension = $Extensions.UserArgs
  export import getExtensionContext = runtime.Extensions.getExtensionContext
  export import Args = $Public.Args
  export import Payload = $Public.Payload
  export import Result = $Public.Result
  export import Exact = $Public.Exact

  /**
   * Prisma Client JS version: 6.19.2
   * Query Engine version: c2990dca591cba766e3b7ef5d9e8a84796e47ab7
   */
  export type PrismaVersion = {
    client: string
  }

  export const prismaVersion: PrismaVersion

  /**
   * Utility Types
   */


  export import Bytes = runtime.Bytes
  export import JsonObject = runtime.JsonObject
  export import JsonArray = runtime.JsonArray
  export import JsonValue = runtime.JsonValue
  export import InputJsonObject = runtime.InputJsonObject
  export import InputJsonArray = runtime.InputJsonArray
  export import InputJsonValue = runtime.InputJsonValue

  /**
   * Types of the values used to represent different kinds of `null` values when working with JSON fields.
   *
   * @see https://www.prisma.io/docs/concepts/components/prisma-client/working-with-fields/working-with-json-fields#filtering-on-a-json-field
   */
  namespace NullTypes {
    /**
    * Type of `Prisma.DbNull`.
    *
    * You cannot use other instances of this class. Please use the `Prisma.DbNull` value.
    *
    * @see https://www.prisma.io/docs/concepts/components/prisma-client/working-with-fields/working-with-json-fields#filtering-on-a-json-field
    */
    class DbNull {
      private DbNull: never
      private constructor()
    }

    /**
    * Type of `Prisma.JsonNull`.
    *
    * You cannot use other instances of this class. Please use the `Prisma.JsonNull` value.
    *
    * @see https://www.prisma.io/docs/concepts/components/prisma-client/working-with-fields/working-with-json-fields#filtering-on-a-json-field
    */
    class JsonNull {
      private JsonNull: never
      private constructor()
    }

    /**
    * Type of `Prisma.AnyNull`.
    *
    * You cannot use other instances of this class. Please use the `Prisma.AnyNull` value.
    *
    * @see https://www.prisma.io/docs/concepts/components/prisma-client/working-with-fields/working-with-json-fields#filtering-on-a-json-field
    */
    class AnyNull {
      private AnyNull: never
      private constructor()
    }
  }

  /**
   * Helper for filtering JSON entries that have `null` on the database (empty on the db)
   *
   * @see https://www.prisma.io/docs/concepts/components/prisma-client/working-with-fields/working-with-json-fields#filtering-on-a-json-field
   */
  export const DbNull: NullTypes.DbNull

  /**
   * Helper for filtering JSON entries that have JSON `null` values (not empty on the db)
   *
   * @see https://www.prisma.io/docs/concepts/components/prisma-client/working-with-fields/working-with-json-fields#filtering-on-a-json-field
   */
  export const JsonNull: NullTypes.JsonNull

  /**
   * Helper for filtering JSON entries that are `Prisma.DbNull` or `Prisma.JsonNull`
   *
   * @see https://www.prisma.io/docs/concepts/components/prisma-client/working-with-fields/working-with-json-fields#filtering-on-a-json-field
   */
  export const AnyNull: NullTypes.AnyNull

  type SelectAndInclude = {
    select: any
    include: any
  }

  type SelectAndOmit = {
    select: any
    omit: any
  }

  /**
   * Get the type of the value, that the Promise holds.
   */
  export type PromiseType<T extends PromiseLike<any>> = T extends PromiseLike<infer U> ? U : T;

  /**
   * Get the return type of a function which returns a Promise.
   */
  export type PromiseReturnType<T extends (...args: any) => $Utils.JsPromise<any>> = PromiseType<ReturnType<T>>

  /**
   * From T, pick a set of properties whose keys are in the union K
   */
  type Prisma__Pick<T, K extends keyof T> = {
      [P in K]: T[P];
  };


  export type Enumerable<T> = T | Array<T>;

  export type RequiredKeys<T> = {
    [K in keyof T]-?: {} extends Prisma__Pick<T, K> ? never : K
  }[keyof T]

  export type TruthyKeys<T> = keyof {
    [K in keyof T as T[K] extends false | undefined | null ? never : K]: K
  }

  export type TrueKeys<T> = TruthyKeys<Prisma__Pick<T, RequiredKeys<T>>>

  /**
   * Subset
   * @desc From `T` pick properties that exist in `U`. Simple version of Intersection
   */
  export type Subset<T, U> = {
    [key in keyof T]: key extends keyof U ? T[key] : never;
  };

  /**
   * SelectSubset
   * @desc From `T` pick properties that exist in `U`. Simple version of Intersection.
   * Additionally, it validates, if both select and include are present. If the case, it errors.
   */
  export type SelectSubset<T, U> = {
    [key in keyof T]: key extends keyof U ? T[key] : never
  } &
    (T extends SelectAndInclude
      ? 'Please either choose `select` or `include`.'
      : T extends SelectAndOmit
        ? 'Please either choose `select` or `omit`.'
        : {})

  /**
   * Subset + Intersection
   * @desc From `T` pick properties that exist in `U` and intersect `K`
   */
  export type SubsetIntersection<T, U, K> = {
    [key in keyof T]: key extends keyof U ? T[key] : never
  } &
    K

  type Without<T, U> = { [P in Exclude<keyof T, keyof U>]?: never };

  /**
   * XOR is needed to have a real mutually exclusive union type
   * https://stackoverflow.com/questions/42123407/does-typescript-support-mutually-exclusive-types
   */
  type XOR<T, U> =
    T extends object ?
    U extends object ?
      (Without<T, U> & U) | (Without<U, T> & T)
    : U : T


  /**
   * Is T a Record?
   */
  type IsObject<T extends any> = T extends Array<any>
  ? False
  : T extends Date
  ? False
  : T extends Uint8Array
  ? False
  : T extends BigInt
  ? False
  : T extends object
  ? True
  : False


  /**
   * If it's T[], return T
   */
  export type UnEnumerate<T extends unknown> = T extends Array<infer U> ? U : T

  /**
   * From ts-toolbelt
   */

  type __Either<O extends object, K extends Key> = Omit<O, K> &
    {
      // Merge all but K
      [P in K]: Prisma__Pick<O, P & keyof O> // With K possibilities
    }[K]

  type EitherStrict<O extends object, K extends Key> = Strict<__Either<O, K>>

  type EitherLoose<O extends object, K extends Key> = ComputeRaw<__Either<O, K>>

  type _Either<
    O extends object,
    K extends Key,
    strict extends Boolean
  > = {
    1: EitherStrict<O, K>
    0: EitherLoose<O, K>
  }[strict]

  type Either<
    O extends object,
    K extends Key,
    strict extends Boolean = 1
  > = O extends unknown ? _Either<O, K, strict> : never

  export type Union = any

  type PatchUndefined<O extends object, O1 extends object> = {
    [K in keyof O]: O[K] extends undefined ? At<O1, K> : O[K]
  } & {}

  /** Helper Types for "Merge" **/
  export type IntersectOf<U extends Union> = (
    U extends unknown ? (k: U) => void : never
  ) extends (k: infer I) => void
    ? I
    : never

  export type Overwrite<O extends object, O1 extends object> = {
      [K in keyof O]: K extends keyof O1 ? O1[K] : O[K];
  } & {};

  type _Merge<U extends object> = IntersectOf<Overwrite<U, {
      [K in keyof U]-?: At<U, K>;
  }>>;

  type Key = string | number | symbol;
  type AtBasic<O extends object, K extends Key> = K extends keyof O ? O[K] : never;
  type AtStrict<O extends object, K extends Key> = O[K & keyof O];
  type AtLoose<O extends object, K extends Key> = O extends unknown ? AtStrict<O, K> : never;
  export type At<O extends object, K extends Key, strict extends Boolean = 1> = {
      1: AtStrict<O, K>;
      0: AtLoose<O, K>;
  }[strict];

  export type ComputeRaw<A extends any> = A extends Function ? A : {
    [K in keyof A]: A[K];
  } & {};

  export type OptionalFlat<O> = {
    [K in keyof O]?: O[K];
  } & {};

  type _Record<K extends keyof any, T> = {
    [P in K]: T;
  };

  // cause typescript not to expand types and preserve names
  type NoExpand<T> = T extends unknown ? T : never;

  // this type assumes the passed object is entirely optional
  type AtLeast<O extends object, K extends string> = NoExpand<
    O extends unknown
    ? | (K extends keyof O ? { [P in K]: O[P] } & O : O)
      | {[P in keyof O as P extends K ? P : never]-?: O[P]} & O
    : never>;

  type _Strict<U, _U = U> = U extends unknown ? U & OptionalFlat<_Record<Exclude<Keys<_U>, keyof U>, never>> : never;

  export type Strict<U extends object> = ComputeRaw<_Strict<U>>;
  /** End Helper Types for "Merge" **/

  export type Merge<U extends object> = ComputeRaw<_Merge<Strict<U>>>;

  /**
  A [[Boolean]]
  */
  export type Boolean = True | False

  // /**
  // 1
  // */
  export type True = 1

  /**
  0
  */
  export type False = 0

  export type Not<B extends Boolean> = {
    0: 1
    1: 0
  }[B]

  export type Extends<A1 extends any, A2 extends any> = [A1] extends [never]
    ? 0 // anything `never` is false
    : A1 extends A2
    ? 1
    : 0

  export type Has<U extends Union, U1 extends Union> = Not<
    Extends<Exclude<U1, U>, U1>
  >

  export type Or<B1 extends Boolean, B2 extends Boolean> = {
    0: {
      0: 0
      1: 1
    }
    1: {
      0: 1
      1: 1
    }
  }[B1][B2]

  export type Keys<U extends Union> = U extends unknown ? keyof U : never

  type Cast<A, B> = A extends B ? A : B;

  export const type: unique symbol;



  /**
   * Used by group by
   */

  export type GetScalarType<T, O> = O extends object ? {
    [P in keyof T]: P extends keyof O
      ? O[P]
      : never
  } : never

  type FieldPaths<
    T,
    U = Omit<T, '_avg' | '_sum' | '_count' | '_min' | '_max'>
  > = IsObject<T> extends True ? U : T

  type GetHavingFields<T> = {
    [K in keyof T]: Or<
      Or<Extends<'OR', K>, Extends<'AND', K>>,
      Extends<'NOT', K>
    > extends True
      ? // infer is only needed to not hit TS limit
        // based on the brilliant idea of Pierre-Antoine Mills
        // https://github.com/microsoft/TypeScript/issues/30188#issuecomment-478938437
        T[K] extends infer TK
        ? GetHavingFields<UnEnumerate<TK> extends object ? Merge<UnEnumerate<TK>> : never>
        : never
      : {} extends FieldPaths<T[K]>
      ? never
      : K
  }[keyof T]

  /**
   * Convert tuple to union
   */
  type _TupleToUnion<T> = T extends (infer E)[] ? E : never
  type TupleToUnion<K extends readonly any[]> = _TupleToUnion<K>
  type MaybeTupleToUnion<T> = T extends any[] ? TupleToUnion<T> : T

  /**
   * Like `Pick`, but additionally can also accept an array of keys
   */
  type PickEnumerable<T, K extends Enumerable<keyof T> | keyof T> = Prisma__Pick<T, MaybeTupleToUnion<K>>

  /**
   * Exclude all keys with underscores
   */
  type ExcludeUnderscoreKeys<T extends string> = T extends `_${string}` ? never : T


  export type FieldRef<Model, FieldType> = runtime.FieldRef<Model, FieldType>

  type FieldRefInputType<Model, FieldType> = Model extends never ? never : FieldRef<Model, FieldType>


  export const ModelName: {
    Studio: 'Studio',
    MasterUser: 'MasterUser',
    StudioMembership: 'StudioMembership',
    OtpCode: 'OtpCode',
    Session: 'Session'
  };

  export type ModelName = (typeof ModelName)[keyof typeof ModelName]


  export type Datasources = {
    db?: Datasource
  }

  interface TypeMapCb<ClientOptions = {}> extends $Utils.Fn<{extArgs: $Extensions.InternalArgs }, $Utils.Record<string, any>> {
    returns: Prisma.TypeMap<this['params']['extArgs'], ClientOptions extends { omit: infer OmitOptions } ? OmitOptions : {}>
  }

  export type TypeMap<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> = {
    globalOmitOptions: {
      omit: GlobalOmitOptions
    }
    meta: {
      modelProps: "studio" | "masterUser" | "studioMembership" | "otpCode" | "session"
      txIsolationLevel: Prisma.TransactionIsolationLevel
    }
    model: {
      Studio: {
        payload: Prisma.$StudioPayload<ExtArgs>
        fields: Prisma.StudioFieldRefs
        operations: {
          findUnique: {
            args: Prisma.StudioFindUniqueArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$StudioPayload> | null
          }
          findUniqueOrThrow: {
            args: Prisma.StudioFindUniqueOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$StudioPayload>
          }
          findFirst: {
            args: Prisma.StudioFindFirstArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$StudioPayload> | null
          }
          findFirstOrThrow: {
            args: Prisma.StudioFindFirstOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$StudioPayload>
          }
          findMany: {
            args: Prisma.StudioFindManyArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$StudioPayload>[]
          }
          create: {
            args: Prisma.StudioCreateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$StudioPayload>
          }
          createMany: {
            args: Prisma.StudioCreateManyArgs<ExtArgs>
            result: BatchPayload
          }
          createManyAndReturn: {
            args: Prisma.StudioCreateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$StudioPayload>[]
          }
          delete: {
            args: Prisma.StudioDeleteArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$StudioPayload>
          }
          update: {
            args: Prisma.StudioUpdateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$StudioPayload>
          }
          deleteMany: {
            args: Prisma.StudioDeleteManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateMany: {
            args: Prisma.StudioUpdateManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateManyAndReturn: {
            args: Prisma.StudioUpdateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$StudioPayload>[]
          }
          upsert: {
            args: Prisma.StudioUpsertArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$StudioPayload>
          }
          aggregate: {
            args: Prisma.StudioAggregateArgs<ExtArgs>
            result: $Utils.Optional<AggregateStudio>
          }
          groupBy: {
            args: Prisma.StudioGroupByArgs<ExtArgs>
            result: $Utils.Optional<StudioGroupByOutputType>[]
          }
          count: {
            args: Prisma.StudioCountArgs<ExtArgs>
            result: $Utils.Optional<StudioCountAggregateOutputType> | number
          }
        }
      }
      MasterUser: {
        payload: Prisma.$MasterUserPayload<ExtArgs>
        fields: Prisma.MasterUserFieldRefs
        operations: {
          findUnique: {
            args: Prisma.MasterUserFindUniqueArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$MasterUserPayload> | null
          }
          findUniqueOrThrow: {
            args: Prisma.MasterUserFindUniqueOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$MasterUserPayload>
          }
          findFirst: {
            args: Prisma.MasterUserFindFirstArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$MasterUserPayload> | null
          }
          findFirstOrThrow: {
            args: Prisma.MasterUserFindFirstOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$MasterUserPayload>
          }
          findMany: {
            args: Prisma.MasterUserFindManyArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$MasterUserPayload>[]
          }
          create: {
            args: Prisma.MasterUserCreateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$MasterUserPayload>
          }
          createMany: {
            args: Prisma.MasterUserCreateManyArgs<ExtArgs>
            result: BatchPayload
          }
          createManyAndReturn: {
            args: Prisma.MasterUserCreateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$MasterUserPayload>[]
          }
          delete: {
            args: Prisma.MasterUserDeleteArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$MasterUserPayload>
          }
          update: {
            args: Prisma.MasterUserUpdateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$MasterUserPayload>
          }
          deleteMany: {
            args: Prisma.MasterUserDeleteManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateMany: {
            args: Prisma.MasterUserUpdateManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateManyAndReturn: {
            args: Prisma.MasterUserUpdateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$MasterUserPayload>[]
          }
          upsert: {
            args: Prisma.MasterUserUpsertArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$MasterUserPayload>
          }
          aggregate: {
            args: Prisma.MasterUserAggregateArgs<ExtArgs>
            result: $Utils.Optional<AggregateMasterUser>
          }
          groupBy: {
            args: Prisma.MasterUserGroupByArgs<ExtArgs>
            result: $Utils.Optional<MasterUserGroupByOutputType>[]
          }
          count: {
            args: Prisma.MasterUserCountArgs<ExtArgs>
            result: $Utils.Optional<MasterUserCountAggregateOutputType> | number
          }
        }
      }
      StudioMembership: {
        payload: Prisma.$StudioMembershipPayload<ExtArgs>
        fields: Prisma.StudioMembershipFieldRefs
        operations: {
          findUnique: {
            args: Prisma.StudioMembershipFindUniqueArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$StudioMembershipPayload> | null
          }
          findUniqueOrThrow: {
            args: Prisma.StudioMembershipFindUniqueOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$StudioMembershipPayload>
          }
          findFirst: {
            args: Prisma.StudioMembershipFindFirstArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$StudioMembershipPayload> | null
          }
          findFirstOrThrow: {
            args: Prisma.StudioMembershipFindFirstOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$StudioMembershipPayload>
          }
          findMany: {
            args: Prisma.StudioMembershipFindManyArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$StudioMembershipPayload>[]
          }
          create: {
            args: Prisma.StudioMembershipCreateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$StudioMembershipPayload>
          }
          createMany: {
            args: Prisma.StudioMembershipCreateManyArgs<ExtArgs>
            result: BatchPayload
          }
          createManyAndReturn: {
            args: Prisma.StudioMembershipCreateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$StudioMembershipPayload>[]
          }
          delete: {
            args: Prisma.StudioMembershipDeleteArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$StudioMembershipPayload>
          }
          update: {
            args: Prisma.StudioMembershipUpdateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$StudioMembershipPayload>
          }
          deleteMany: {
            args: Prisma.StudioMembershipDeleteManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateMany: {
            args: Prisma.StudioMembershipUpdateManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateManyAndReturn: {
            args: Prisma.StudioMembershipUpdateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$StudioMembershipPayload>[]
          }
          upsert: {
            args: Prisma.StudioMembershipUpsertArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$StudioMembershipPayload>
          }
          aggregate: {
            args: Prisma.StudioMembershipAggregateArgs<ExtArgs>
            result: $Utils.Optional<AggregateStudioMembership>
          }
          groupBy: {
            args: Prisma.StudioMembershipGroupByArgs<ExtArgs>
            result: $Utils.Optional<StudioMembershipGroupByOutputType>[]
          }
          count: {
            args: Prisma.StudioMembershipCountArgs<ExtArgs>
            result: $Utils.Optional<StudioMembershipCountAggregateOutputType> | number
          }
        }
      }
      OtpCode: {
        payload: Prisma.$OtpCodePayload<ExtArgs>
        fields: Prisma.OtpCodeFieldRefs
        operations: {
          findUnique: {
            args: Prisma.OtpCodeFindUniqueArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$OtpCodePayload> | null
          }
          findUniqueOrThrow: {
            args: Prisma.OtpCodeFindUniqueOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$OtpCodePayload>
          }
          findFirst: {
            args: Prisma.OtpCodeFindFirstArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$OtpCodePayload> | null
          }
          findFirstOrThrow: {
            args: Prisma.OtpCodeFindFirstOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$OtpCodePayload>
          }
          findMany: {
            args: Prisma.OtpCodeFindManyArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$OtpCodePayload>[]
          }
          create: {
            args: Prisma.OtpCodeCreateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$OtpCodePayload>
          }
          createMany: {
            args: Prisma.OtpCodeCreateManyArgs<ExtArgs>
            result: BatchPayload
          }
          createManyAndReturn: {
            args: Prisma.OtpCodeCreateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$OtpCodePayload>[]
          }
          delete: {
            args: Prisma.OtpCodeDeleteArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$OtpCodePayload>
          }
          update: {
            args: Prisma.OtpCodeUpdateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$OtpCodePayload>
          }
          deleteMany: {
            args: Prisma.OtpCodeDeleteManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateMany: {
            args: Prisma.OtpCodeUpdateManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateManyAndReturn: {
            args: Prisma.OtpCodeUpdateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$OtpCodePayload>[]
          }
          upsert: {
            args: Prisma.OtpCodeUpsertArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$OtpCodePayload>
          }
          aggregate: {
            args: Prisma.OtpCodeAggregateArgs<ExtArgs>
            result: $Utils.Optional<AggregateOtpCode>
          }
          groupBy: {
            args: Prisma.OtpCodeGroupByArgs<ExtArgs>
            result: $Utils.Optional<OtpCodeGroupByOutputType>[]
          }
          count: {
            args: Prisma.OtpCodeCountArgs<ExtArgs>
            result: $Utils.Optional<OtpCodeCountAggregateOutputType> | number
          }
        }
      }
      Session: {
        payload: Prisma.$SessionPayload<ExtArgs>
        fields: Prisma.SessionFieldRefs
        operations: {
          findUnique: {
            args: Prisma.SessionFindUniqueArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$SessionPayload> | null
          }
          findUniqueOrThrow: {
            args: Prisma.SessionFindUniqueOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$SessionPayload>
          }
          findFirst: {
            args: Prisma.SessionFindFirstArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$SessionPayload> | null
          }
          findFirstOrThrow: {
            args: Prisma.SessionFindFirstOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$SessionPayload>
          }
          findMany: {
            args: Prisma.SessionFindManyArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$SessionPayload>[]
          }
          create: {
            args: Prisma.SessionCreateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$SessionPayload>
          }
          createMany: {
            args: Prisma.SessionCreateManyArgs<ExtArgs>
            result: BatchPayload
          }
          createManyAndReturn: {
            args: Prisma.SessionCreateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$SessionPayload>[]
          }
          delete: {
            args: Prisma.SessionDeleteArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$SessionPayload>
          }
          update: {
            args: Prisma.SessionUpdateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$SessionPayload>
          }
          deleteMany: {
            args: Prisma.SessionDeleteManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateMany: {
            args: Prisma.SessionUpdateManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateManyAndReturn: {
            args: Prisma.SessionUpdateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$SessionPayload>[]
          }
          upsert: {
            args: Prisma.SessionUpsertArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$SessionPayload>
          }
          aggregate: {
            args: Prisma.SessionAggregateArgs<ExtArgs>
            result: $Utils.Optional<AggregateSession>
          }
          groupBy: {
            args: Prisma.SessionGroupByArgs<ExtArgs>
            result: $Utils.Optional<SessionGroupByOutputType>[]
          }
          count: {
            args: Prisma.SessionCountArgs<ExtArgs>
            result: $Utils.Optional<SessionCountAggregateOutputType> | number
          }
        }
      }
    }
  } & {
    other: {
      payload: any
      operations: {
        $executeRaw: {
          args: [query: TemplateStringsArray | Prisma.Sql, ...values: any[]],
          result: any
        }
        $executeRawUnsafe: {
          args: [query: string, ...values: any[]],
          result: any
        }
        $queryRaw: {
          args: [query: TemplateStringsArray | Prisma.Sql, ...values: any[]],
          result: any
        }
        $queryRawUnsafe: {
          args: [query: string, ...values: any[]],
          result: any
        }
      }
    }
  }
  export const defineExtension: $Extensions.ExtendsHook<"define", Prisma.TypeMapCb, $Extensions.DefaultArgs>
  export type DefaultPrismaClient = PrismaClient
  export type ErrorFormat = 'pretty' | 'colorless' | 'minimal'
  export interface PrismaClientOptions {
    /**
     * Overwrites the datasource url from your schema.prisma file
     */
    datasources?: Datasources
    /**
     * Overwrites the datasource url from your schema.prisma file
     */
    datasourceUrl?: string
    /**
     * @default "colorless"
     */
    errorFormat?: ErrorFormat
    /**
     * @example
     * ```
     * // Shorthand for `emit: 'stdout'`
     * log: ['query', 'info', 'warn', 'error']
     * 
     * // Emit as events only
     * log: [
     *   { emit: 'event', level: 'query' },
     *   { emit: 'event', level: 'info' },
     *   { emit: 'event', level: 'warn' }
     *   { emit: 'event', level: 'error' }
     * ]
     * 
     * / Emit as events and log to stdout
     * og: [
     *  { emit: 'stdout', level: 'query' },
     *  { emit: 'stdout', level: 'info' },
     *  { emit: 'stdout', level: 'warn' }
     *  { emit: 'stdout', level: 'error' }
     * 
     * ```
     * Read more in our [docs](https://www.prisma.io/docs/reference/tools-and-interfaces/prisma-client/logging#the-log-option).
     */
    log?: (LogLevel | LogDefinition)[]
    /**
     * The default values for transactionOptions
     * maxWait ?= 2000
     * timeout ?= 5000
     */
    transactionOptions?: {
      maxWait?: number
      timeout?: number
      isolationLevel?: Prisma.TransactionIsolationLevel
    }
    /**
     * Instance of a Driver Adapter, e.g., like one provided by `@prisma/adapter-planetscale`
     */
    adapter?: runtime.SqlDriverAdapterFactory | null
    /**
     * Global configuration for omitting model fields by default.
     * 
     * @example
     * ```
     * const prisma = new PrismaClient({
     *   omit: {
     *     user: {
     *       password: true
     *     }
     *   }
     * })
     * ```
     */
    omit?: Prisma.GlobalOmitConfig
  }
  export type GlobalOmitConfig = {
    studio?: StudioOmit
    masterUser?: MasterUserOmit
    studioMembership?: StudioMembershipOmit
    otpCode?: OtpCodeOmit
    session?: SessionOmit
  }

  /* Types for Logging */
  export type LogLevel = 'info' | 'query' | 'warn' | 'error'
  export type LogDefinition = {
    level: LogLevel
    emit: 'stdout' | 'event'
  }

  export type CheckIsLogLevel<T> = T extends LogLevel ? T : never;

  export type GetLogType<T> = CheckIsLogLevel<
    T extends LogDefinition ? T['level'] : T
  >;

  export type GetEvents<T extends any[]> = T extends Array<LogLevel | LogDefinition>
    ? GetLogType<T[number]>
    : never;

  export type QueryEvent = {
    timestamp: Date
    query: string
    params: string
    duration: number
    target: string
  }

  export type LogEvent = {
    timestamp: Date
    message: string
    target: string
  }
  /* End Types for Logging */


  export type PrismaAction =
    | 'findUnique'
    | 'findUniqueOrThrow'
    | 'findMany'
    | 'findFirst'
    | 'findFirstOrThrow'
    | 'create'
    | 'createMany'
    | 'createManyAndReturn'
    | 'update'
    | 'updateMany'
    | 'updateManyAndReturn'
    | 'upsert'
    | 'delete'
    | 'deleteMany'
    | 'executeRaw'
    | 'queryRaw'
    | 'aggregate'
    | 'count'
    | 'runCommandRaw'
    | 'findRaw'
    | 'groupBy'

  // tested in getLogLevel.test.ts
  export function getLogLevel(log: Array<LogLevel | LogDefinition>): LogLevel | undefined;

  /**
   * `PrismaClient` proxy available in interactive transactions.
   */
  export type TransactionClient = Omit<Prisma.DefaultPrismaClient, runtime.ITXClientDenyList>

  export type Datasource = {
    url?: string
  }

  /**
   * Count Types
   */


  /**
   * Count Type StudioCountOutputType
   */

  export type StudioCountOutputType = {
    memberships: number
  }

  export type StudioCountOutputTypeSelect<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    memberships?: boolean | StudioCountOutputTypeCountMembershipsArgs
  }

  // Custom InputTypes
  /**
   * StudioCountOutputType without action
   */
  export type StudioCountOutputTypeDefaultArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the StudioCountOutputType
     */
    select?: StudioCountOutputTypeSelect<ExtArgs> | null
  }

  /**
   * StudioCountOutputType without action
   */
  export type StudioCountOutputTypeCountMembershipsArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: StudioMembershipWhereInput
  }


  /**
   * Count Type MasterUserCountOutputType
   */

  export type MasterUserCountOutputType = {
    memberships: number
    sessions: number
  }

  export type MasterUserCountOutputTypeSelect<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    memberships?: boolean | MasterUserCountOutputTypeCountMembershipsArgs
    sessions?: boolean | MasterUserCountOutputTypeCountSessionsArgs
  }

  // Custom InputTypes
  /**
   * MasterUserCountOutputType without action
   */
  export type MasterUserCountOutputTypeDefaultArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the MasterUserCountOutputType
     */
    select?: MasterUserCountOutputTypeSelect<ExtArgs> | null
  }

  /**
   * MasterUserCountOutputType without action
   */
  export type MasterUserCountOutputTypeCountMembershipsArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: StudioMembershipWhereInput
  }

  /**
   * MasterUserCountOutputType without action
   */
  export type MasterUserCountOutputTypeCountSessionsArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: SessionWhereInput
  }


  /**
   * Models
   */

  /**
   * Model Studio
   */

  export type AggregateStudio = {
    _count: StudioCountAggregateOutputType | null
    _avg: StudioAvgAggregateOutputType | null
    _sum: StudioSumAggregateOutputType | null
    _min: StudioMinAggregateOutputType | null
    _max: StudioMaxAggregateOutputType | null
  }

  export type StudioAvgAggregateOutputType = {
    storageQuotaBytes: number | null
    storageUsedBytes: number | null
  }

  export type StudioSumAggregateOutputType = {
    storageQuotaBytes: bigint | null
    storageUsedBytes: bigint | null
  }

  export type StudioMinAggregateOutputType = {
    id: string | null
    name: string | null
    nameEn: string | null
    dbName: string | null
    isActive: boolean | null
    plan: string | null
    storageQuotaBytes: bigint | null
    storageUsedBytes: bigint | null
    createdAt: Date | null
    updatedAt: Date | null
  }

  export type StudioMaxAggregateOutputType = {
    id: string | null
    name: string | null
    nameEn: string | null
    dbName: string | null
    isActive: boolean | null
    plan: string | null
    storageQuotaBytes: bigint | null
    storageUsedBytes: bigint | null
    createdAt: Date | null
    updatedAt: Date | null
  }

  export type StudioCountAggregateOutputType = {
    id: number
    name: number
    nameEn: number
    dbName: number
    isActive: number
    plan: number
    storageQuotaBytes: number
    storageUsedBytes: number
    createdAt: number
    updatedAt: number
    _all: number
  }


  export type StudioAvgAggregateInputType = {
    storageQuotaBytes?: true
    storageUsedBytes?: true
  }

  export type StudioSumAggregateInputType = {
    storageQuotaBytes?: true
    storageUsedBytes?: true
  }

  export type StudioMinAggregateInputType = {
    id?: true
    name?: true
    nameEn?: true
    dbName?: true
    isActive?: true
    plan?: true
    storageQuotaBytes?: true
    storageUsedBytes?: true
    createdAt?: true
    updatedAt?: true
  }

  export type StudioMaxAggregateInputType = {
    id?: true
    name?: true
    nameEn?: true
    dbName?: true
    isActive?: true
    plan?: true
    storageQuotaBytes?: true
    storageUsedBytes?: true
    createdAt?: true
    updatedAt?: true
  }

  export type StudioCountAggregateInputType = {
    id?: true
    name?: true
    nameEn?: true
    dbName?: true
    isActive?: true
    plan?: true
    storageQuotaBytes?: true
    storageUsedBytes?: true
    createdAt?: true
    updatedAt?: true
    _all?: true
  }

  export type StudioAggregateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which Studio to aggregate.
     */
    where?: StudioWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Studios to fetch.
     */
    orderBy?: StudioOrderByWithRelationInput | StudioOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the start position
     */
    cursor?: StudioWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Studios from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Studios.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Count returned Studios
    **/
    _count?: true | StudioCountAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to average
    **/
    _avg?: StudioAvgAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to sum
    **/
    _sum?: StudioSumAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the minimum value
    **/
    _min?: StudioMinAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the maximum value
    **/
    _max?: StudioMaxAggregateInputType
  }

  export type GetStudioAggregateType<T extends StudioAggregateArgs> = {
        [P in keyof T & keyof AggregateStudio]: P extends '_count' | 'count'
      ? T[P] extends true
        ? number
        : GetScalarType<T[P], AggregateStudio[P]>
      : GetScalarType<T[P], AggregateStudio[P]>
  }




  export type StudioGroupByArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: StudioWhereInput
    orderBy?: StudioOrderByWithAggregationInput | StudioOrderByWithAggregationInput[]
    by: StudioScalarFieldEnum[] | StudioScalarFieldEnum
    having?: StudioScalarWhereWithAggregatesInput
    take?: number
    skip?: number
    _count?: StudioCountAggregateInputType | true
    _avg?: StudioAvgAggregateInputType
    _sum?: StudioSumAggregateInputType
    _min?: StudioMinAggregateInputType
    _max?: StudioMaxAggregateInputType
  }

  export type StudioGroupByOutputType = {
    id: string
    name: string
    nameEn: string | null
    dbName: string
    isActive: boolean
    plan: string
    storageQuotaBytes: bigint
    storageUsedBytes: bigint
    createdAt: Date
    updatedAt: Date
    _count: StudioCountAggregateOutputType | null
    _avg: StudioAvgAggregateOutputType | null
    _sum: StudioSumAggregateOutputType | null
    _min: StudioMinAggregateOutputType | null
    _max: StudioMaxAggregateOutputType | null
  }

  type GetStudioGroupByPayload<T extends StudioGroupByArgs> = Prisma.PrismaPromise<
    Array<
      PickEnumerable<StudioGroupByOutputType, T['by']> &
        {
          [P in ((keyof T) & (keyof StudioGroupByOutputType))]: P extends '_count'
            ? T[P] extends boolean
              ? number
              : GetScalarType<T[P], StudioGroupByOutputType[P]>
            : GetScalarType<T[P], StudioGroupByOutputType[P]>
        }
      >
    >


  export type StudioSelect<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    name?: boolean
    nameEn?: boolean
    dbName?: boolean
    isActive?: boolean
    plan?: boolean
    storageQuotaBytes?: boolean
    storageUsedBytes?: boolean
    createdAt?: boolean
    updatedAt?: boolean
    memberships?: boolean | Studio$membershipsArgs<ExtArgs>
    _count?: boolean | StudioCountOutputTypeDefaultArgs<ExtArgs>
  }, ExtArgs["result"]["studio"]>

  export type StudioSelectCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    name?: boolean
    nameEn?: boolean
    dbName?: boolean
    isActive?: boolean
    plan?: boolean
    storageQuotaBytes?: boolean
    storageUsedBytes?: boolean
    createdAt?: boolean
    updatedAt?: boolean
  }, ExtArgs["result"]["studio"]>

  export type StudioSelectUpdateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    name?: boolean
    nameEn?: boolean
    dbName?: boolean
    isActive?: boolean
    plan?: boolean
    storageQuotaBytes?: boolean
    storageUsedBytes?: boolean
    createdAt?: boolean
    updatedAt?: boolean
  }, ExtArgs["result"]["studio"]>

  export type StudioSelectScalar = {
    id?: boolean
    name?: boolean
    nameEn?: boolean
    dbName?: boolean
    isActive?: boolean
    plan?: boolean
    storageQuotaBytes?: boolean
    storageUsedBytes?: boolean
    createdAt?: boolean
    updatedAt?: boolean
  }

  export type StudioOmit<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetOmit<"id" | "name" | "nameEn" | "dbName" | "isActive" | "plan" | "storageQuotaBytes" | "storageUsedBytes" | "createdAt" | "updatedAt", ExtArgs["result"]["studio"]>
  export type StudioInclude<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    memberships?: boolean | Studio$membershipsArgs<ExtArgs>
    _count?: boolean | StudioCountOutputTypeDefaultArgs<ExtArgs>
  }
  export type StudioIncludeCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {}
  export type StudioIncludeUpdateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {}

  export type $StudioPayload<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    name: "Studio"
    objects: {
      memberships: Prisma.$StudioMembershipPayload<ExtArgs>[]
    }
    scalars: $Extensions.GetPayloadResult<{
      id: string
      name: string
      nameEn: string | null
      dbName: string
      isActive: boolean
      plan: string
      storageQuotaBytes: bigint
      storageUsedBytes: bigint
      createdAt: Date
      updatedAt: Date
    }, ExtArgs["result"]["studio"]>
    composites: {}
  }

  type StudioGetPayload<S extends boolean | null | undefined | StudioDefaultArgs> = $Result.GetResult<Prisma.$StudioPayload, S>

  type StudioCountArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> =
    Omit<StudioFindManyArgs, 'select' | 'include' | 'distinct' | 'omit'> & {
      select?: StudioCountAggregateInputType | true
    }

  export interface StudioDelegate<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> {
    [K: symbol]: { types: Prisma.TypeMap<ExtArgs>['model']['Studio'], meta: { name: 'Studio' } }
    /**
     * Find zero or one Studio that matches the filter.
     * @param {StudioFindUniqueArgs} args - Arguments to find a Studio
     * @example
     * // Get one Studio
     * const studio = await prisma.studio.findUnique({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUnique<T extends StudioFindUniqueArgs>(args: SelectSubset<T, StudioFindUniqueArgs<ExtArgs>>): Prisma__StudioClient<$Result.GetResult<Prisma.$StudioPayload<ExtArgs>, T, "findUnique", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find one Studio that matches the filter or throw an error with `error.code='P2025'`
     * if no matches were found.
     * @param {StudioFindUniqueOrThrowArgs} args - Arguments to find a Studio
     * @example
     * // Get one Studio
     * const studio = await prisma.studio.findUniqueOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUniqueOrThrow<T extends StudioFindUniqueOrThrowArgs>(args: SelectSubset<T, StudioFindUniqueOrThrowArgs<ExtArgs>>): Prisma__StudioClient<$Result.GetResult<Prisma.$StudioPayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first Studio that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {StudioFindFirstArgs} args - Arguments to find a Studio
     * @example
     * // Get one Studio
     * const studio = await prisma.studio.findFirst({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirst<T extends StudioFindFirstArgs>(args?: SelectSubset<T, StudioFindFirstArgs<ExtArgs>>): Prisma__StudioClient<$Result.GetResult<Prisma.$StudioPayload<ExtArgs>, T, "findFirst", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first Studio that matches the filter or
     * throw `PrismaKnownClientError` with `P2025` code if no matches were found.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {StudioFindFirstOrThrowArgs} args - Arguments to find a Studio
     * @example
     * // Get one Studio
     * const studio = await prisma.studio.findFirstOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirstOrThrow<T extends StudioFindFirstOrThrowArgs>(args?: SelectSubset<T, StudioFindFirstOrThrowArgs<ExtArgs>>): Prisma__StudioClient<$Result.GetResult<Prisma.$StudioPayload<ExtArgs>, T, "findFirstOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find zero or more Studios that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {StudioFindManyArgs} args - Arguments to filter and select certain fields only.
     * @example
     * // Get all Studios
     * const studios = await prisma.studio.findMany()
     * 
     * // Get first 10 Studios
     * const studios = await prisma.studio.findMany({ take: 10 })
     * 
     * // Only select the `id`
     * const studioWithIdOnly = await prisma.studio.findMany({ select: { id: true } })
     * 
     */
    findMany<T extends StudioFindManyArgs>(args?: SelectSubset<T, StudioFindManyArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$StudioPayload<ExtArgs>, T, "findMany", GlobalOmitOptions>>

    /**
     * Create a Studio.
     * @param {StudioCreateArgs} args - Arguments to create a Studio.
     * @example
     * // Create one Studio
     * const Studio = await prisma.studio.create({
     *   data: {
     *     // ... data to create a Studio
     *   }
     * })
     * 
     */
    create<T extends StudioCreateArgs>(args: SelectSubset<T, StudioCreateArgs<ExtArgs>>): Prisma__StudioClient<$Result.GetResult<Prisma.$StudioPayload<ExtArgs>, T, "create", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Create many Studios.
     * @param {StudioCreateManyArgs} args - Arguments to create many Studios.
     * @example
     * // Create many Studios
     * const studio = await prisma.studio.createMany({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     *     
     */
    createMany<T extends StudioCreateManyArgs>(args?: SelectSubset<T, StudioCreateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Create many Studios and returns the data saved in the database.
     * @param {StudioCreateManyAndReturnArgs} args - Arguments to create many Studios.
     * @example
     * // Create many Studios
     * const studio = await prisma.studio.createManyAndReturn({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Create many Studios and only return the `id`
     * const studioWithIdOnly = await prisma.studio.createManyAndReturn({
     *   select: { id: true },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    createManyAndReturn<T extends StudioCreateManyAndReturnArgs>(args?: SelectSubset<T, StudioCreateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$StudioPayload<ExtArgs>, T, "createManyAndReturn", GlobalOmitOptions>>

    /**
     * Delete a Studio.
     * @param {StudioDeleteArgs} args - Arguments to delete one Studio.
     * @example
     * // Delete one Studio
     * const Studio = await prisma.studio.delete({
     *   where: {
     *     // ... filter to delete one Studio
     *   }
     * })
     * 
     */
    delete<T extends StudioDeleteArgs>(args: SelectSubset<T, StudioDeleteArgs<ExtArgs>>): Prisma__StudioClient<$Result.GetResult<Prisma.$StudioPayload<ExtArgs>, T, "delete", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Update one Studio.
     * @param {StudioUpdateArgs} args - Arguments to update one Studio.
     * @example
     * // Update one Studio
     * const studio = await prisma.studio.update({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    update<T extends StudioUpdateArgs>(args: SelectSubset<T, StudioUpdateArgs<ExtArgs>>): Prisma__StudioClient<$Result.GetResult<Prisma.$StudioPayload<ExtArgs>, T, "update", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Delete zero or more Studios.
     * @param {StudioDeleteManyArgs} args - Arguments to filter Studios to delete.
     * @example
     * // Delete a few Studios
     * const { count } = await prisma.studio.deleteMany({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     * 
     */
    deleteMany<T extends StudioDeleteManyArgs>(args?: SelectSubset<T, StudioDeleteManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more Studios.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {StudioUpdateManyArgs} args - Arguments to update one or more rows.
     * @example
     * // Update many Studios
     * const studio = await prisma.studio.updateMany({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    updateMany<T extends StudioUpdateManyArgs>(args: SelectSubset<T, StudioUpdateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more Studios and returns the data updated in the database.
     * @param {StudioUpdateManyAndReturnArgs} args - Arguments to update many Studios.
     * @example
     * // Update many Studios
     * const studio = await prisma.studio.updateManyAndReturn({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Update zero or more Studios and only return the `id`
     * const studioWithIdOnly = await prisma.studio.updateManyAndReturn({
     *   select: { id: true },
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    updateManyAndReturn<T extends StudioUpdateManyAndReturnArgs>(args: SelectSubset<T, StudioUpdateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$StudioPayload<ExtArgs>, T, "updateManyAndReturn", GlobalOmitOptions>>

    /**
     * Create or update one Studio.
     * @param {StudioUpsertArgs} args - Arguments to update or create a Studio.
     * @example
     * // Update or create a Studio
     * const studio = await prisma.studio.upsert({
     *   create: {
     *     // ... data to create a Studio
     *   },
     *   update: {
     *     // ... in case it already exists, update
     *   },
     *   where: {
     *     // ... the filter for the Studio we want to update
     *   }
     * })
     */
    upsert<T extends StudioUpsertArgs>(args: SelectSubset<T, StudioUpsertArgs<ExtArgs>>): Prisma__StudioClient<$Result.GetResult<Prisma.$StudioPayload<ExtArgs>, T, "upsert", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>


    /**
     * Count the number of Studios.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {StudioCountArgs} args - Arguments to filter Studios to count.
     * @example
     * // Count the number of Studios
     * const count = await prisma.studio.count({
     *   where: {
     *     // ... the filter for the Studios we want to count
     *   }
     * })
    **/
    count<T extends StudioCountArgs>(
      args?: Subset<T, StudioCountArgs>,
    ): Prisma.PrismaPromise<
      T extends $Utils.Record<'select', any>
        ? T['select'] extends true
          ? number
          : GetScalarType<T['select'], StudioCountAggregateOutputType>
        : number
    >

    /**
     * Allows you to perform aggregations operations on a Studio.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {StudioAggregateArgs} args - Select which aggregations you would like to apply and on what fields.
     * @example
     * // Ordered by age ascending
     * // Where email contains prisma.io
     * // Limited to the 10 users
     * const aggregations = await prisma.user.aggregate({
     *   _avg: {
     *     age: true,
     *   },
     *   where: {
     *     email: {
     *       contains: "prisma.io",
     *     },
     *   },
     *   orderBy: {
     *     age: "asc",
     *   },
     *   take: 10,
     * })
    **/
    aggregate<T extends StudioAggregateArgs>(args: Subset<T, StudioAggregateArgs>): Prisma.PrismaPromise<GetStudioAggregateType<T>>

    /**
     * Group by Studio.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {StudioGroupByArgs} args - Group by arguments.
     * @example
     * // Group by city, order by createdAt, get count
     * const result = await prisma.user.groupBy({
     *   by: ['city', 'createdAt'],
     *   orderBy: {
     *     createdAt: true
     *   },
     *   _count: {
     *     _all: true
     *   },
     * })
     * 
    **/
    groupBy<
      T extends StudioGroupByArgs,
      HasSelectOrTake extends Or<
        Extends<'skip', Keys<T>>,
        Extends<'take', Keys<T>>
      >,
      OrderByArg extends True extends HasSelectOrTake
        ? { orderBy: StudioGroupByArgs['orderBy'] }
        : { orderBy?: StudioGroupByArgs['orderBy'] },
      OrderFields extends ExcludeUnderscoreKeys<Keys<MaybeTupleToUnion<T['orderBy']>>>,
      ByFields extends MaybeTupleToUnion<T['by']>,
      ByValid extends Has<ByFields, OrderFields>,
      HavingFields extends GetHavingFields<T['having']>,
      HavingValid extends Has<ByFields, HavingFields>,
      ByEmpty extends T['by'] extends never[] ? True : False,
      InputErrors extends ByEmpty extends True
      ? `Error: "by" must not be empty.`
      : HavingValid extends False
      ? {
          [P in HavingFields]: P extends ByFields
            ? never
            : P extends string
            ? `Error: Field "${P}" used in "having" needs to be provided in "by".`
            : [
                Error,
                'Field ',
                P,
                ` in "having" needs to be provided in "by"`,
              ]
        }[HavingFields]
      : 'take' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "take", you also need to provide "orderBy"'
      : 'skip' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "skip", you also need to provide "orderBy"'
      : ByValid extends True
      ? {}
      : {
          [P in OrderFields]: P extends ByFields
            ? never
            : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
        }[OrderFields]
    >(args: SubsetIntersection<T, StudioGroupByArgs, OrderByArg> & InputErrors): {} extends InputErrors ? GetStudioGroupByPayload<T> : Prisma.PrismaPromise<InputErrors>
  /**
   * Fields of the Studio model
   */
  readonly fields: StudioFieldRefs;
  }

  /**
   * The delegate class that acts as a "Promise-like" for Studio.
   * Why is this prefixed with `Prisma__`?
   * Because we want to prevent naming conflicts as mentioned in
   * https://github.com/prisma/prisma-client-js/issues/707
   */
  export interface Prisma__StudioClient<T, Null = never, ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> extends Prisma.PrismaPromise<T> {
    readonly [Symbol.toStringTag]: "PrismaPromise"
    memberships<T extends Studio$membershipsArgs<ExtArgs> = {}>(args?: Subset<T, Studio$membershipsArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$StudioMembershipPayload<ExtArgs>, T, "findMany", GlobalOmitOptions> | Null>
    /**
     * Attaches callbacks for the resolution and/or rejection of the Promise.
     * @param onfulfilled The callback to execute when the Promise is resolved.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of which ever callback is executed.
     */
    then<TResult1 = T, TResult2 = never>(onfulfilled?: ((value: T) => TResult1 | PromiseLike<TResult1>) | undefined | null, onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | undefined | null): $Utils.JsPromise<TResult1 | TResult2>
    /**
     * Attaches a callback for only the rejection of the Promise.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of the callback.
     */
    catch<TResult = never>(onrejected?: ((reason: any) => TResult | PromiseLike<TResult>) | undefined | null): $Utils.JsPromise<T | TResult>
    /**
     * Attaches a callback that is invoked when the Promise is settled (fulfilled or rejected). The
     * resolved value cannot be modified from the callback.
     * @param onfinally The callback to execute when the Promise is settled (fulfilled or rejected).
     * @returns A Promise for the completion of the callback.
     */
    finally(onfinally?: (() => void) | undefined | null): $Utils.JsPromise<T>
  }




  /**
   * Fields of the Studio model
   */
  interface StudioFieldRefs {
    readonly id: FieldRef<"Studio", 'String'>
    readonly name: FieldRef<"Studio", 'String'>
    readonly nameEn: FieldRef<"Studio", 'String'>
    readonly dbName: FieldRef<"Studio", 'String'>
    readonly isActive: FieldRef<"Studio", 'Boolean'>
    readonly plan: FieldRef<"Studio", 'String'>
    readonly storageQuotaBytes: FieldRef<"Studio", 'BigInt'>
    readonly storageUsedBytes: FieldRef<"Studio", 'BigInt'>
    readonly createdAt: FieldRef<"Studio", 'DateTime'>
    readonly updatedAt: FieldRef<"Studio", 'DateTime'>
  }
    

  // Custom InputTypes
  /**
   * Studio findUnique
   */
  export type StudioFindUniqueArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Studio
     */
    select?: StudioSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Studio
     */
    omit?: StudioOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: StudioInclude<ExtArgs> | null
    /**
     * Filter, which Studio to fetch.
     */
    where: StudioWhereUniqueInput
  }

  /**
   * Studio findUniqueOrThrow
   */
  export type StudioFindUniqueOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Studio
     */
    select?: StudioSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Studio
     */
    omit?: StudioOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: StudioInclude<ExtArgs> | null
    /**
     * Filter, which Studio to fetch.
     */
    where: StudioWhereUniqueInput
  }

  /**
   * Studio findFirst
   */
  export type StudioFindFirstArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Studio
     */
    select?: StudioSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Studio
     */
    omit?: StudioOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: StudioInclude<ExtArgs> | null
    /**
     * Filter, which Studio to fetch.
     */
    where?: StudioWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Studios to fetch.
     */
    orderBy?: StudioOrderByWithRelationInput | StudioOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for Studios.
     */
    cursor?: StudioWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Studios from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Studios.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of Studios.
     */
    distinct?: StudioScalarFieldEnum | StudioScalarFieldEnum[]
  }

  /**
   * Studio findFirstOrThrow
   */
  export type StudioFindFirstOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Studio
     */
    select?: StudioSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Studio
     */
    omit?: StudioOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: StudioInclude<ExtArgs> | null
    /**
     * Filter, which Studio to fetch.
     */
    where?: StudioWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Studios to fetch.
     */
    orderBy?: StudioOrderByWithRelationInput | StudioOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for Studios.
     */
    cursor?: StudioWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Studios from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Studios.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of Studios.
     */
    distinct?: StudioScalarFieldEnum | StudioScalarFieldEnum[]
  }

  /**
   * Studio findMany
   */
  export type StudioFindManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Studio
     */
    select?: StudioSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Studio
     */
    omit?: StudioOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: StudioInclude<ExtArgs> | null
    /**
     * Filter, which Studios to fetch.
     */
    where?: StudioWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Studios to fetch.
     */
    orderBy?: StudioOrderByWithRelationInput | StudioOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for listing Studios.
     */
    cursor?: StudioWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Studios from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Studios.
     */
    skip?: number
    distinct?: StudioScalarFieldEnum | StudioScalarFieldEnum[]
  }

  /**
   * Studio create
   */
  export type StudioCreateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Studio
     */
    select?: StudioSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Studio
     */
    omit?: StudioOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: StudioInclude<ExtArgs> | null
    /**
     * The data needed to create a Studio.
     */
    data: XOR<StudioCreateInput, StudioUncheckedCreateInput>
  }

  /**
   * Studio createMany
   */
  export type StudioCreateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to create many Studios.
     */
    data: StudioCreateManyInput | StudioCreateManyInput[]
  }

  /**
   * Studio createManyAndReturn
   */
  export type StudioCreateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Studio
     */
    select?: StudioSelectCreateManyAndReturn<ExtArgs> | null
    /**
     * Omit specific fields from the Studio
     */
    omit?: StudioOmit<ExtArgs> | null
    /**
     * The data used to create many Studios.
     */
    data: StudioCreateManyInput | StudioCreateManyInput[]
  }

  /**
   * Studio update
   */
  export type StudioUpdateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Studio
     */
    select?: StudioSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Studio
     */
    omit?: StudioOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: StudioInclude<ExtArgs> | null
    /**
     * The data needed to update a Studio.
     */
    data: XOR<StudioUpdateInput, StudioUncheckedUpdateInput>
    /**
     * Choose, which Studio to update.
     */
    where: StudioWhereUniqueInput
  }

  /**
   * Studio updateMany
   */
  export type StudioUpdateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to update Studios.
     */
    data: XOR<StudioUpdateManyMutationInput, StudioUncheckedUpdateManyInput>
    /**
     * Filter which Studios to update
     */
    where?: StudioWhereInput
    /**
     * Limit how many Studios to update.
     */
    limit?: number
  }

  /**
   * Studio updateManyAndReturn
   */
  export type StudioUpdateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Studio
     */
    select?: StudioSelectUpdateManyAndReturn<ExtArgs> | null
    /**
     * Omit specific fields from the Studio
     */
    omit?: StudioOmit<ExtArgs> | null
    /**
     * The data used to update Studios.
     */
    data: XOR<StudioUpdateManyMutationInput, StudioUncheckedUpdateManyInput>
    /**
     * Filter which Studios to update
     */
    where?: StudioWhereInput
    /**
     * Limit how many Studios to update.
     */
    limit?: number
  }

  /**
   * Studio upsert
   */
  export type StudioUpsertArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Studio
     */
    select?: StudioSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Studio
     */
    omit?: StudioOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: StudioInclude<ExtArgs> | null
    /**
     * The filter to search for the Studio to update in case it exists.
     */
    where: StudioWhereUniqueInput
    /**
     * In case the Studio found by the `where` argument doesn't exist, create a new Studio with this data.
     */
    create: XOR<StudioCreateInput, StudioUncheckedCreateInput>
    /**
     * In case the Studio was found with the provided `where` argument, update it with this data.
     */
    update: XOR<StudioUpdateInput, StudioUncheckedUpdateInput>
  }

  /**
   * Studio delete
   */
  export type StudioDeleteArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Studio
     */
    select?: StudioSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Studio
     */
    omit?: StudioOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: StudioInclude<ExtArgs> | null
    /**
     * Filter which Studio to delete.
     */
    where: StudioWhereUniqueInput
  }

  /**
   * Studio deleteMany
   */
  export type StudioDeleteManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which Studios to delete
     */
    where?: StudioWhereInput
    /**
     * Limit how many Studios to delete.
     */
    limit?: number
  }

  /**
   * Studio.memberships
   */
  export type Studio$membershipsArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the StudioMembership
     */
    select?: StudioMembershipSelect<ExtArgs> | null
    /**
     * Omit specific fields from the StudioMembership
     */
    omit?: StudioMembershipOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: StudioMembershipInclude<ExtArgs> | null
    where?: StudioMembershipWhereInput
    orderBy?: StudioMembershipOrderByWithRelationInput | StudioMembershipOrderByWithRelationInput[]
    cursor?: StudioMembershipWhereUniqueInput
    take?: number
    skip?: number
    distinct?: StudioMembershipScalarFieldEnum | StudioMembershipScalarFieldEnum[]
  }

  /**
   * Studio without action
   */
  export type StudioDefaultArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Studio
     */
    select?: StudioSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Studio
     */
    omit?: StudioOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: StudioInclude<ExtArgs> | null
  }


  /**
   * Model MasterUser
   */

  export type AggregateMasterUser = {
    _count: MasterUserCountAggregateOutputType | null
    _min: MasterUserMinAggregateOutputType | null
    _max: MasterUserMaxAggregateOutputType | null
  }

  export type MasterUserMinAggregateOutputType = {
    id: string | null
    phone: string | null
    passwordHash: string | null
    name: string | null
    createdAt: Date | null
    updatedAt: Date | null
  }

  export type MasterUserMaxAggregateOutputType = {
    id: string | null
    phone: string | null
    passwordHash: string | null
    name: string | null
    createdAt: Date | null
    updatedAt: Date | null
  }

  export type MasterUserCountAggregateOutputType = {
    id: number
    phone: number
    passwordHash: number
    name: number
    createdAt: number
    updatedAt: number
    _all: number
  }


  export type MasterUserMinAggregateInputType = {
    id?: true
    phone?: true
    passwordHash?: true
    name?: true
    createdAt?: true
    updatedAt?: true
  }

  export type MasterUserMaxAggregateInputType = {
    id?: true
    phone?: true
    passwordHash?: true
    name?: true
    createdAt?: true
    updatedAt?: true
  }

  export type MasterUserCountAggregateInputType = {
    id?: true
    phone?: true
    passwordHash?: true
    name?: true
    createdAt?: true
    updatedAt?: true
    _all?: true
  }

  export type MasterUserAggregateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which MasterUser to aggregate.
     */
    where?: MasterUserWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of MasterUsers to fetch.
     */
    orderBy?: MasterUserOrderByWithRelationInput | MasterUserOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the start position
     */
    cursor?: MasterUserWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` MasterUsers from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` MasterUsers.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Count returned MasterUsers
    **/
    _count?: true | MasterUserCountAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the minimum value
    **/
    _min?: MasterUserMinAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the maximum value
    **/
    _max?: MasterUserMaxAggregateInputType
  }

  export type GetMasterUserAggregateType<T extends MasterUserAggregateArgs> = {
        [P in keyof T & keyof AggregateMasterUser]: P extends '_count' | 'count'
      ? T[P] extends true
        ? number
        : GetScalarType<T[P], AggregateMasterUser[P]>
      : GetScalarType<T[P], AggregateMasterUser[P]>
  }




  export type MasterUserGroupByArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: MasterUserWhereInput
    orderBy?: MasterUserOrderByWithAggregationInput | MasterUserOrderByWithAggregationInput[]
    by: MasterUserScalarFieldEnum[] | MasterUserScalarFieldEnum
    having?: MasterUserScalarWhereWithAggregatesInput
    take?: number
    skip?: number
    _count?: MasterUserCountAggregateInputType | true
    _min?: MasterUserMinAggregateInputType
    _max?: MasterUserMaxAggregateInputType
  }

  export type MasterUserGroupByOutputType = {
    id: string
    phone: string
    passwordHash: string | null
    name: string
    createdAt: Date
    updatedAt: Date
    _count: MasterUserCountAggregateOutputType | null
    _min: MasterUserMinAggregateOutputType | null
    _max: MasterUserMaxAggregateOutputType | null
  }

  type GetMasterUserGroupByPayload<T extends MasterUserGroupByArgs> = Prisma.PrismaPromise<
    Array<
      PickEnumerable<MasterUserGroupByOutputType, T['by']> &
        {
          [P in ((keyof T) & (keyof MasterUserGroupByOutputType))]: P extends '_count'
            ? T[P] extends boolean
              ? number
              : GetScalarType<T[P], MasterUserGroupByOutputType[P]>
            : GetScalarType<T[P], MasterUserGroupByOutputType[P]>
        }
      >
    >


  export type MasterUserSelect<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    phone?: boolean
    passwordHash?: boolean
    name?: boolean
    createdAt?: boolean
    updatedAt?: boolean
    memberships?: boolean | MasterUser$membershipsArgs<ExtArgs>
    sessions?: boolean | MasterUser$sessionsArgs<ExtArgs>
    _count?: boolean | MasterUserCountOutputTypeDefaultArgs<ExtArgs>
  }, ExtArgs["result"]["masterUser"]>

  export type MasterUserSelectCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    phone?: boolean
    passwordHash?: boolean
    name?: boolean
    createdAt?: boolean
    updatedAt?: boolean
  }, ExtArgs["result"]["masterUser"]>

  export type MasterUserSelectUpdateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    phone?: boolean
    passwordHash?: boolean
    name?: boolean
    createdAt?: boolean
    updatedAt?: boolean
  }, ExtArgs["result"]["masterUser"]>

  export type MasterUserSelectScalar = {
    id?: boolean
    phone?: boolean
    passwordHash?: boolean
    name?: boolean
    createdAt?: boolean
    updatedAt?: boolean
  }

  export type MasterUserOmit<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetOmit<"id" | "phone" | "passwordHash" | "name" | "createdAt" | "updatedAt", ExtArgs["result"]["masterUser"]>
  export type MasterUserInclude<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    memberships?: boolean | MasterUser$membershipsArgs<ExtArgs>
    sessions?: boolean | MasterUser$sessionsArgs<ExtArgs>
    _count?: boolean | MasterUserCountOutputTypeDefaultArgs<ExtArgs>
  }
  export type MasterUserIncludeCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {}
  export type MasterUserIncludeUpdateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {}

  export type $MasterUserPayload<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    name: "MasterUser"
    objects: {
      memberships: Prisma.$StudioMembershipPayload<ExtArgs>[]
      sessions: Prisma.$SessionPayload<ExtArgs>[]
    }
    scalars: $Extensions.GetPayloadResult<{
      id: string
      phone: string
      passwordHash: string | null
      name: string
      createdAt: Date
      updatedAt: Date
    }, ExtArgs["result"]["masterUser"]>
    composites: {}
  }

  type MasterUserGetPayload<S extends boolean | null | undefined | MasterUserDefaultArgs> = $Result.GetResult<Prisma.$MasterUserPayload, S>

  type MasterUserCountArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> =
    Omit<MasterUserFindManyArgs, 'select' | 'include' | 'distinct' | 'omit'> & {
      select?: MasterUserCountAggregateInputType | true
    }

  export interface MasterUserDelegate<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> {
    [K: symbol]: { types: Prisma.TypeMap<ExtArgs>['model']['MasterUser'], meta: { name: 'MasterUser' } }
    /**
     * Find zero or one MasterUser that matches the filter.
     * @param {MasterUserFindUniqueArgs} args - Arguments to find a MasterUser
     * @example
     * // Get one MasterUser
     * const masterUser = await prisma.masterUser.findUnique({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUnique<T extends MasterUserFindUniqueArgs>(args: SelectSubset<T, MasterUserFindUniqueArgs<ExtArgs>>): Prisma__MasterUserClient<$Result.GetResult<Prisma.$MasterUserPayload<ExtArgs>, T, "findUnique", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find one MasterUser that matches the filter or throw an error with `error.code='P2025'`
     * if no matches were found.
     * @param {MasterUserFindUniqueOrThrowArgs} args - Arguments to find a MasterUser
     * @example
     * // Get one MasterUser
     * const masterUser = await prisma.masterUser.findUniqueOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUniqueOrThrow<T extends MasterUserFindUniqueOrThrowArgs>(args: SelectSubset<T, MasterUserFindUniqueOrThrowArgs<ExtArgs>>): Prisma__MasterUserClient<$Result.GetResult<Prisma.$MasterUserPayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first MasterUser that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {MasterUserFindFirstArgs} args - Arguments to find a MasterUser
     * @example
     * // Get one MasterUser
     * const masterUser = await prisma.masterUser.findFirst({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirst<T extends MasterUserFindFirstArgs>(args?: SelectSubset<T, MasterUserFindFirstArgs<ExtArgs>>): Prisma__MasterUserClient<$Result.GetResult<Prisma.$MasterUserPayload<ExtArgs>, T, "findFirst", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first MasterUser that matches the filter or
     * throw `PrismaKnownClientError` with `P2025` code if no matches were found.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {MasterUserFindFirstOrThrowArgs} args - Arguments to find a MasterUser
     * @example
     * // Get one MasterUser
     * const masterUser = await prisma.masterUser.findFirstOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirstOrThrow<T extends MasterUserFindFirstOrThrowArgs>(args?: SelectSubset<T, MasterUserFindFirstOrThrowArgs<ExtArgs>>): Prisma__MasterUserClient<$Result.GetResult<Prisma.$MasterUserPayload<ExtArgs>, T, "findFirstOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find zero or more MasterUsers that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {MasterUserFindManyArgs} args - Arguments to filter and select certain fields only.
     * @example
     * // Get all MasterUsers
     * const masterUsers = await prisma.masterUser.findMany()
     * 
     * // Get first 10 MasterUsers
     * const masterUsers = await prisma.masterUser.findMany({ take: 10 })
     * 
     * // Only select the `id`
     * const masterUserWithIdOnly = await prisma.masterUser.findMany({ select: { id: true } })
     * 
     */
    findMany<T extends MasterUserFindManyArgs>(args?: SelectSubset<T, MasterUserFindManyArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$MasterUserPayload<ExtArgs>, T, "findMany", GlobalOmitOptions>>

    /**
     * Create a MasterUser.
     * @param {MasterUserCreateArgs} args - Arguments to create a MasterUser.
     * @example
     * // Create one MasterUser
     * const MasterUser = await prisma.masterUser.create({
     *   data: {
     *     // ... data to create a MasterUser
     *   }
     * })
     * 
     */
    create<T extends MasterUserCreateArgs>(args: SelectSubset<T, MasterUserCreateArgs<ExtArgs>>): Prisma__MasterUserClient<$Result.GetResult<Prisma.$MasterUserPayload<ExtArgs>, T, "create", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Create many MasterUsers.
     * @param {MasterUserCreateManyArgs} args - Arguments to create many MasterUsers.
     * @example
     * // Create many MasterUsers
     * const masterUser = await prisma.masterUser.createMany({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     *     
     */
    createMany<T extends MasterUserCreateManyArgs>(args?: SelectSubset<T, MasterUserCreateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Create many MasterUsers and returns the data saved in the database.
     * @param {MasterUserCreateManyAndReturnArgs} args - Arguments to create many MasterUsers.
     * @example
     * // Create many MasterUsers
     * const masterUser = await prisma.masterUser.createManyAndReturn({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Create many MasterUsers and only return the `id`
     * const masterUserWithIdOnly = await prisma.masterUser.createManyAndReturn({
     *   select: { id: true },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    createManyAndReturn<T extends MasterUserCreateManyAndReturnArgs>(args?: SelectSubset<T, MasterUserCreateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$MasterUserPayload<ExtArgs>, T, "createManyAndReturn", GlobalOmitOptions>>

    /**
     * Delete a MasterUser.
     * @param {MasterUserDeleteArgs} args - Arguments to delete one MasterUser.
     * @example
     * // Delete one MasterUser
     * const MasterUser = await prisma.masterUser.delete({
     *   where: {
     *     // ... filter to delete one MasterUser
     *   }
     * })
     * 
     */
    delete<T extends MasterUserDeleteArgs>(args: SelectSubset<T, MasterUserDeleteArgs<ExtArgs>>): Prisma__MasterUserClient<$Result.GetResult<Prisma.$MasterUserPayload<ExtArgs>, T, "delete", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Update one MasterUser.
     * @param {MasterUserUpdateArgs} args - Arguments to update one MasterUser.
     * @example
     * // Update one MasterUser
     * const masterUser = await prisma.masterUser.update({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    update<T extends MasterUserUpdateArgs>(args: SelectSubset<T, MasterUserUpdateArgs<ExtArgs>>): Prisma__MasterUserClient<$Result.GetResult<Prisma.$MasterUserPayload<ExtArgs>, T, "update", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Delete zero or more MasterUsers.
     * @param {MasterUserDeleteManyArgs} args - Arguments to filter MasterUsers to delete.
     * @example
     * // Delete a few MasterUsers
     * const { count } = await prisma.masterUser.deleteMany({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     * 
     */
    deleteMany<T extends MasterUserDeleteManyArgs>(args?: SelectSubset<T, MasterUserDeleteManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more MasterUsers.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {MasterUserUpdateManyArgs} args - Arguments to update one or more rows.
     * @example
     * // Update many MasterUsers
     * const masterUser = await prisma.masterUser.updateMany({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    updateMany<T extends MasterUserUpdateManyArgs>(args: SelectSubset<T, MasterUserUpdateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more MasterUsers and returns the data updated in the database.
     * @param {MasterUserUpdateManyAndReturnArgs} args - Arguments to update many MasterUsers.
     * @example
     * // Update many MasterUsers
     * const masterUser = await prisma.masterUser.updateManyAndReturn({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Update zero or more MasterUsers and only return the `id`
     * const masterUserWithIdOnly = await prisma.masterUser.updateManyAndReturn({
     *   select: { id: true },
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    updateManyAndReturn<T extends MasterUserUpdateManyAndReturnArgs>(args: SelectSubset<T, MasterUserUpdateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$MasterUserPayload<ExtArgs>, T, "updateManyAndReturn", GlobalOmitOptions>>

    /**
     * Create or update one MasterUser.
     * @param {MasterUserUpsertArgs} args - Arguments to update or create a MasterUser.
     * @example
     * // Update or create a MasterUser
     * const masterUser = await prisma.masterUser.upsert({
     *   create: {
     *     // ... data to create a MasterUser
     *   },
     *   update: {
     *     // ... in case it already exists, update
     *   },
     *   where: {
     *     // ... the filter for the MasterUser we want to update
     *   }
     * })
     */
    upsert<T extends MasterUserUpsertArgs>(args: SelectSubset<T, MasterUserUpsertArgs<ExtArgs>>): Prisma__MasterUserClient<$Result.GetResult<Prisma.$MasterUserPayload<ExtArgs>, T, "upsert", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>


    /**
     * Count the number of MasterUsers.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {MasterUserCountArgs} args - Arguments to filter MasterUsers to count.
     * @example
     * // Count the number of MasterUsers
     * const count = await prisma.masterUser.count({
     *   where: {
     *     // ... the filter for the MasterUsers we want to count
     *   }
     * })
    **/
    count<T extends MasterUserCountArgs>(
      args?: Subset<T, MasterUserCountArgs>,
    ): Prisma.PrismaPromise<
      T extends $Utils.Record<'select', any>
        ? T['select'] extends true
          ? number
          : GetScalarType<T['select'], MasterUserCountAggregateOutputType>
        : number
    >

    /**
     * Allows you to perform aggregations operations on a MasterUser.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {MasterUserAggregateArgs} args - Select which aggregations you would like to apply and on what fields.
     * @example
     * // Ordered by age ascending
     * // Where email contains prisma.io
     * // Limited to the 10 users
     * const aggregations = await prisma.user.aggregate({
     *   _avg: {
     *     age: true,
     *   },
     *   where: {
     *     email: {
     *       contains: "prisma.io",
     *     },
     *   },
     *   orderBy: {
     *     age: "asc",
     *   },
     *   take: 10,
     * })
    **/
    aggregate<T extends MasterUserAggregateArgs>(args: Subset<T, MasterUserAggregateArgs>): Prisma.PrismaPromise<GetMasterUserAggregateType<T>>

    /**
     * Group by MasterUser.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {MasterUserGroupByArgs} args - Group by arguments.
     * @example
     * // Group by city, order by createdAt, get count
     * const result = await prisma.user.groupBy({
     *   by: ['city', 'createdAt'],
     *   orderBy: {
     *     createdAt: true
     *   },
     *   _count: {
     *     _all: true
     *   },
     * })
     * 
    **/
    groupBy<
      T extends MasterUserGroupByArgs,
      HasSelectOrTake extends Or<
        Extends<'skip', Keys<T>>,
        Extends<'take', Keys<T>>
      >,
      OrderByArg extends True extends HasSelectOrTake
        ? { orderBy: MasterUserGroupByArgs['orderBy'] }
        : { orderBy?: MasterUserGroupByArgs['orderBy'] },
      OrderFields extends ExcludeUnderscoreKeys<Keys<MaybeTupleToUnion<T['orderBy']>>>,
      ByFields extends MaybeTupleToUnion<T['by']>,
      ByValid extends Has<ByFields, OrderFields>,
      HavingFields extends GetHavingFields<T['having']>,
      HavingValid extends Has<ByFields, HavingFields>,
      ByEmpty extends T['by'] extends never[] ? True : False,
      InputErrors extends ByEmpty extends True
      ? `Error: "by" must not be empty.`
      : HavingValid extends False
      ? {
          [P in HavingFields]: P extends ByFields
            ? never
            : P extends string
            ? `Error: Field "${P}" used in "having" needs to be provided in "by".`
            : [
                Error,
                'Field ',
                P,
                ` in "having" needs to be provided in "by"`,
              ]
        }[HavingFields]
      : 'take' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "take", you also need to provide "orderBy"'
      : 'skip' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "skip", you also need to provide "orderBy"'
      : ByValid extends True
      ? {}
      : {
          [P in OrderFields]: P extends ByFields
            ? never
            : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
        }[OrderFields]
    >(args: SubsetIntersection<T, MasterUserGroupByArgs, OrderByArg> & InputErrors): {} extends InputErrors ? GetMasterUserGroupByPayload<T> : Prisma.PrismaPromise<InputErrors>
  /**
   * Fields of the MasterUser model
   */
  readonly fields: MasterUserFieldRefs;
  }

  /**
   * The delegate class that acts as a "Promise-like" for MasterUser.
   * Why is this prefixed with `Prisma__`?
   * Because we want to prevent naming conflicts as mentioned in
   * https://github.com/prisma/prisma-client-js/issues/707
   */
  export interface Prisma__MasterUserClient<T, Null = never, ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> extends Prisma.PrismaPromise<T> {
    readonly [Symbol.toStringTag]: "PrismaPromise"
    memberships<T extends MasterUser$membershipsArgs<ExtArgs> = {}>(args?: Subset<T, MasterUser$membershipsArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$StudioMembershipPayload<ExtArgs>, T, "findMany", GlobalOmitOptions> | Null>
    sessions<T extends MasterUser$sessionsArgs<ExtArgs> = {}>(args?: Subset<T, MasterUser$sessionsArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$SessionPayload<ExtArgs>, T, "findMany", GlobalOmitOptions> | Null>
    /**
     * Attaches callbacks for the resolution and/or rejection of the Promise.
     * @param onfulfilled The callback to execute when the Promise is resolved.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of which ever callback is executed.
     */
    then<TResult1 = T, TResult2 = never>(onfulfilled?: ((value: T) => TResult1 | PromiseLike<TResult1>) | undefined | null, onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | undefined | null): $Utils.JsPromise<TResult1 | TResult2>
    /**
     * Attaches a callback for only the rejection of the Promise.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of the callback.
     */
    catch<TResult = never>(onrejected?: ((reason: any) => TResult | PromiseLike<TResult>) | undefined | null): $Utils.JsPromise<T | TResult>
    /**
     * Attaches a callback that is invoked when the Promise is settled (fulfilled or rejected). The
     * resolved value cannot be modified from the callback.
     * @param onfinally The callback to execute when the Promise is settled (fulfilled or rejected).
     * @returns A Promise for the completion of the callback.
     */
    finally(onfinally?: (() => void) | undefined | null): $Utils.JsPromise<T>
  }




  /**
   * Fields of the MasterUser model
   */
  interface MasterUserFieldRefs {
    readonly id: FieldRef<"MasterUser", 'String'>
    readonly phone: FieldRef<"MasterUser", 'String'>
    readonly passwordHash: FieldRef<"MasterUser", 'String'>
    readonly name: FieldRef<"MasterUser", 'String'>
    readonly createdAt: FieldRef<"MasterUser", 'DateTime'>
    readonly updatedAt: FieldRef<"MasterUser", 'DateTime'>
  }
    

  // Custom InputTypes
  /**
   * MasterUser findUnique
   */
  export type MasterUserFindUniqueArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the MasterUser
     */
    select?: MasterUserSelect<ExtArgs> | null
    /**
     * Omit specific fields from the MasterUser
     */
    omit?: MasterUserOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: MasterUserInclude<ExtArgs> | null
    /**
     * Filter, which MasterUser to fetch.
     */
    where: MasterUserWhereUniqueInput
  }

  /**
   * MasterUser findUniqueOrThrow
   */
  export type MasterUserFindUniqueOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the MasterUser
     */
    select?: MasterUserSelect<ExtArgs> | null
    /**
     * Omit specific fields from the MasterUser
     */
    omit?: MasterUserOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: MasterUserInclude<ExtArgs> | null
    /**
     * Filter, which MasterUser to fetch.
     */
    where: MasterUserWhereUniqueInput
  }

  /**
   * MasterUser findFirst
   */
  export type MasterUserFindFirstArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the MasterUser
     */
    select?: MasterUserSelect<ExtArgs> | null
    /**
     * Omit specific fields from the MasterUser
     */
    omit?: MasterUserOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: MasterUserInclude<ExtArgs> | null
    /**
     * Filter, which MasterUser to fetch.
     */
    where?: MasterUserWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of MasterUsers to fetch.
     */
    orderBy?: MasterUserOrderByWithRelationInput | MasterUserOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for MasterUsers.
     */
    cursor?: MasterUserWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` MasterUsers from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` MasterUsers.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of MasterUsers.
     */
    distinct?: MasterUserScalarFieldEnum | MasterUserScalarFieldEnum[]
  }

  /**
   * MasterUser findFirstOrThrow
   */
  export type MasterUserFindFirstOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the MasterUser
     */
    select?: MasterUserSelect<ExtArgs> | null
    /**
     * Omit specific fields from the MasterUser
     */
    omit?: MasterUserOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: MasterUserInclude<ExtArgs> | null
    /**
     * Filter, which MasterUser to fetch.
     */
    where?: MasterUserWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of MasterUsers to fetch.
     */
    orderBy?: MasterUserOrderByWithRelationInput | MasterUserOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for MasterUsers.
     */
    cursor?: MasterUserWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` MasterUsers from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` MasterUsers.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of MasterUsers.
     */
    distinct?: MasterUserScalarFieldEnum | MasterUserScalarFieldEnum[]
  }

  /**
   * MasterUser findMany
   */
  export type MasterUserFindManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the MasterUser
     */
    select?: MasterUserSelect<ExtArgs> | null
    /**
     * Omit specific fields from the MasterUser
     */
    omit?: MasterUserOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: MasterUserInclude<ExtArgs> | null
    /**
     * Filter, which MasterUsers to fetch.
     */
    where?: MasterUserWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of MasterUsers to fetch.
     */
    orderBy?: MasterUserOrderByWithRelationInput | MasterUserOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for listing MasterUsers.
     */
    cursor?: MasterUserWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` MasterUsers from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` MasterUsers.
     */
    skip?: number
    distinct?: MasterUserScalarFieldEnum | MasterUserScalarFieldEnum[]
  }

  /**
   * MasterUser create
   */
  export type MasterUserCreateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the MasterUser
     */
    select?: MasterUserSelect<ExtArgs> | null
    /**
     * Omit specific fields from the MasterUser
     */
    omit?: MasterUserOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: MasterUserInclude<ExtArgs> | null
    /**
     * The data needed to create a MasterUser.
     */
    data: XOR<MasterUserCreateInput, MasterUserUncheckedCreateInput>
  }

  /**
   * MasterUser createMany
   */
  export type MasterUserCreateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to create many MasterUsers.
     */
    data: MasterUserCreateManyInput | MasterUserCreateManyInput[]
  }

  /**
   * MasterUser createManyAndReturn
   */
  export type MasterUserCreateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the MasterUser
     */
    select?: MasterUserSelectCreateManyAndReturn<ExtArgs> | null
    /**
     * Omit specific fields from the MasterUser
     */
    omit?: MasterUserOmit<ExtArgs> | null
    /**
     * The data used to create many MasterUsers.
     */
    data: MasterUserCreateManyInput | MasterUserCreateManyInput[]
  }

  /**
   * MasterUser update
   */
  export type MasterUserUpdateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the MasterUser
     */
    select?: MasterUserSelect<ExtArgs> | null
    /**
     * Omit specific fields from the MasterUser
     */
    omit?: MasterUserOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: MasterUserInclude<ExtArgs> | null
    /**
     * The data needed to update a MasterUser.
     */
    data: XOR<MasterUserUpdateInput, MasterUserUncheckedUpdateInput>
    /**
     * Choose, which MasterUser to update.
     */
    where: MasterUserWhereUniqueInput
  }

  /**
   * MasterUser updateMany
   */
  export type MasterUserUpdateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to update MasterUsers.
     */
    data: XOR<MasterUserUpdateManyMutationInput, MasterUserUncheckedUpdateManyInput>
    /**
     * Filter which MasterUsers to update
     */
    where?: MasterUserWhereInput
    /**
     * Limit how many MasterUsers to update.
     */
    limit?: number
  }

  /**
   * MasterUser updateManyAndReturn
   */
  export type MasterUserUpdateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the MasterUser
     */
    select?: MasterUserSelectUpdateManyAndReturn<ExtArgs> | null
    /**
     * Omit specific fields from the MasterUser
     */
    omit?: MasterUserOmit<ExtArgs> | null
    /**
     * The data used to update MasterUsers.
     */
    data: XOR<MasterUserUpdateManyMutationInput, MasterUserUncheckedUpdateManyInput>
    /**
     * Filter which MasterUsers to update
     */
    where?: MasterUserWhereInput
    /**
     * Limit how many MasterUsers to update.
     */
    limit?: number
  }

  /**
   * MasterUser upsert
   */
  export type MasterUserUpsertArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the MasterUser
     */
    select?: MasterUserSelect<ExtArgs> | null
    /**
     * Omit specific fields from the MasterUser
     */
    omit?: MasterUserOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: MasterUserInclude<ExtArgs> | null
    /**
     * The filter to search for the MasterUser to update in case it exists.
     */
    where: MasterUserWhereUniqueInput
    /**
     * In case the MasterUser found by the `where` argument doesn't exist, create a new MasterUser with this data.
     */
    create: XOR<MasterUserCreateInput, MasterUserUncheckedCreateInput>
    /**
     * In case the MasterUser was found with the provided `where` argument, update it with this data.
     */
    update: XOR<MasterUserUpdateInput, MasterUserUncheckedUpdateInput>
  }

  /**
   * MasterUser delete
   */
  export type MasterUserDeleteArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the MasterUser
     */
    select?: MasterUserSelect<ExtArgs> | null
    /**
     * Omit specific fields from the MasterUser
     */
    omit?: MasterUserOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: MasterUserInclude<ExtArgs> | null
    /**
     * Filter which MasterUser to delete.
     */
    where: MasterUserWhereUniqueInput
  }

  /**
   * MasterUser deleteMany
   */
  export type MasterUserDeleteManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which MasterUsers to delete
     */
    where?: MasterUserWhereInput
    /**
     * Limit how many MasterUsers to delete.
     */
    limit?: number
  }

  /**
   * MasterUser.memberships
   */
  export type MasterUser$membershipsArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the StudioMembership
     */
    select?: StudioMembershipSelect<ExtArgs> | null
    /**
     * Omit specific fields from the StudioMembership
     */
    omit?: StudioMembershipOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: StudioMembershipInclude<ExtArgs> | null
    where?: StudioMembershipWhereInput
    orderBy?: StudioMembershipOrderByWithRelationInput | StudioMembershipOrderByWithRelationInput[]
    cursor?: StudioMembershipWhereUniqueInput
    take?: number
    skip?: number
    distinct?: StudioMembershipScalarFieldEnum | StudioMembershipScalarFieldEnum[]
  }

  /**
   * MasterUser.sessions
   */
  export type MasterUser$sessionsArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Session
     */
    select?: SessionSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Session
     */
    omit?: SessionOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: SessionInclude<ExtArgs> | null
    where?: SessionWhereInput
    orderBy?: SessionOrderByWithRelationInput | SessionOrderByWithRelationInput[]
    cursor?: SessionWhereUniqueInput
    take?: number
    skip?: number
    distinct?: SessionScalarFieldEnum | SessionScalarFieldEnum[]
  }

  /**
   * MasterUser without action
   */
  export type MasterUserDefaultArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the MasterUser
     */
    select?: MasterUserSelect<ExtArgs> | null
    /**
     * Omit specific fields from the MasterUser
     */
    omit?: MasterUserOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: MasterUserInclude<ExtArgs> | null
  }


  /**
   * Model StudioMembership
   */

  export type AggregateStudioMembership = {
    _count: StudioMembershipCountAggregateOutputType | null
    _min: StudioMembershipMinAggregateOutputType | null
    _max: StudioMembershipMaxAggregateOutputType | null
  }

  export type StudioMembershipMinAggregateOutputType = {
    id: string | null
    userId: string | null
    studioId: string | null
    role: string | null
    isActive: boolean | null
    createdAt: Date | null
  }

  export type StudioMembershipMaxAggregateOutputType = {
    id: string | null
    userId: string | null
    studioId: string | null
    role: string | null
    isActive: boolean | null
    createdAt: Date | null
  }

  export type StudioMembershipCountAggregateOutputType = {
    id: number
    userId: number
    studioId: number
    role: number
    isActive: number
    createdAt: number
    _all: number
  }


  export type StudioMembershipMinAggregateInputType = {
    id?: true
    userId?: true
    studioId?: true
    role?: true
    isActive?: true
    createdAt?: true
  }

  export type StudioMembershipMaxAggregateInputType = {
    id?: true
    userId?: true
    studioId?: true
    role?: true
    isActive?: true
    createdAt?: true
  }

  export type StudioMembershipCountAggregateInputType = {
    id?: true
    userId?: true
    studioId?: true
    role?: true
    isActive?: true
    createdAt?: true
    _all?: true
  }

  export type StudioMembershipAggregateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which StudioMembership to aggregate.
     */
    where?: StudioMembershipWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of StudioMemberships to fetch.
     */
    orderBy?: StudioMembershipOrderByWithRelationInput | StudioMembershipOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the start position
     */
    cursor?: StudioMembershipWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` StudioMemberships from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` StudioMemberships.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Count returned StudioMemberships
    **/
    _count?: true | StudioMembershipCountAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the minimum value
    **/
    _min?: StudioMembershipMinAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the maximum value
    **/
    _max?: StudioMembershipMaxAggregateInputType
  }

  export type GetStudioMembershipAggregateType<T extends StudioMembershipAggregateArgs> = {
        [P in keyof T & keyof AggregateStudioMembership]: P extends '_count' | 'count'
      ? T[P] extends true
        ? number
        : GetScalarType<T[P], AggregateStudioMembership[P]>
      : GetScalarType<T[P], AggregateStudioMembership[P]>
  }




  export type StudioMembershipGroupByArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: StudioMembershipWhereInput
    orderBy?: StudioMembershipOrderByWithAggregationInput | StudioMembershipOrderByWithAggregationInput[]
    by: StudioMembershipScalarFieldEnum[] | StudioMembershipScalarFieldEnum
    having?: StudioMembershipScalarWhereWithAggregatesInput
    take?: number
    skip?: number
    _count?: StudioMembershipCountAggregateInputType | true
    _min?: StudioMembershipMinAggregateInputType
    _max?: StudioMembershipMaxAggregateInputType
  }

  export type StudioMembershipGroupByOutputType = {
    id: string
    userId: string
    studioId: string
    role: string
    isActive: boolean
    createdAt: Date
    _count: StudioMembershipCountAggregateOutputType | null
    _min: StudioMembershipMinAggregateOutputType | null
    _max: StudioMembershipMaxAggregateOutputType | null
  }

  type GetStudioMembershipGroupByPayload<T extends StudioMembershipGroupByArgs> = Prisma.PrismaPromise<
    Array<
      PickEnumerable<StudioMembershipGroupByOutputType, T['by']> &
        {
          [P in ((keyof T) & (keyof StudioMembershipGroupByOutputType))]: P extends '_count'
            ? T[P] extends boolean
              ? number
              : GetScalarType<T[P], StudioMembershipGroupByOutputType[P]>
            : GetScalarType<T[P], StudioMembershipGroupByOutputType[P]>
        }
      >
    >


  export type StudioMembershipSelect<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    userId?: boolean
    studioId?: boolean
    role?: boolean
    isActive?: boolean
    createdAt?: boolean
    user?: boolean | MasterUserDefaultArgs<ExtArgs>
    studio?: boolean | StudioDefaultArgs<ExtArgs>
  }, ExtArgs["result"]["studioMembership"]>

  export type StudioMembershipSelectCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    userId?: boolean
    studioId?: boolean
    role?: boolean
    isActive?: boolean
    createdAt?: boolean
    user?: boolean | MasterUserDefaultArgs<ExtArgs>
    studio?: boolean | StudioDefaultArgs<ExtArgs>
  }, ExtArgs["result"]["studioMembership"]>

  export type StudioMembershipSelectUpdateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    userId?: boolean
    studioId?: boolean
    role?: boolean
    isActive?: boolean
    createdAt?: boolean
    user?: boolean | MasterUserDefaultArgs<ExtArgs>
    studio?: boolean | StudioDefaultArgs<ExtArgs>
  }, ExtArgs["result"]["studioMembership"]>

  export type StudioMembershipSelectScalar = {
    id?: boolean
    userId?: boolean
    studioId?: boolean
    role?: boolean
    isActive?: boolean
    createdAt?: boolean
  }

  export type StudioMembershipOmit<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetOmit<"id" | "userId" | "studioId" | "role" | "isActive" | "createdAt", ExtArgs["result"]["studioMembership"]>
  export type StudioMembershipInclude<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    user?: boolean | MasterUserDefaultArgs<ExtArgs>
    studio?: boolean | StudioDefaultArgs<ExtArgs>
  }
  export type StudioMembershipIncludeCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    user?: boolean | MasterUserDefaultArgs<ExtArgs>
    studio?: boolean | StudioDefaultArgs<ExtArgs>
  }
  export type StudioMembershipIncludeUpdateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    user?: boolean | MasterUserDefaultArgs<ExtArgs>
    studio?: boolean | StudioDefaultArgs<ExtArgs>
  }

  export type $StudioMembershipPayload<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    name: "StudioMembership"
    objects: {
      user: Prisma.$MasterUserPayload<ExtArgs>
      studio: Prisma.$StudioPayload<ExtArgs>
    }
    scalars: $Extensions.GetPayloadResult<{
      id: string
      userId: string
      studioId: string
      role: string
      isActive: boolean
      createdAt: Date
    }, ExtArgs["result"]["studioMembership"]>
    composites: {}
  }

  type StudioMembershipGetPayload<S extends boolean | null | undefined | StudioMembershipDefaultArgs> = $Result.GetResult<Prisma.$StudioMembershipPayload, S>

  type StudioMembershipCountArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> =
    Omit<StudioMembershipFindManyArgs, 'select' | 'include' | 'distinct' | 'omit'> & {
      select?: StudioMembershipCountAggregateInputType | true
    }

  export interface StudioMembershipDelegate<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> {
    [K: symbol]: { types: Prisma.TypeMap<ExtArgs>['model']['StudioMembership'], meta: { name: 'StudioMembership' } }
    /**
     * Find zero or one StudioMembership that matches the filter.
     * @param {StudioMembershipFindUniqueArgs} args - Arguments to find a StudioMembership
     * @example
     * // Get one StudioMembership
     * const studioMembership = await prisma.studioMembership.findUnique({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUnique<T extends StudioMembershipFindUniqueArgs>(args: SelectSubset<T, StudioMembershipFindUniqueArgs<ExtArgs>>): Prisma__StudioMembershipClient<$Result.GetResult<Prisma.$StudioMembershipPayload<ExtArgs>, T, "findUnique", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find one StudioMembership that matches the filter or throw an error with `error.code='P2025'`
     * if no matches were found.
     * @param {StudioMembershipFindUniqueOrThrowArgs} args - Arguments to find a StudioMembership
     * @example
     * // Get one StudioMembership
     * const studioMembership = await prisma.studioMembership.findUniqueOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUniqueOrThrow<T extends StudioMembershipFindUniqueOrThrowArgs>(args: SelectSubset<T, StudioMembershipFindUniqueOrThrowArgs<ExtArgs>>): Prisma__StudioMembershipClient<$Result.GetResult<Prisma.$StudioMembershipPayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first StudioMembership that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {StudioMembershipFindFirstArgs} args - Arguments to find a StudioMembership
     * @example
     * // Get one StudioMembership
     * const studioMembership = await prisma.studioMembership.findFirst({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirst<T extends StudioMembershipFindFirstArgs>(args?: SelectSubset<T, StudioMembershipFindFirstArgs<ExtArgs>>): Prisma__StudioMembershipClient<$Result.GetResult<Prisma.$StudioMembershipPayload<ExtArgs>, T, "findFirst", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first StudioMembership that matches the filter or
     * throw `PrismaKnownClientError` with `P2025` code if no matches were found.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {StudioMembershipFindFirstOrThrowArgs} args - Arguments to find a StudioMembership
     * @example
     * // Get one StudioMembership
     * const studioMembership = await prisma.studioMembership.findFirstOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirstOrThrow<T extends StudioMembershipFindFirstOrThrowArgs>(args?: SelectSubset<T, StudioMembershipFindFirstOrThrowArgs<ExtArgs>>): Prisma__StudioMembershipClient<$Result.GetResult<Prisma.$StudioMembershipPayload<ExtArgs>, T, "findFirstOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find zero or more StudioMemberships that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {StudioMembershipFindManyArgs} args - Arguments to filter and select certain fields only.
     * @example
     * // Get all StudioMemberships
     * const studioMemberships = await prisma.studioMembership.findMany()
     * 
     * // Get first 10 StudioMemberships
     * const studioMemberships = await prisma.studioMembership.findMany({ take: 10 })
     * 
     * // Only select the `id`
     * const studioMembershipWithIdOnly = await prisma.studioMembership.findMany({ select: { id: true } })
     * 
     */
    findMany<T extends StudioMembershipFindManyArgs>(args?: SelectSubset<T, StudioMembershipFindManyArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$StudioMembershipPayload<ExtArgs>, T, "findMany", GlobalOmitOptions>>

    /**
     * Create a StudioMembership.
     * @param {StudioMembershipCreateArgs} args - Arguments to create a StudioMembership.
     * @example
     * // Create one StudioMembership
     * const StudioMembership = await prisma.studioMembership.create({
     *   data: {
     *     // ... data to create a StudioMembership
     *   }
     * })
     * 
     */
    create<T extends StudioMembershipCreateArgs>(args: SelectSubset<T, StudioMembershipCreateArgs<ExtArgs>>): Prisma__StudioMembershipClient<$Result.GetResult<Prisma.$StudioMembershipPayload<ExtArgs>, T, "create", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Create many StudioMemberships.
     * @param {StudioMembershipCreateManyArgs} args - Arguments to create many StudioMemberships.
     * @example
     * // Create many StudioMemberships
     * const studioMembership = await prisma.studioMembership.createMany({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     *     
     */
    createMany<T extends StudioMembershipCreateManyArgs>(args?: SelectSubset<T, StudioMembershipCreateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Create many StudioMemberships and returns the data saved in the database.
     * @param {StudioMembershipCreateManyAndReturnArgs} args - Arguments to create many StudioMemberships.
     * @example
     * // Create many StudioMemberships
     * const studioMembership = await prisma.studioMembership.createManyAndReturn({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Create many StudioMemberships and only return the `id`
     * const studioMembershipWithIdOnly = await prisma.studioMembership.createManyAndReturn({
     *   select: { id: true },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    createManyAndReturn<T extends StudioMembershipCreateManyAndReturnArgs>(args?: SelectSubset<T, StudioMembershipCreateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$StudioMembershipPayload<ExtArgs>, T, "createManyAndReturn", GlobalOmitOptions>>

    /**
     * Delete a StudioMembership.
     * @param {StudioMembershipDeleteArgs} args - Arguments to delete one StudioMembership.
     * @example
     * // Delete one StudioMembership
     * const StudioMembership = await prisma.studioMembership.delete({
     *   where: {
     *     // ... filter to delete one StudioMembership
     *   }
     * })
     * 
     */
    delete<T extends StudioMembershipDeleteArgs>(args: SelectSubset<T, StudioMembershipDeleteArgs<ExtArgs>>): Prisma__StudioMembershipClient<$Result.GetResult<Prisma.$StudioMembershipPayload<ExtArgs>, T, "delete", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Update one StudioMembership.
     * @param {StudioMembershipUpdateArgs} args - Arguments to update one StudioMembership.
     * @example
     * // Update one StudioMembership
     * const studioMembership = await prisma.studioMembership.update({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    update<T extends StudioMembershipUpdateArgs>(args: SelectSubset<T, StudioMembershipUpdateArgs<ExtArgs>>): Prisma__StudioMembershipClient<$Result.GetResult<Prisma.$StudioMembershipPayload<ExtArgs>, T, "update", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Delete zero or more StudioMemberships.
     * @param {StudioMembershipDeleteManyArgs} args - Arguments to filter StudioMemberships to delete.
     * @example
     * // Delete a few StudioMemberships
     * const { count } = await prisma.studioMembership.deleteMany({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     * 
     */
    deleteMany<T extends StudioMembershipDeleteManyArgs>(args?: SelectSubset<T, StudioMembershipDeleteManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more StudioMemberships.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {StudioMembershipUpdateManyArgs} args - Arguments to update one or more rows.
     * @example
     * // Update many StudioMemberships
     * const studioMembership = await prisma.studioMembership.updateMany({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    updateMany<T extends StudioMembershipUpdateManyArgs>(args: SelectSubset<T, StudioMembershipUpdateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more StudioMemberships and returns the data updated in the database.
     * @param {StudioMembershipUpdateManyAndReturnArgs} args - Arguments to update many StudioMemberships.
     * @example
     * // Update many StudioMemberships
     * const studioMembership = await prisma.studioMembership.updateManyAndReturn({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Update zero or more StudioMemberships and only return the `id`
     * const studioMembershipWithIdOnly = await prisma.studioMembership.updateManyAndReturn({
     *   select: { id: true },
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    updateManyAndReturn<T extends StudioMembershipUpdateManyAndReturnArgs>(args: SelectSubset<T, StudioMembershipUpdateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$StudioMembershipPayload<ExtArgs>, T, "updateManyAndReturn", GlobalOmitOptions>>

    /**
     * Create or update one StudioMembership.
     * @param {StudioMembershipUpsertArgs} args - Arguments to update or create a StudioMembership.
     * @example
     * // Update or create a StudioMembership
     * const studioMembership = await prisma.studioMembership.upsert({
     *   create: {
     *     // ... data to create a StudioMembership
     *   },
     *   update: {
     *     // ... in case it already exists, update
     *   },
     *   where: {
     *     // ... the filter for the StudioMembership we want to update
     *   }
     * })
     */
    upsert<T extends StudioMembershipUpsertArgs>(args: SelectSubset<T, StudioMembershipUpsertArgs<ExtArgs>>): Prisma__StudioMembershipClient<$Result.GetResult<Prisma.$StudioMembershipPayload<ExtArgs>, T, "upsert", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>


    /**
     * Count the number of StudioMemberships.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {StudioMembershipCountArgs} args - Arguments to filter StudioMemberships to count.
     * @example
     * // Count the number of StudioMemberships
     * const count = await prisma.studioMembership.count({
     *   where: {
     *     // ... the filter for the StudioMemberships we want to count
     *   }
     * })
    **/
    count<T extends StudioMembershipCountArgs>(
      args?: Subset<T, StudioMembershipCountArgs>,
    ): Prisma.PrismaPromise<
      T extends $Utils.Record<'select', any>
        ? T['select'] extends true
          ? number
          : GetScalarType<T['select'], StudioMembershipCountAggregateOutputType>
        : number
    >

    /**
     * Allows you to perform aggregations operations on a StudioMembership.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {StudioMembershipAggregateArgs} args - Select which aggregations you would like to apply and on what fields.
     * @example
     * // Ordered by age ascending
     * // Where email contains prisma.io
     * // Limited to the 10 users
     * const aggregations = await prisma.user.aggregate({
     *   _avg: {
     *     age: true,
     *   },
     *   where: {
     *     email: {
     *       contains: "prisma.io",
     *     },
     *   },
     *   orderBy: {
     *     age: "asc",
     *   },
     *   take: 10,
     * })
    **/
    aggregate<T extends StudioMembershipAggregateArgs>(args: Subset<T, StudioMembershipAggregateArgs>): Prisma.PrismaPromise<GetStudioMembershipAggregateType<T>>

    /**
     * Group by StudioMembership.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {StudioMembershipGroupByArgs} args - Group by arguments.
     * @example
     * // Group by city, order by createdAt, get count
     * const result = await prisma.user.groupBy({
     *   by: ['city', 'createdAt'],
     *   orderBy: {
     *     createdAt: true
     *   },
     *   _count: {
     *     _all: true
     *   },
     * })
     * 
    **/
    groupBy<
      T extends StudioMembershipGroupByArgs,
      HasSelectOrTake extends Or<
        Extends<'skip', Keys<T>>,
        Extends<'take', Keys<T>>
      >,
      OrderByArg extends True extends HasSelectOrTake
        ? { orderBy: StudioMembershipGroupByArgs['orderBy'] }
        : { orderBy?: StudioMembershipGroupByArgs['orderBy'] },
      OrderFields extends ExcludeUnderscoreKeys<Keys<MaybeTupleToUnion<T['orderBy']>>>,
      ByFields extends MaybeTupleToUnion<T['by']>,
      ByValid extends Has<ByFields, OrderFields>,
      HavingFields extends GetHavingFields<T['having']>,
      HavingValid extends Has<ByFields, HavingFields>,
      ByEmpty extends T['by'] extends never[] ? True : False,
      InputErrors extends ByEmpty extends True
      ? `Error: "by" must not be empty.`
      : HavingValid extends False
      ? {
          [P in HavingFields]: P extends ByFields
            ? never
            : P extends string
            ? `Error: Field "${P}" used in "having" needs to be provided in "by".`
            : [
                Error,
                'Field ',
                P,
                ` in "having" needs to be provided in "by"`,
              ]
        }[HavingFields]
      : 'take' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "take", you also need to provide "orderBy"'
      : 'skip' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "skip", you also need to provide "orderBy"'
      : ByValid extends True
      ? {}
      : {
          [P in OrderFields]: P extends ByFields
            ? never
            : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
        }[OrderFields]
    >(args: SubsetIntersection<T, StudioMembershipGroupByArgs, OrderByArg> & InputErrors): {} extends InputErrors ? GetStudioMembershipGroupByPayload<T> : Prisma.PrismaPromise<InputErrors>
  /**
   * Fields of the StudioMembership model
   */
  readonly fields: StudioMembershipFieldRefs;
  }

  /**
   * The delegate class that acts as a "Promise-like" for StudioMembership.
   * Why is this prefixed with `Prisma__`?
   * Because we want to prevent naming conflicts as mentioned in
   * https://github.com/prisma/prisma-client-js/issues/707
   */
  export interface Prisma__StudioMembershipClient<T, Null = never, ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> extends Prisma.PrismaPromise<T> {
    readonly [Symbol.toStringTag]: "PrismaPromise"
    user<T extends MasterUserDefaultArgs<ExtArgs> = {}>(args?: Subset<T, MasterUserDefaultArgs<ExtArgs>>): Prisma__MasterUserClient<$Result.GetResult<Prisma.$MasterUserPayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions> | Null, Null, ExtArgs, GlobalOmitOptions>
    studio<T extends StudioDefaultArgs<ExtArgs> = {}>(args?: Subset<T, StudioDefaultArgs<ExtArgs>>): Prisma__StudioClient<$Result.GetResult<Prisma.$StudioPayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions> | Null, Null, ExtArgs, GlobalOmitOptions>
    /**
     * Attaches callbacks for the resolution and/or rejection of the Promise.
     * @param onfulfilled The callback to execute when the Promise is resolved.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of which ever callback is executed.
     */
    then<TResult1 = T, TResult2 = never>(onfulfilled?: ((value: T) => TResult1 | PromiseLike<TResult1>) | undefined | null, onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | undefined | null): $Utils.JsPromise<TResult1 | TResult2>
    /**
     * Attaches a callback for only the rejection of the Promise.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of the callback.
     */
    catch<TResult = never>(onrejected?: ((reason: any) => TResult | PromiseLike<TResult>) | undefined | null): $Utils.JsPromise<T | TResult>
    /**
     * Attaches a callback that is invoked when the Promise is settled (fulfilled or rejected). The
     * resolved value cannot be modified from the callback.
     * @param onfinally The callback to execute when the Promise is settled (fulfilled or rejected).
     * @returns A Promise for the completion of the callback.
     */
    finally(onfinally?: (() => void) | undefined | null): $Utils.JsPromise<T>
  }




  /**
   * Fields of the StudioMembership model
   */
  interface StudioMembershipFieldRefs {
    readonly id: FieldRef<"StudioMembership", 'String'>
    readonly userId: FieldRef<"StudioMembership", 'String'>
    readonly studioId: FieldRef<"StudioMembership", 'String'>
    readonly role: FieldRef<"StudioMembership", 'String'>
    readonly isActive: FieldRef<"StudioMembership", 'Boolean'>
    readonly createdAt: FieldRef<"StudioMembership", 'DateTime'>
  }
    

  // Custom InputTypes
  /**
   * StudioMembership findUnique
   */
  export type StudioMembershipFindUniqueArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the StudioMembership
     */
    select?: StudioMembershipSelect<ExtArgs> | null
    /**
     * Omit specific fields from the StudioMembership
     */
    omit?: StudioMembershipOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: StudioMembershipInclude<ExtArgs> | null
    /**
     * Filter, which StudioMembership to fetch.
     */
    where: StudioMembershipWhereUniqueInput
  }

  /**
   * StudioMembership findUniqueOrThrow
   */
  export type StudioMembershipFindUniqueOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the StudioMembership
     */
    select?: StudioMembershipSelect<ExtArgs> | null
    /**
     * Omit specific fields from the StudioMembership
     */
    omit?: StudioMembershipOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: StudioMembershipInclude<ExtArgs> | null
    /**
     * Filter, which StudioMembership to fetch.
     */
    where: StudioMembershipWhereUniqueInput
  }

  /**
   * StudioMembership findFirst
   */
  export type StudioMembershipFindFirstArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the StudioMembership
     */
    select?: StudioMembershipSelect<ExtArgs> | null
    /**
     * Omit specific fields from the StudioMembership
     */
    omit?: StudioMembershipOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: StudioMembershipInclude<ExtArgs> | null
    /**
     * Filter, which StudioMembership to fetch.
     */
    where?: StudioMembershipWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of StudioMemberships to fetch.
     */
    orderBy?: StudioMembershipOrderByWithRelationInput | StudioMembershipOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for StudioMemberships.
     */
    cursor?: StudioMembershipWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` StudioMemberships from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` StudioMemberships.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of StudioMemberships.
     */
    distinct?: StudioMembershipScalarFieldEnum | StudioMembershipScalarFieldEnum[]
  }

  /**
   * StudioMembership findFirstOrThrow
   */
  export type StudioMembershipFindFirstOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the StudioMembership
     */
    select?: StudioMembershipSelect<ExtArgs> | null
    /**
     * Omit specific fields from the StudioMembership
     */
    omit?: StudioMembershipOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: StudioMembershipInclude<ExtArgs> | null
    /**
     * Filter, which StudioMembership to fetch.
     */
    where?: StudioMembershipWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of StudioMemberships to fetch.
     */
    orderBy?: StudioMembershipOrderByWithRelationInput | StudioMembershipOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for StudioMemberships.
     */
    cursor?: StudioMembershipWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` StudioMemberships from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` StudioMemberships.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of StudioMemberships.
     */
    distinct?: StudioMembershipScalarFieldEnum | StudioMembershipScalarFieldEnum[]
  }

  /**
   * StudioMembership findMany
   */
  export type StudioMembershipFindManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the StudioMembership
     */
    select?: StudioMembershipSelect<ExtArgs> | null
    /**
     * Omit specific fields from the StudioMembership
     */
    omit?: StudioMembershipOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: StudioMembershipInclude<ExtArgs> | null
    /**
     * Filter, which StudioMemberships to fetch.
     */
    where?: StudioMembershipWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of StudioMemberships to fetch.
     */
    orderBy?: StudioMembershipOrderByWithRelationInput | StudioMembershipOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for listing StudioMemberships.
     */
    cursor?: StudioMembershipWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` StudioMemberships from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` StudioMemberships.
     */
    skip?: number
    distinct?: StudioMembershipScalarFieldEnum | StudioMembershipScalarFieldEnum[]
  }

  /**
   * StudioMembership create
   */
  export type StudioMembershipCreateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the StudioMembership
     */
    select?: StudioMembershipSelect<ExtArgs> | null
    /**
     * Omit specific fields from the StudioMembership
     */
    omit?: StudioMembershipOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: StudioMembershipInclude<ExtArgs> | null
    /**
     * The data needed to create a StudioMembership.
     */
    data: XOR<StudioMembershipCreateInput, StudioMembershipUncheckedCreateInput>
  }

  /**
   * StudioMembership createMany
   */
  export type StudioMembershipCreateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to create many StudioMemberships.
     */
    data: StudioMembershipCreateManyInput | StudioMembershipCreateManyInput[]
  }

  /**
   * StudioMembership createManyAndReturn
   */
  export type StudioMembershipCreateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the StudioMembership
     */
    select?: StudioMembershipSelectCreateManyAndReturn<ExtArgs> | null
    /**
     * Omit specific fields from the StudioMembership
     */
    omit?: StudioMembershipOmit<ExtArgs> | null
    /**
     * The data used to create many StudioMemberships.
     */
    data: StudioMembershipCreateManyInput | StudioMembershipCreateManyInput[]
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: StudioMembershipIncludeCreateManyAndReturn<ExtArgs> | null
  }

  /**
   * StudioMembership update
   */
  export type StudioMembershipUpdateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the StudioMembership
     */
    select?: StudioMembershipSelect<ExtArgs> | null
    /**
     * Omit specific fields from the StudioMembership
     */
    omit?: StudioMembershipOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: StudioMembershipInclude<ExtArgs> | null
    /**
     * The data needed to update a StudioMembership.
     */
    data: XOR<StudioMembershipUpdateInput, StudioMembershipUncheckedUpdateInput>
    /**
     * Choose, which StudioMembership to update.
     */
    where: StudioMembershipWhereUniqueInput
  }

  /**
   * StudioMembership updateMany
   */
  export type StudioMembershipUpdateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to update StudioMemberships.
     */
    data: XOR<StudioMembershipUpdateManyMutationInput, StudioMembershipUncheckedUpdateManyInput>
    /**
     * Filter which StudioMemberships to update
     */
    where?: StudioMembershipWhereInput
    /**
     * Limit how many StudioMemberships to update.
     */
    limit?: number
  }

  /**
   * StudioMembership updateManyAndReturn
   */
  export type StudioMembershipUpdateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the StudioMembership
     */
    select?: StudioMembershipSelectUpdateManyAndReturn<ExtArgs> | null
    /**
     * Omit specific fields from the StudioMembership
     */
    omit?: StudioMembershipOmit<ExtArgs> | null
    /**
     * The data used to update StudioMemberships.
     */
    data: XOR<StudioMembershipUpdateManyMutationInput, StudioMembershipUncheckedUpdateManyInput>
    /**
     * Filter which StudioMemberships to update
     */
    where?: StudioMembershipWhereInput
    /**
     * Limit how many StudioMemberships to update.
     */
    limit?: number
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: StudioMembershipIncludeUpdateManyAndReturn<ExtArgs> | null
  }

  /**
   * StudioMembership upsert
   */
  export type StudioMembershipUpsertArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the StudioMembership
     */
    select?: StudioMembershipSelect<ExtArgs> | null
    /**
     * Omit specific fields from the StudioMembership
     */
    omit?: StudioMembershipOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: StudioMembershipInclude<ExtArgs> | null
    /**
     * The filter to search for the StudioMembership to update in case it exists.
     */
    where: StudioMembershipWhereUniqueInput
    /**
     * In case the StudioMembership found by the `where` argument doesn't exist, create a new StudioMembership with this data.
     */
    create: XOR<StudioMembershipCreateInput, StudioMembershipUncheckedCreateInput>
    /**
     * In case the StudioMembership was found with the provided `where` argument, update it with this data.
     */
    update: XOR<StudioMembershipUpdateInput, StudioMembershipUncheckedUpdateInput>
  }

  /**
   * StudioMembership delete
   */
  export type StudioMembershipDeleteArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the StudioMembership
     */
    select?: StudioMembershipSelect<ExtArgs> | null
    /**
     * Omit specific fields from the StudioMembership
     */
    omit?: StudioMembershipOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: StudioMembershipInclude<ExtArgs> | null
    /**
     * Filter which StudioMembership to delete.
     */
    where: StudioMembershipWhereUniqueInput
  }

  /**
   * StudioMembership deleteMany
   */
  export type StudioMembershipDeleteManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which StudioMemberships to delete
     */
    where?: StudioMembershipWhereInput
    /**
     * Limit how many StudioMemberships to delete.
     */
    limit?: number
  }

  /**
   * StudioMembership without action
   */
  export type StudioMembershipDefaultArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the StudioMembership
     */
    select?: StudioMembershipSelect<ExtArgs> | null
    /**
     * Omit specific fields from the StudioMembership
     */
    omit?: StudioMembershipOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: StudioMembershipInclude<ExtArgs> | null
  }


  /**
   * Model OtpCode
   */

  export type AggregateOtpCode = {
    _count: OtpCodeCountAggregateOutputType | null
    _avg: OtpCodeAvgAggregateOutputType | null
    _sum: OtpCodeSumAggregateOutputType | null
    _min: OtpCodeMinAggregateOutputType | null
    _max: OtpCodeMaxAggregateOutputType | null
  }

  export type OtpCodeAvgAggregateOutputType = {
    attempts: number | null
  }

  export type OtpCodeSumAggregateOutputType = {
    attempts: number | null
  }

  export type OtpCodeMinAggregateOutputType = {
    id: string | null
    phone: string | null
    code: string | null
    hash: string | null
    expiresAt: Date | null
    used: boolean | null
    attempts: number | null
    createdAt: Date | null
  }

  export type OtpCodeMaxAggregateOutputType = {
    id: string | null
    phone: string | null
    code: string | null
    hash: string | null
    expiresAt: Date | null
    used: boolean | null
    attempts: number | null
    createdAt: Date | null
  }

  export type OtpCodeCountAggregateOutputType = {
    id: number
    phone: number
    code: number
    hash: number
    expiresAt: number
    used: number
    attempts: number
    createdAt: number
    _all: number
  }


  export type OtpCodeAvgAggregateInputType = {
    attempts?: true
  }

  export type OtpCodeSumAggregateInputType = {
    attempts?: true
  }

  export type OtpCodeMinAggregateInputType = {
    id?: true
    phone?: true
    code?: true
    hash?: true
    expiresAt?: true
    used?: true
    attempts?: true
    createdAt?: true
  }

  export type OtpCodeMaxAggregateInputType = {
    id?: true
    phone?: true
    code?: true
    hash?: true
    expiresAt?: true
    used?: true
    attempts?: true
    createdAt?: true
  }

  export type OtpCodeCountAggregateInputType = {
    id?: true
    phone?: true
    code?: true
    hash?: true
    expiresAt?: true
    used?: true
    attempts?: true
    createdAt?: true
    _all?: true
  }

  export type OtpCodeAggregateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which OtpCode to aggregate.
     */
    where?: OtpCodeWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of OtpCodes to fetch.
     */
    orderBy?: OtpCodeOrderByWithRelationInput | OtpCodeOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the start position
     */
    cursor?: OtpCodeWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` OtpCodes from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` OtpCodes.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Count returned OtpCodes
    **/
    _count?: true | OtpCodeCountAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to average
    **/
    _avg?: OtpCodeAvgAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to sum
    **/
    _sum?: OtpCodeSumAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the minimum value
    **/
    _min?: OtpCodeMinAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the maximum value
    **/
    _max?: OtpCodeMaxAggregateInputType
  }

  export type GetOtpCodeAggregateType<T extends OtpCodeAggregateArgs> = {
        [P in keyof T & keyof AggregateOtpCode]: P extends '_count' | 'count'
      ? T[P] extends true
        ? number
        : GetScalarType<T[P], AggregateOtpCode[P]>
      : GetScalarType<T[P], AggregateOtpCode[P]>
  }




  export type OtpCodeGroupByArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: OtpCodeWhereInput
    orderBy?: OtpCodeOrderByWithAggregationInput | OtpCodeOrderByWithAggregationInput[]
    by: OtpCodeScalarFieldEnum[] | OtpCodeScalarFieldEnum
    having?: OtpCodeScalarWhereWithAggregatesInput
    take?: number
    skip?: number
    _count?: OtpCodeCountAggregateInputType | true
    _avg?: OtpCodeAvgAggregateInputType
    _sum?: OtpCodeSumAggregateInputType
    _min?: OtpCodeMinAggregateInputType
    _max?: OtpCodeMaxAggregateInputType
  }

  export type OtpCodeGroupByOutputType = {
    id: string
    phone: string
    code: string
    hash: string
    expiresAt: Date
    used: boolean
    attempts: number
    createdAt: Date
    _count: OtpCodeCountAggregateOutputType | null
    _avg: OtpCodeAvgAggregateOutputType | null
    _sum: OtpCodeSumAggregateOutputType | null
    _min: OtpCodeMinAggregateOutputType | null
    _max: OtpCodeMaxAggregateOutputType | null
  }

  type GetOtpCodeGroupByPayload<T extends OtpCodeGroupByArgs> = Prisma.PrismaPromise<
    Array<
      PickEnumerable<OtpCodeGroupByOutputType, T['by']> &
        {
          [P in ((keyof T) & (keyof OtpCodeGroupByOutputType))]: P extends '_count'
            ? T[P] extends boolean
              ? number
              : GetScalarType<T[P], OtpCodeGroupByOutputType[P]>
            : GetScalarType<T[P], OtpCodeGroupByOutputType[P]>
        }
      >
    >


  export type OtpCodeSelect<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    phone?: boolean
    code?: boolean
    hash?: boolean
    expiresAt?: boolean
    used?: boolean
    attempts?: boolean
    createdAt?: boolean
  }, ExtArgs["result"]["otpCode"]>

  export type OtpCodeSelectCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    phone?: boolean
    code?: boolean
    hash?: boolean
    expiresAt?: boolean
    used?: boolean
    attempts?: boolean
    createdAt?: boolean
  }, ExtArgs["result"]["otpCode"]>

  export type OtpCodeSelectUpdateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    phone?: boolean
    code?: boolean
    hash?: boolean
    expiresAt?: boolean
    used?: boolean
    attempts?: boolean
    createdAt?: boolean
  }, ExtArgs["result"]["otpCode"]>

  export type OtpCodeSelectScalar = {
    id?: boolean
    phone?: boolean
    code?: boolean
    hash?: boolean
    expiresAt?: boolean
    used?: boolean
    attempts?: boolean
    createdAt?: boolean
  }

  export type OtpCodeOmit<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetOmit<"id" | "phone" | "code" | "hash" | "expiresAt" | "used" | "attempts" | "createdAt", ExtArgs["result"]["otpCode"]>

  export type $OtpCodePayload<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    name: "OtpCode"
    objects: {}
    scalars: $Extensions.GetPayloadResult<{
      id: string
      phone: string
      code: string
      hash: string
      expiresAt: Date
      used: boolean
      attempts: number
      createdAt: Date
    }, ExtArgs["result"]["otpCode"]>
    composites: {}
  }

  type OtpCodeGetPayload<S extends boolean | null | undefined | OtpCodeDefaultArgs> = $Result.GetResult<Prisma.$OtpCodePayload, S>

  type OtpCodeCountArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> =
    Omit<OtpCodeFindManyArgs, 'select' | 'include' | 'distinct' | 'omit'> & {
      select?: OtpCodeCountAggregateInputType | true
    }

  export interface OtpCodeDelegate<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> {
    [K: symbol]: { types: Prisma.TypeMap<ExtArgs>['model']['OtpCode'], meta: { name: 'OtpCode' } }
    /**
     * Find zero or one OtpCode that matches the filter.
     * @param {OtpCodeFindUniqueArgs} args - Arguments to find a OtpCode
     * @example
     * // Get one OtpCode
     * const otpCode = await prisma.otpCode.findUnique({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUnique<T extends OtpCodeFindUniqueArgs>(args: SelectSubset<T, OtpCodeFindUniqueArgs<ExtArgs>>): Prisma__OtpCodeClient<$Result.GetResult<Prisma.$OtpCodePayload<ExtArgs>, T, "findUnique", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find one OtpCode that matches the filter or throw an error with `error.code='P2025'`
     * if no matches were found.
     * @param {OtpCodeFindUniqueOrThrowArgs} args - Arguments to find a OtpCode
     * @example
     * // Get one OtpCode
     * const otpCode = await prisma.otpCode.findUniqueOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUniqueOrThrow<T extends OtpCodeFindUniqueOrThrowArgs>(args: SelectSubset<T, OtpCodeFindUniqueOrThrowArgs<ExtArgs>>): Prisma__OtpCodeClient<$Result.GetResult<Prisma.$OtpCodePayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first OtpCode that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {OtpCodeFindFirstArgs} args - Arguments to find a OtpCode
     * @example
     * // Get one OtpCode
     * const otpCode = await prisma.otpCode.findFirst({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirst<T extends OtpCodeFindFirstArgs>(args?: SelectSubset<T, OtpCodeFindFirstArgs<ExtArgs>>): Prisma__OtpCodeClient<$Result.GetResult<Prisma.$OtpCodePayload<ExtArgs>, T, "findFirst", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first OtpCode that matches the filter or
     * throw `PrismaKnownClientError` with `P2025` code if no matches were found.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {OtpCodeFindFirstOrThrowArgs} args - Arguments to find a OtpCode
     * @example
     * // Get one OtpCode
     * const otpCode = await prisma.otpCode.findFirstOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirstOrThrow<T extends OtpCodeFindFirstOrThrowArgs>(args?: SelectSubset<T, OtpCodeFindFirstOrThrowArgs<ExtArgs>>): Prisma__OtpCodeClient<$Result.GetResult<Prisma.$OtpCodePayload<ExtArgs>, T, "findFirstOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find zero or more OtpCodes that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {OtpCodeFindManyArgs} args - Arguments to filter and select certain fields only.
     * @example
     * // Get all OtpCodes
     * const otpCodes = await prisma.otpCode.findMany()
     * 
     * // Get first 10 OtpCodes
     * const otpCodes = await prisma.otpCode.findMany({ take: 10 })
     * 
     * // Only select the `id`
     * const otpCodeWithIdOnly = await prisma.otpCode.findMany({ select: { id: true } })
     * 
     */
    findMany<T extends OtpCodeFindManyArgs>(args?: SelectSubset<T, OtpCodeFindManyArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$OtpCodePayload<ExtArgs>, T, "findMany", GlobalOmitOptions>>

    /**
     * Create a OtpCode.
     * @param {OtpCodeCreateArgs} args - Arguments to create a OtpCode.
     * @example
     * // Create one OtpCode
     * const OtpCode = await prisma.otpCode.create({
     *   data: {
     *     // ... data to create a OtpCode
     *   }
     * })
     * 
     */
    create<T extends OtpCodeCreateArgs>(args: SelectSubset<T, OtpCodeCreateArgs<ExtArgs>>): Prisma__OtpCodeClient<$Result.GetResult<Prisma.$OtpCodePayload<ExtArgs>, T, "create", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Create many OtpCodes.
     * @param {OtpCodeCreateManyArgs} args - Arguments to create many OtpCodes.
     * @example
     * // Create many OtpCodes
     * const otpCode = await prisma.otpCode.createMany({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     *     
     */
    createMany<T extends OtpCodeCreateManyArgs>(args?: SelectSubset<T, OtpCodeCreateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Create many OtpCodes and returns the data saved in the database.
     * @param {OtpCodeCreateManyAndReturnArgs} args - Arguments to create many OtpCodes.
     * @example
     * // Create many OtpCodes
     * const otpCode = await prisma.otpCode.createManyAndReturn({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Create many OtpCodes and only return the `id`
     * const otpCodeWithIdOnly = await prisma.otpCode.createManyAndReturn({
     *   select: { id: true },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    createManyAndReturn<T extends OtpCodeCreateManyAndReturnArgs>(args?: SelectSubset<T, OtpCodeCreateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$OtpCodePayload<ExtArgs>, T, "createManyAndReturn", GlobalOmitOptions>>

    /**
     * Delete a OtpCode.
     * @param {OtpCodeDeleteArgs} args - Arguments to delete one OtpCode.
     * @example
     * // Delete one OtpCode
     * const OtpCode = await prisma.otpCode.delete({
     *   where: {
     *     // ... filter to delete one OtpCode
     *   }
     * })
     * 
     */
    delete<T extends OtpCodeDeleteArgs>(args: SelectSubset<T, OtpCodeDeleteArgs<ExtArgs>>): Prisma__OtpCodeClient<$Result.GetResult<Prisma.$OtpCodePayload<ExtArgs>, T, "delete", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Update one OtpCode.
     * @param {OtpCodeUpdateArgs} args - Arguments to update one OtpCode.
     * @example
     * // Update one OtpCode
     * const otpCode = await prisma.otpCode.update({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    update<T extends OtpCodeUpdateArgs>(args: SelectSubset<T, OtpCodeUpdateArgs<ExtArgs>>): Prisma__OtpCodeClient<$Result.GetResult<Prisma.$OtpCodePayload<ExtArgs>, T, "update", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Delete zero or more OtpCodes.
     * @param {OtpCodeDeleteManyArgs} args - Arguments to filter OtpCodes to delete.
     * @example
     * // Delete a few OtpCodes
     * const { count } = await prisma.otpCode.deleteMany({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     * 
     */
    deleteMany<T extends OtpCodeDeleteManyArgs>(args?: SelectSubset<T, OtpCodeDeleteManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more OtpCodes.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {OtpCodeUpdateManyArgs} args - Arguments to update one or more rows.
     * @example
     * // Update many OtpCodes
     * const otpCode = await prisma.otpCode.updateMany({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    updateMany<T extends OtpCodeUpdateManyArgs>(args: SelectSubset<T, OtpCodeUpdateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more OtpCodes and returns the data updated in the database.
     * @param {OtpCodeUpdateManyAndReturnArgs} args - Arguments to update many OtpCodes.
     * @example
     * // Update many OtpCodes
     * const otpCode = await prisma.otpCode.updateManyAndReturn({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Update zero or more OtpCodes and only return the `id`
     * const otpCodeWithIdOnly = await prisma.otpCode.updateManyAndReturn({
     *   select: { id: true },
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    updateManyAndReturn<T extends OtpCodeUpdateManyAndReturnArgs>(args: SelectSubset<T, OtpCodeUpdateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$OtpCodePayload<ExtArgs>, T, "updateManyAndReturn", GlobalOmitOptions>>

    /**
     * Create or update one OtpCode.
     * @param {OtpCodeUpsertArgs} args - Arguments to update or create a OtpCode.
     * @example
     * // Update or create a OtpCode
     * const otpCode = await prisma.otpCode.upsert({
     *   create: {
     *     // ... data to create a OtpCode
     *   },
     *   update: {
     *     // ... in case it already exists, update
     *   },
     *   where: {
     *     // ... the filter for the OtpCode we want to update
     *   }
     * })
     */
    upsert<T extends OtpCodeUpsertArgs>(args: SelectSubset<T, OtpCodeUpsertArgs<ExtArgs>>): Prisma__OtpCodeClient<$Result.GetResult<Prisma.$OtpCodePayload<ExtArgs>, T, "upsert", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>


    /**
     * Count the number of OtpCodes.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {OtpCodeCountArgs} args - Arguments to filter OtpCodes to count.
     * @example
     * // Count the number of OtpCodes
     * const count = await prisma.otpCode.count({
     *   where: {
     *     // ... the filter for the OtpCodes we want to count
     *   }
     * })
    **/
    count<T extends OtpCodeCountArgs>(
      args?: Subset<T, OtpCodeCountArgs>,
    ): Prisma.PrismaPromise<
      T extends $Utils.Record<'select', any>
        ? T['select'] extends true
          ? number
          : GetScalarType<T['select'], OtpCodeCountAggregateOutputType>
        : number
    >

    /**
     * Allows you to perform aggregations operations on a OtpCode.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {OtpCodeAggregateArgs} args - Select which aggregations you would like to apply and on what fields.
     * @example
     * // Ordered by age ascending
     * // Where email contains prisma.io
     * // Limited to the 10 users
     * const aggregations = await prisma.user.aggregate({
     *   _avg: {
     *     age: true,
     *   },
     *   where: {
     *     email: {
     *       contains: "prisma.io",
     *     },
     *   },
     *   orderBy: {
     *     age: "asc",
     *   },
     *   take: 10,
     * })
    **/
    aggregate<T extends OtpCodeAggregateArgs>(args: Subset<T, OtpCodeAggregateArgs>): Prisma.PrismaPromise<GetOtpCodeAggregateType<T>>

    /**
     * Group by OtpCode.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {OtpCodeGroupByArgs} args - Group by arguments.
     * @example
     * // Group by city, order by createdAt, get count
     * const result = await prisma.user.groupBy({
     *   by: ['city', 'createdAt'],
     *   orderBy: {
     *     createdAt: true
     *   },
     *   _count: {
     *     _all: true
     *   },
     * })
     * 
    **/
    groupBy<
      T extends OtpCodeGroupByArgs,
      HasSelectOrTake extends Or<
        Extends<'skip', Keys<T>>,
        Extends<'take', Keys<T>>
      >,
      OrderByArg extends True extends HasSelectOrTake
        ? { orderBy: OtpCodeGroupByArgs['orderBy'] }
        : { orderBy?: OtpCodeGroupByArgs['orderBy'] },
      OrderFields extends ExcludeUnderscoreKeys<Keys<MaybeTupleToUnion<T['orderBy']>>>,
      ByFields extends MaybeTupleToUnion<T['by']>,
      ByValid extends Has<ByFields, OrderFields>,
      HavingFields extends GetHavingFields<T['having']>,
      HavingValid extends Has<ByFields, HavingFields>,
      ByEmpty extends T['by'] extends never[] ? True : False,
      InputErrors extends ByEmpty extends True
      ? `Error: "by" must not be empty.`
      : HavingValid extends False
      ? {
          [P in HavingFields]: P extends ByFields
            ? never
            : P extends string
            ? `Error: Field "${P}" used in "having" needs to be provided in "by".`
            : [
                Error,
                'Field ',
                P,
                ` in "having" needs to be provided in "by"`,
              ]
        }[HavingFields]
      : 'take' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "take", you also need to provide "orderBy"'
      : 'skip' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "skip", you also need to provide "orderBy"'
      : ByValid extends True
      ? {}
      : {
          [P in OrderFields]: P extends ByFields
            ? never
            : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
        }[OrderFields]
    >(args: SubsetIntersection<T, OtpCodeGroupByArgs, OrderByArg> & InputErrors): {} extends InputErrors ? GetOtpCodeGroupByPayload<T> : Prisma.PrismaPromise<InputErrors>
  /**
   * Fields of the OtpCode model
   */
  readonly fields: OtpCodeFieldRefs;
  }

  /**
   * The delegate class that acts as a "Promise-like" for OtpCode.
   * Why is this prefixed with `Prisma__`?
   * Because we want to prevent naming conflicts as mentioned in
   * https://github.com/prisma/prisma-client-js/issues/707
   */
  export interface Prisma__OtpCodeClient<T, Null = never, ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> extends Prisma.PrismaPromise<T> {
    readonly [Symbol.toStringTag]: "PrismaPromise"
    /**
     * Attaches callbacks for the resolution and/or rejection of the Promise.
     * @param onfulfilled The callback to execute when the Promise is resolved.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of which ever callback is executed.
     */
    then<TResult1 = T, TResult2 = never>(onfulfilled?: ((value: T) => TResult1 | PromiseLike<TResult1>) | undefined | null, onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | undefined | null): $Utils.JsPromise<TResult1 | TResult2>
    /**
     * Attaches a callback for only the rejection of the Promise.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of the callback.
     */
    catch<TResult = never>(onrejected?: ((reason: any) => TResult | PromiseLike<TResult>) | undefined | null): $Utils.JsPromise<T | TResult>
    /**
     * Attaches a callback that is invoked when the Promise is settled (fulfilled or rejected). The
     * resolved value cannot be modified from the callback.
     * @param onfinally The callback to execute when the Promise is settled (fulfilled or rejected).
     * @returns A Promise for the completion of the callback.
     */
    finally(onfinally?: (() => void) | undefined | null): $Utils.JsPromise<T>
  }




  /**
   * Fields of the OtpCode model
   */
  interface OtpCodeFieldRefs {
    readonly id: FieldRef<"OtpCode", 'String'>
    readonly phone: FieldRef<"OtpCode", 'String'>
    readonly code: FieldRef<"OtpCode", 'String'>
    readonly hash: FieldRef<"OtpCode", 'String'>
    readonly expiresAt: FieldRef<"OtpCode", 'DateTime'>
    readonly used: FieldRef<"OtpCode", 'Boolean'>
    readonly attempts: FieldRef<"OtpCode", 'Int'>
    readonly createdAt: FieldRef<"OtpCode", 'DateTime'>
  }
    

  // Custom InputTypes
  /**
   * OtpCode findUnique
   */
  export type OtpCodeFindUniqueArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the OtpCode
     */
    select?: OtpCodeSelect<ExtArgs> | null
    /**
     * Omit specific fields from the OtpCode
     */
    omit?: OtpCodeOmit<ExtArgs> | null
    /**
     * Filter, which OtpCode to fetch.
     */
    where: OtpCodeWhereUniqueInput
  }

  /**
   * OtpCode findUniqueOrThrow
   */
  export type OtpCodeFindUniqueOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the OtpCode
     */
    select?: OtpCodeSelect<ExtArgs> | null
    /**
     * Omit specific fields from the OtpCode
     */
    omit?: OtpCodeOmit<ExtArgs> | null
    /**
     * Filter, which OtpCode to fetch.
     */
    where: OtpCodeWhereUniqueInput
  }

  /**
   * OtpCode findFirst
   */
  export type OtpCodeFindFirstArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the OtpCode
     */
    select?: OtpCodeSelect<ExtArgs> | null
    /**
     * Omit specific fields from the OtpCode
     */
    omit?: OtpCodeOmit<ExtArgs> | null
    /**
     * Filter, which OtpCode to fetch.
     */
    where?: OtpCodeWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of OtpCodes to fetch.
     */
    orderBy?: OtpCodeOrderByWithRelationInput | OtpCodeOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for OtpCodes.
     */
    cursor?: OtpCodeWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` OtpCodes from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` OtpCodes.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of OtpCodes.
     */
    distinct?: OtpCodeScalarFieldEnum | OtpCodeScalarFieldEnum[]
  }

  /**
   * OtpCode findFirstOrThrow
   */
  export type OtpCodeFindFirstOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the OtpCode
     */
    select?: OtpCodeSelect<ExtArgs> | null
    /**
     * Omit specific fields from the OtpCode
     */
    omit?: OtpCodeOmit<ExtArgs> | null
    /**
     * Filter, which OtpCode to fetch.
     */
    where?: OtpCodeWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of OtpCodes to fetch.
     */
    orderBy?: OtpCodeOrderByWithRelationInput | OtpCodeOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for OtpCodes.
     */
    cursor?: OtpCodeWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` OtpCodes from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` OtpCodes.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of OtpCodes.
     */
    distinct?: OtpCodeScalarFieldEnum | OtpCodeScalarFieldEnum[]
  }

  /**
   * OtpCode findMany
   */
  export type OtpCodeFindManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the OtpCode
     */
    select?: OtpCodeSelect<ExtArgs> | null
    /**
     * Omit specific fields from the OtpCode
     */
    omit?: OtpCodeOmit<ExtArgs> | null
    /**
     * Filter, which OtpCodes to fetch.
     */
    where?: OtpCodeWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of OtpCodes to fetch.
     */
    orderBy?: OtpCodeOrderByWithRelationInput | OtpCodeOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for listing OtpCodes.
     */
    cursor?: OtpCodeWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` OtpCodes from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` OtpCodes.
     */
    skip?: number
    distinct?: OtpCodeScalarFieldEnum | OtpCodeScalarFieldEnum[]
  }

  /**
   * OtpCode create
   */
  export type OtpCodeCreateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the OtpCode
     */
    select?: OtpCodeSelect<ExtArgs> | null
    /**
     * Omit specific fields from the OtpCode
     */
    omit?: OtpCodeOmit<ExtArgs> | null
    /**
     * The data needed to create a OtpCode.
     */
    data: XOR<OtpCodeCreateInput, OtpCodeUncheckedCreateInput>
  }

  /**
   * OtpCode createMany
   */
  export type OtpCodeCreateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to create many OtpCodes.
     */
    data: OtpCodeCreateManyInput | OtpCodeCreateManyInput[]
  }

  /**
   * OtpCode createManyAndReturn
   */
  export type OtpCodeCreateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the OtpCode
     */
    select?: OtpCodeSelectCreateManyAndReturn<ExtArgs> | null
    /**
     * Omit specific fields from the OtpCode
     */
    omit?: OtpCodeOmit<ExtArgs> | null
    /**
     * The data used to create many OtpCodes.
     */
    data: OtpCodeCreateManyInput | OtpCodeCreateManyInput[]
  }

  /**
   * OtpCode update
   */
  export type OtpCodeUpdateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the OtpCode
     */
    select?: OtpCodeSelect<ExtArgs> | null
    /**
     * Omit specific fields from the OtpCode
     */
    omit?: OtpCodeOmit<ExtArgs> | null
    /**
     * The data needed to update a OtpCode.
     */
    data: XOR<OtpCodeUpdateInput, OtpCodeUncheckedUpdateInput>
    /**
     * Choose, which OtpCode to update.
     */
    where: OtpCodeWhereUniqueInput
  }

  /**
   * OtpCode updateMany
   */
  export type OtpCodeUpdateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to update OtpCodes.
     */
    data: XOR<OtpCodeUpdateManyMutationInput, OtpCodeUncheckedUpdateManyInput>
    /**
     * Filter which OtpCodes to update
     */
    where?: OtpCodeWhereInput
    /**
     * Limit how many OtpCodes to update.
     */
    limit?: number
  }

  /**
   * OtpCode updateManyAndReturn
   */
  export type OtpCodeUpdateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the OtpCode
     */
    select?: OtpCodeSelectUpdateManyAndReturn<ExtArgs> | null
    /**
     * Omit specific fields from the OtpCode
     */
    omit?: OtpCodeOmit<ExtArgs> | null
    /**
     * The data used to update OtpCodes.
     */
    data: XOR<OtpCodeUpdateManyMutationInput, OtpCodeUncheckedUpdateManyInput>
    /**
     * Filter which OtpCodes to update
     */
    where?: OtpCodeWhereInput
    /**
     * Limit how many OtpCodes to update.
     */
    limit?: number
  }

  /**
   * OtpCode upsert
   */
  export type OtpCodeUpsertArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the OtpCode
     */
    select?: OtpCodeSelect<ExtArgs> | null
    /**
     * Omit specific fields from the OtpCode
     */
    omit?: OtpCodeOmit<ExtArgs> | null
    /**
     * The filter to search for the OtpCode to update in case it exists.
     */
    where: OtpCodeWhereUniqueInput
    /**
     * In case the OtpCode found by the `where` argument doesn't exist, create a new OtpCode with this data.
     */
    create: XOR<OtpCodeCreateInput, OtpCodeUncheckedCreateInput>
    /**
     * In case the OtpCode was found with the provided `where` argument, update it with this data.
     */
    update: XOR<OtpCodeUpdateInput, OtpCodeUncheckedUpdateInput>
  }

  /**
   * OtpCode delete
   */
  export type OtpCodeDeleteArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the OtpCode
     */
    select?: OtpCodeSelect<ExtArgs> | null
    /**
     * Omit specific fields from the OtpCode
     */
    omit?: OtpCodeOmit<ExtArgs> | null
    /**
     * Filter which OtpCode to delete.
     */
    where: OtpCodeWhereUniqueInput
  }

  /**
   * OtpCode deleteMany
   */
  export type OtpCodeDeleteManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which OtpCodes to delete
     */
    where?: OtpCodeWhereInput
    /**
     * Limit how many OtpCodes to delete.
     */
    limit?: number
  }

  /**
   * OtpCode without action
   */
  export type OtpCodeDefaultArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the OtpCode
     */
    select?: OtpCodeSelect<ExtArgs> | null
    /**
     * Omit specific fields from the OtpCode
     */
    omit?: OtpCodeOmit<ExtArgs> | null
  }


  /**
   * Model Session
   */

  export type AggregateSession = {
    _count: SessionCountAggregateOutputType | null
    _min: SessionMinAggregateOutputType | null
    _max: SessionMaxAggregateOutputType | null
  }

  export type SessionMinAggregateOutputType = {
    id: string | null
    token: string | null
    userId: string | null
    studioId: string | null
    role: string | null
    expiresAt: Date | null
    createdAt: Date | null
  }

  export type SessionMaxAggregateOutputType = {
    id: string | null
    token: string | null
    userId: string | null
    studioId: string | null
    role: string | null
    expiresAt: Date | null
    createdAt: Date | null
  }

  export type SessionCountAggregateOutputType = {
    id: number
    token: number
    userId: number
    studioId: number
    role: number
    expiresAt: number
    createdAt: number
    _all: number
  }


  export type SessionMinAggregateInputType = {
    id?: true
    token?: true
    userId?: true
    studioId?: true
    role?: true
    expiresAt?: true
    createdAt?: true
  }

  export type SessionMaxAggregateInputType = {
    id?: true
    token?: true
    userId?: true
    studioId?: true
    role?: true
    expiresAt?: true
    createdAt?: true
  }

  export type SessionCountAggregateInputType = {
    id?: true
    token?: true
    userId?: true
    studioId?: true
    role?: true
    expiresAt?: true
    createdAt?: true
    _all?: true
  }

  export type SessionAggregateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which Session to aggregate.
     */
    where?: SessionWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Sessions to fetch.
     */
    orderBy?: SessionOrderByWithRelationInput | SessionOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the start position
     */
    cursor?: SessionWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Sessions from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Sessions.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Count returned Sessions
    **/
    _count?: true | SessionCountAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the minimum value
    **/
    _min?: SessionMinAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the maximum value
    **/
    _max?: SessionMaxAggregateInputType
  }

  export type GetSessionAggregateType<T extends SessionAggregateArgs> = {
        [P in keyof T & keyof AggregateSession]: P extends '_count' | 'count'
      ? T[P] extends true
        ? number
        : GetScalarType<T[P], AggregateSession[P]>
      : GetScalarType<T[P], AggregateSession[P]>
  }




  export type SessionGroupByArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: SessionWhereInput
    orderBy?: SessionOrderByWithAggregationInput | SessionOrderByWithAggregationInput[]
    by: SessionScalarFieldEnum[] | SessionScalarFieldEnum
    having?: SessionScalarWhereWithAggregatesInput
    take?: number
    skip?: number
    _count?: SessionCountAggregateInputType | true
    _min?: SessionMinAggregateInputType
    _max?: SessionMaxAggregateInputType
  }

  export type SessionGroupByOutputType = {
    id: string
    token: string
    userId: string
    studioId: string | null
    role: string | null
    expiresAt: Date
    createdAt: Date
    _count: SessionCountAggregateOutputType | null
    _min: SessionMinAggregateOutputType | null
    _max: SessionMaxAggregateOutputType | null
  }

  type GetSessionGroupByPayload<T extends SessionGroupByArgs> = Prisma.PrismaPromise<
    Array<
      PickEnumerable<SessionGroupByOutputType, T['by']> &
        {
          [P in ((keyof T) & (keyof SessionGroupByOutputType))]: P extends '_count'
            ? T[P] extends boolean
              ? number
              : GetScalarType<T[P], SessionGroupByOutputType[P]>
            : GetScalarType<T[P], SessionGroupByOutputType[P]>
        }
      >
    >


  export type SessionSelect<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    token?: boolean
    userId?: boolean
    studioId?: boolean
    role?: boolean
    expiresAt?: boolean
    createdAt?: boolean
    user?: boolean | MasterUserDefaultArgs<ExtArgs>
  }, ExtArgs["result"]["session"]>

  export type SessionSelectCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    token?: boolean
    userId?: boolean
    studioId?: boolean
    role?: boolean
    expiresAt?: boolean
    createdAt?: boolean
    user?: boolean | MasterUserDefaultArgs<ExtArgs>
  }, ExtArgs["result"]["session"]>

  export type SessionSelectUpdateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    token?: boolean
    userId?: boolean
    studioId?: boolean
    role?: boolean
    expiresAt?: boolean
    createdAt?: boolean
    user?: boolean | MasterUserDefaultArgs<ExtArgs>
  }, ExtArgs["result"]["session"]>

  export type SessionSelectScalar = {
    id?: boolean
    token?: boolean
    userId?: boolean
    studioId?: boolean
    role?: boolean
    expiresAt?: boolean
    createdAt?: boolean
  }

  export type SessionOmit<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetOmit<"id" | "token" | "userId" | "studioId" | "role" | "expiresAt" | "createdAt", ExtArgs["result"]["session"]>
  export type SessionInclude<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    user?: boolean | MasterUserDefaultArgs<ExtArgs>
  }
  export type SessionIncludeCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    user?: boolean | MasterUserDefaultArgs<ExtArgs>
  }
  export type SessionIncludeUpdateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    user?: boolean | MasterUserDefaultArgs<ExtArgs>
  }

  export type $SessionPayload<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    name: "Session"
    objects: {
      user: Prisma.$MasterUserPayload<ExtArgs>
    }
    scalars: $Extensions.GetPayloadResult<{
      id: string
      token: string
      userId: string
      studioId: string | null
      role: string | null
      expiresAt: Date
      createdAt: Date
    }, ExtArgs["result"]["session"]>
    composites: {}
  }

  type SessionGetPayload<S extends boolean | null | undefined | SessionDefaultArgs> = $Result.GetResult<Prisma.$SessionPayload, S>

  type SessionCountArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> =
    Omit<SessionFindManyArgs, 'select' | 'include' | 'distinct' | 'omit'> & {
      select?: SessionCountAggregateInputType | true
    }

  export interface SessionDelegate<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> {
    [K: symbol]: { types: Prisma.TypeMap<ExtArgs>['model']['Session'], meta: { name: 'Session' } }
    /**
     * Find zero or one Session that matches the filter.
     * @param {SessionFindUniqueArgs} args - Arguments to find a Session
     * @example
     * // Get one Session
     * const session = await prisma.session.findUnique({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUnique<T extends SessionFindUniqueArgs>(args: SelectSubset<T, SessionFindUniqueArgs<ExtArgs>>): Prisma__SessionClient<$Result.GetResult<Prisma.$SessionPayload<ExtArgs>, T, "findUnique", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find one Session that matches the filter or throw an error with `error.code='P2025'`
     * if no matches were found.
     * @param {SessionFindUniqueOrThrowArgs} args - Arguments to find a Session
     * @example
     * // Get one Session
     * const session = await prisma.session.findUniqueOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUniqueOrThrow<T extends SessionFindUniqueOrThrowArgs>(args: SelectSubset<T, SessionFindUniqueOrThrowArgs<ExtArgs>>): Prisma__SessionClient<$Result.GetResult<Prisma.$SessionPayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first Session that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {SessionFindFirstArgs} args - Arguments to find a Session
     * @example
     * // Get one Session
     * const session = await prisma.session.findFirst({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirst<T extends SessionFindFirstArgs>(args?: SelectSubset<T, SessionFindFirstArgs<ExtArgs>>): Prisma__SessionClient<$Result.GetResult<Prisma.$SessionPayload<ExtArgs>, T, "findFirst", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first Session that matches the filter or
     * throw `PrismaKnownClientError` with `P2025` code if no matches were found.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {SessionFindFirstOrThrowArgs} args - Arguments to find a Session
     * @example
     * // Get one Session
     * const session = await prisma.session.findFirstOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirstOrThrow<T extends SessionFindFirstOrThrowArgs>(args?: SelectSubset<T, SessionFindFirstOrThrowArgs<ExtArgs>>): Prisma__SessionClient<$Result.GetResult<Prisma.$SessionPayload<ExtArgs>, T, "findFirstOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find zero or more Sessions that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {SessionFindManyArgs} args - Arguments to filter and select certain fields only.
     * @example
     * // Get all Sessions
     * const sessions = await prisma.session.findMany()
     * 
     * // Get first 10 Sessions
     * const sessions = await prisma.session.findMany({ take: 10 })
     * 
     * // Only select the `id`
     * const sessionWithIdOnly = await prisma.session.findMany({ select: { id: true } })
     * 
     */
    findMany<T extends SessionFindManyArgs>(args?: SelectSubset<T, SessionFindManyArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$SessionPayload<ExtArgs>, T, "findMany", GlobalOmitOptions>>

    /**
     * Create a Session.
     * @param {SessionCreateArgs} args - Arguments to create a Session.
     * @example
     * // Create one Session
     * const Session = await prisma.session.create({
     *   data: {
     *     // ... data to create a Session
     *   }
     * })
     * 
     */
    create<T extends SessionCreateArgs>(args: SelectSubset<T, SessionCreateArgs<ExtArgs>>): Prisma__SessionClient<$Result.GetResult<Prisma.$SessionPayload<ExtArgs>, T, "create", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Create many Sessions.
     * @param {SessionCreateManyArgs} args - Arguments to create many Sessions.
     * @example
     * // Create many Sessions
     * const session = await prisma.session.createMany({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     *     
     */
    createMany<T extends SessionCreateManyArgs>(args?: SelectSubset<T, SessionCreateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Create many Sessions and returns the data saved in the database.
     * @param {SessionCreateManyAndReturnArgs} args - Arguments to create many Sessions.
     * @example
     * // Create many Sessions
     * const session = await prisma.session.createManyAndReturn({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Create many Sessions and only return the `id`
     * const sessionWithIdOnly = await prisma.session.createManyAndReturn({
     *   select: { id: true },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    createManyAndReturn<T extends SessionCreateManyAndReturnArgs>(args?: SelectSubset<T, SessionCreateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$SessionPayload<ExtArgs>, T, "createManyAndReturn", GlobalOmitOptions>>

    /**
     * Delete a Session.
     * @param {SessionDeleteArgs} args - Arguments to delete one Session.
     * @example
     * // Delete one Session
     * const Session = await prisma.session.delete({
     *   where: {
     *     // ... filter to delete one Session
     *   }
     * })
     * 
     */
    delete<T extends SessionDeleteArgs>(args: SelectSubset<T, SessionDeleteArgs<ExtArgs>>): Prisma__SessionClient<$Result.GetResult<Prisma.$SessionPayload<ExtArgs>, T, "delete", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Update one Session.
     * @param {SessionUpdateArgs} args - Arguments to update one Session.
     * @example
     * // Update one Session
     * const session = await prisma.session.update({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    update<T extends SessionUpdateArgs>(args: SelectSubset<T, SessionUpdateArgs<ExtArgs>>): Prisma__SessionClient<$Result.GetResult<Prisma.$SessionPayload<ExtArgs>, T, "update", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Delete zero or more Sessions.
     * @param {SessionDeleteManyArgs} args - Arguments to filter Sessions to delete.
     * @example
     * // Delete a few Sessions
     * const { count } = await prisma.session.deleteMany({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     * 
     */
    deleteMany<T extends SessionDeleteManyArgs>(args?: SelectSubset<T, SessionDeleteManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more Sessions.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {SessionUpdateManyArgs} args - Arguments to update one or more rows.
     * @example
     * // Update many Sessions
     * const session = await prisma.session.updateMany({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    updateMany<T extends SessionUpdateManyArgs>(args: SelectSubset<T, SessionUpdateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more Sessions and returns the data updated in the database.
     * @param {SessionUpdateManyAndReturnArgs} args - Arguments to update many Sessions.
     * @example
     * // Update many Sessions
     * const session = await prisma.session.updateManyAndReturn({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Update zero or more Sessions and only return the `id`
     * const sessionWithIdOnly = await prisma.session.updateManyAndReturn({
     *   select: { id: true },
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    updateManyAndReturn<T extends SessionUpdateManyAndReturnArgs>(args: SelectSubset<T, SessionUpdateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$SessionPayload<ExtArgs>, T, "updateManyAndReturn", GlobalOmitOptions>>

    /**
     * Create or update one Session.
     * @param {SessionUpsertArgs} args - Arguments to update or create a Session.
     * @example
     * // Update or create a Session
     * const session = await prisma.session.upsert({
     *   create: {
     *     // ... data to create a Session
     *   },
     *   update: {
     *     // ... in case it already exists, update
     *   },
     *   where: {
     *     // ... the filter for the Session we want to update
     *   }
     * })
     */
    upsert<T extends SessionUpsertArgs>(args: SelectSubset<T, SessionUpsertArgs<ExtArgs>>): Prisma__SessionClient<$Result.GetResult<Prisma.$SessionPayload<ExtArgs>, T, "upsert", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>


    /**
     * Count the number of Sessions.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {SessionCountArgs} args - Arguments to filter Sessions to count.
     * @example
     * // Count the number of Sessions
     * const count = await prisma.session.count({
     *   where: {
     *     // ... the filter for the Sessions we want to count
     *   }
     * })
    **/
    count<T extends SessionCountArgs>(
      args?: Subset<T, SessionCountArgs>,
    ): Prisma.PrismaPromise<
      T extends $Utils.Record<'select', any>
        ? T['select'] extends true
          ? number
          : GetScalarType<T['select'], SessionCountAggregateOutputType>
        : number
    >

    /**
     * Allows you to perform aggregations operations on a Session.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {SessionAggregateArgs} args - Select which aggregations you would like to apply and on what fields.
     * @example
     * // Ordered by age ascending
     * // Where email contains prisma.io
     * // Limited to the 10 users
     * const aggregations = await prisma.user.aggregate({
     *   _avg: {
     *     age: true,
     *   },
     *   where: {
     *     email: {
     *       contains: "prisma.io",
     *     },
     *   },
     *   orderBy: {
     *     age: "asc",
     *   },
     *   take: 10,
     * })
    **/
    aggregate<T extends SessionAggregateArgs>(args: Subset<T, SessionAggregateArgs>): Prisma.PrismaPromise<GetSessionAggregateType<T>>

    /**
     * Group by Session.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {SessionGroupByArgs} args - Group by arguments.
     * @example
     * // Group by city, order by createdAt, get count
     * const result = await prisma.user.groupBy({
     *   by: ['city', 'createdAt'],
     *   orderBy: {
     *     createdAt: true
     *   },
     *   _count: {
     *     _all: true
     *   },
     * })
     * 
    **/
    groupBy<
      T extends SessionGroupByArgs,
      HasSelectOrTake extends Or<
        Extends<'skip', Keys<T>>,
        Extends<'take', Keys<T>>
      >,
      OrderByArg extends True extends HasSelectOrTake
        ? { orderBy: SessionGroupByArgs['orderBy'] }
        : { orderBy?: SessionGroupByArgs['orderBy'] },
      OrderFields extends ExcludeUnderscoreKeys<Keys<MaybeTupleToUnion<T['orderBy']>>>,
      ByFields extends MaybeTupleToUnion<T['by']>,
      ByValid extends Has<ByFields, OrderFields>,
      HavingFields extends GetHavingFields<T['having']>,
      HavingValid extends Has<ByFields, HavingFields>,
      ByEmpty extends T['by'] extends never[] ? True : False,
      InputErrors extends ByEmpty extends True
      ? `Error: "by" must not be empty.`
      : HavingValid extends False
      ? {
          [P in HavingFields]: P extends ByFields
            ? never
            : P extends string
            ? `Error: Field "${P}" used in "having" needs to be provided in "by".`
            : [
                Error,
                'Field ',
                P,
                ` in "having" needs to be provided in "by"`,
              ]
        }[HavingFields]
      : 'take' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "take", you also need to provide "orderBy"'
      : 'skip' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "skip", you also need to provide "orderBy"'
      : ByValid extends True
      ? {}
      : {
          [P in OrderFields]: P extends ByFields
            ? never
            : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
        }[OrderFields]
    >(args: SubsetIntersection<T, SessionGroupByArgs, OrderByArg> & InputErrors): {} extends InputErrors ? GetSessionGroupByPayload<T> : Prisma.PrismaPromise<InputErrors>
  /**
   * Fields of the Session model
   */
  readonly fields: SessionFieldRefs;
  }

  /**
   * The delegate class that acts as a "Promise-like" for Session.
   * Why is this prefixed with `Prisma__`?
   * Because we want to prevent naming conflicts as mentioned in
   * https://github.com/prisma/prisma-client-js/issues/707
   */
  export interface Prisma__SessionClient<T, Null = never, ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> extends Prisma.PrismaPromise<T> {
    readonly [Symbol.toStringTag]: "PrismaPromise"
    user<T extends MasterUserDefaultArgs<ExtArgs> = {}>(args?: Subset<T, MasterUserDefaultArgs<ExtArgs>>): Prisma__MasterUserClient<$Result.GetResult<Prisma.$MasterUserPayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions> | Null, Null, ExtArgs, GlobalOmitOptions>
    /**
     * Attaches callbacks for the resolution and/or rejection of the Promise.
     * @param onfulfilled The callback to execute when the Promise is resolved.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of which ever callback is executed.
     */
    then<TResult1 = T, TResult2 = never>(onfulfilled?: ((value: T) => TResult1 | PromiseLike<TResult1>) | undefined | null, onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | undefined | null): $Utils.JsPromise<TResult1 | TResult2>
    /**
     * Attaches a callback for only the rejection of the Promise.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of the callback.
     */
    catch<TResult = never>(onrejected?: ((reason: any) => TResult | PromiseLike<TResult>) | undefined | null): $Utils.JsPromise<T | TResult>
    /**
     * Attaches a callback that is invoked when the Promise is settled (fulfilled or rejected). The
     * resolved value cannot be modified from the callback.
     * @param onfinally The callback to execute when the Promise is settled (fulfilled or rejected).
     * @returns A Promise for the completion of the callback.
     */
    finally(onfinally?: (() => void) | undefined | null): $Utils.JsPromise<T>
  }




  /**
   * Fields of the Session model
   */
  interface SessionFieldRefs {
    readonly id: FieldRef<"Session", 'String'>
    readonly token: FieldRef<"Session", 'String'>
    readonly userId: FieldRef<"Session", 'String'>
    readonly studioId: FieldRef<"Session", 'String'>
    readonly role: FieldRef<"Session", 'String'>
    readonly expiresAt: FieldRef<"Session", 'DateTime'>
    readonly createdAt: FieldRef<"Session", 'DateTime'>
  }
    

  // Custom InputTypes
  /**
   * Session findUnique
   */
  export type SessionFindUniqueArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Session
     */
    select?: SessionSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Session
     */
    omit?: SessionOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: SessionInclude<ExtArgs> | null
    /**
     * Filter, which Session to fetch.
     */
    where: SessionWhereUniqueInput
  }

  /**
   * Session findUniqueOrThrow
   */
  export type SessionFindUniqueOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Session
     */
    select?: SessionSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Session
     */
    omit?: SessionOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: SessionInclude<ExtArgs> | null
    /**
     * Filter, which Session to fetch.
     */
    where: SessionWhereUniqueInput
  }

  /**
   * Session findFirst
   */
  export type SessionFindFirstArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Session
     */
    select?: SessionSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Session
     */
    omit?: SessionOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: SessionInclude<ExtArgs> | null
    /**
     * Filter, which Session to fetch.
     */
    where?: SessionWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Sessions to fetch.
     */
    orderBy?: SessionOrderByWithRelationInput | SessionOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for Sessions.
     */
    cursor?: SessionWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Sessions from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Sessions.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of Sessions.
     */
    distinct?: SessionScalarFieldEnum | SessionScalarFieldEnum[]
  }

  /**
   * Session findFirstOrThrow
   */
  export type SessionFindFirstOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Session
     */
    select?: SessionSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Session
     */
    omit?: SessionOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: SessionInclude<ExtArgs> | null
    /**
     * Filter, which Session to fetch.
     */
    where?: SessionWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Sessions to fetch.
     */
    orderBy?: SessionOrderByWithRelationInput | SessionOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for Sessions.
     */
    cursor?: SessionWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Sessions from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Sessions.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of Sessions.
     */
    distinct?: SessionScalarFieldEnum | SessionScalarFieldEnum[]
  }

  /**
   * Session findMany
   */
  export type SessionFindManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Session
     */
    select?: SessionSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Session
     */
    omit?: SessionOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: SessionInclude<ExtArgs> | null
    /**
     * Filter, which Sessions to fetch.
     */
    where?: SessionWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Sessions to fetch.
     */
    orderBy?: SessionOrderByWithRelationInput | SessionOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for listing Sessions.
     */
    cursor?: SessionWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Sessions from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Sessions.
     */
    skip?: number
    distinct?: SessionScalarFieldEnum | SessionScalarFieldEnum[]
  }

  /**
   * Session create
   */
  export type SessionCreateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Session
     */
    select?: SessionSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Session
     */
    omit?: SessionOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: SessionInclude<ExtArgs> | null
    /**
     * The data needed to create a Session.
     */
    data: XOR<SessionCreateInput, SessionUncheckedCreateInput>
  }

  /**
   * Session createMany
   */
  export type SessionCreateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to create many Sessions.
     */
    data: SessionCreateManyInput | SessionCreateManyInput[]
  }

  /**
   * Session createManyAndReturn
   */
  export type SessionCreateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Session
     */
    select?: SessionSelectCreateManyAndReturn<ExtArgs> | null
    /**
     * Omit specific fields from the Session
     */
    omit?: SessionOmit<ExtArgs> | null
    /**
     * The data used to create many Sessions.
     */
    data: SessionCreateManyInput | SessionCreateManyInput[]
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: SessionIncludeCreateManyAndReturn<ExtArgs> | null
  }

  /**
   * Session update
   */
  export type SessionUpdateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Session
     */
    select?: SessionSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Session
     */
    omit?: SessionOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: SessionInclude<ExtArgs> | null
    /**
     * The data needed to update a Session.
     */
    data: XOR<SessionUpdateInput, SessionUncheckedUpdateInput>
    /**
     * Choose, which Session to update.
     */
    where: SessionWhereUniqueInput
  }

  /**
   * Session updateMany
   */
  export type SessionUpdateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to update Sessions.
     */
    data: XOR<SessionUpdateManyMutationInput, SessionUncheckedUpdateManyInput>
    /**
     * Filter which Sessions to update
     */
    where?: SessionWhereInput
    /**
     * Limit how many Sessions to update.
     */
    limit?: number
  }

  /**
   * Session updateManyAndReturn
   */
  export type SessionUpdateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Session
     */
    select?: SessionSelectUpdateManyAndReturn<ExtArgs> | null
    /**
     * Omit specific fields from the Session
     */
    omit?: SessionOmit<ExtArgs> | null
    /**
     * The data used to update Sessions.
     */
    data: XOR<SessionUpdateManyMutationInput, SessionUncheckedUpdateManyInput>
    /**
     * Filter which Sessions to update
     */
    where?: SessionWhereInput
    /**
     * Limit how many Sessions to update.
     */
    limit?: number
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: SessionIncludeUpdateManyAndReturn<ExtArgs> | null
  }

  /**
   * Session upsert
   */
  export type SessionUpsertArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Session
     */
    select?: SessionSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Session
     */
    omit?: SessionOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: SessionInclude<ExtArgs> | null
    /**
     * The filter to search for the Session to update in case it exists.
     */
    where: SessionWhereUniqueInput
    /**
     * In case the Session found by the `where` argument doesn't exist, create a new Session with this data.
     */
    create: XOR<SessionCreateInput, SessionUncheckedCreateInput>
    /**
     * In case the Session was found with the provided `where` argument, update it with this data.
     */
    update: XOR<SessionUpdateInput, SessionUncheckedUpdateInput>
  }

  /**
   * Session delete
   */
  export type SessionDeleteArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Session
     */
    select?: SessionSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Session
     */
    omit?: SessionOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: SessionInclude<ExtArgs> | null
    /**
     * Filter which Session to delete.
     */
    where: SessionWhereUniqueInput
  }

  /**
   * Session deleteMany
   */
  export type SessionDeleteManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which Sessions to delete
     */
    where?: SessionWhereInput
    /**
     * Limit how many Sessions to delete.
     */
    limit?: number
  }

  /**
   * Session without action
   */
  export type SessionDefaultArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Session
     */
    select?: SessionSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Session
     */
    omit?: SessionOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: SessionInclude<ExtArgs> | null
  }


  /**
   * Enums
   */

  export const TransactionIsolationLevel: {
    Serializable: 'Serializable'
  };

  export type TransactionIsolationLevel = (typeof TransactionIsolationLevel)[keyof typeof TransactionIsolationLevel]


  export const StudioScalarFieldEnum: {
    id: 'id',
    name: 'name',
    nameEn: 'nameEn',
    dbName: 'dbName',
    isActive: 'isActive',
    plan: 'plan',
    storageQuotaBytes: 'storageQuotaBytes',
    storageUsedBytes: 'storageUsedBytes',
    createdAt: 'createdAt',
    updatedAt: 'updatedAt'
  };

  export type StudioScalarFieldEnum = (typeof StudioScalarFieldEnum)[keyof typeof StudioScalarFieldEnum]


  export const MasterUserScalarFieldEnum: {
    id: 'id',
    phone: 'phone',
    passwordHash: 'passwordHash',
    name: 'name',
    createdAt: 'createdAt',
    updatedAt: 'updatedAt'
  };

  export type MasterUserScalarFieldEnum = (typeof MasterUserScalarFieldEnum)[keyof typeof MasterUserScalarFieldEnum]


  export const StudioMembershipScalarFieldEnum: {
    id: 'id',
    userId: 'userId',
    studioId: 'studioId',
    role: 'role',
    isActive: 'isActive',
    createdAt: 'createdAt'
  };

  export type StudioMembershipScalarFieldEnum = (typeof StudioMembershipScalarFieldEnum)[keyof typeof StudioMembershipScalarFieldEnum]


  export const OtpCodeScalarFieldEnum: {
    id: 'id',
    phone: 'phone',
    code: 'code',
    hash: 'hash',
    expiresAt: 'expiresAt',
    used: 'used',
    attempts: 'attempts',
    createdAt: 'createdAt'
  };

  export type OtpCodeScalarFieldEnum = (typeof OtpCodeScalarFieldEnum)[keyof typeof OtpCodeScalarFieldEnum]


  export const SessionScalarFieldEnum: {
    id: 'id',
    token: 'token',
    userId: 'userId',
    studioId: 'studioId',
    role: 'role',
    expiresAt: 'expiresAt',
    createdAt: 'createdAt'
  };

  export type SessionScalarFieldEnum = (typeof SessionScalarFieldEnum)[keyof typeof SessionScalarFieldEnum]


  export const SortOrder: {
    asc: 'asc',
    desc: 'desc'
  };

  export type SortOrder = (typeof SortOrder)[keyof typeof SortOrder]


  export const NullsOrder: {
    first: 'first',
    last: 'last'
  };

  export type NullsOrder = (typeof NullsOrder)[keyof typeof NullsOrder]


  /**
   * Field references
   */


  /**
   * Reference to a field of type 'String'
   */
  export type StringFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'String'>
    


  /**
   * Reference to a field of type 'Boolean'
   */
  export type BooleanFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'Boolean'>
    


  /**
   * Reference to a field of type 'BigInt'
   */
  export type BigIntFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'BigInt'>
    


  /**
   * Reference to a field of type 'DateTime'
   */
  export type DateTimeFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'DateTime'>
    


  /**
   * Reference to a field of type 'Int'
   */
  export type IntFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'Int'>
    


  /**
   * Reference to a field of type 'Float'
   */
  export type FloatFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'Float'>
    
  /**
   * Deep Input Types
   */


  export type StudioWhereInput = {
    AND?: StudioWhereInput | StudioWhereInput[]
    OR?: StudioWhereInput[]
    NOT?: StudioWhereInput | StudioWhereInput[]
    id?: StringFilter<"Studio"> | string
    name?: StringFilter<"Studio"> | string
    nameEn?: StringNullableFilter<"Studio"> | string | null
    dbName?: StringFilter<"Studio"> | string
    isActive?: BoolFilter<"Studio"> | boolean
    plan?: StringFilter<"Studio"> | string
    storageQuotaBytes?: BigIntFilter<"Studio"> | bigint | number
    storageUsedBytes?: BigIntFilter<"Studio"> | bigint | number
    createdAt?: DateTimeFilter<"Studio"> | Date | string
    updatedAt?: DateTimeFilter<"Studio"> | Date | string
    memberships?: StudioMembershipListRelationFilter
  }

  export type StudioOrderByWithRelationInput = {
    id?: SortOrder
    name?: SortOrder
    nameEn?: SortOrderInput | SortOrder
    dbName?: SortOrder
    isActive?: SortOrder
    plan?: SortOrder
    storageQuotaBytes?: SortOrder
    storageUsedBytes?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
    memberships?: StudioMembershipOrderByRelationAggregateInput
  }

  export type StudioWhereUniqueInput = Prisma.AtLeast<{
    id?: string
    dbName?: string
    AND?: StudioWhereInput | StudioWhereInput[]
    OR?: StudioWhereInput[]
    NOT?: StudioWhereInput | StudioWhereInput[]
    name?: StringFilter<"Studio"> | string
    nameEn?: StringNullableFilter<"Studio"> | string | null
    isActive?: BoolFilter<"Studio"> | boolean
    plan?: StringFilter<"Studio"> | string
    storageQuotaBytes?: BigIntFilter<"Studio"> | bigint | number
    storageUsedBytes?: BigIntFilter<"Studio"> | bigint | number
    createdAt?: DateTimeFilter<"Studio"> | Date | string
    updatedAt?: DateTimeFilter<"Studio"> | Date | string
    memberships?: StudioMembershipListRelationFilter
  }, "id" | "dbName">

  export type StudioOrderByWithAggregationInput = {
    id?: SortOrder
    name?: SortOrder
    nameEn?: SortOrderInput | SortOrder
    dbName?: SortOrder
    isActive?: SortOrder
    plan?: SortOrder
    storageQuotaBytes?: SortOrder
    storageUsedBytes?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
    _count?: StudioCountOrderByAggregateInput
    _avg?: StudioAvgOrderByAggregateInput
    _max?: StudioMaxOrderByAggregateInput
    _min?: StudioMinOrderByAggregateInput
    _sum?: StudioSumOrderByAggregateInput
  }

  export type StudioScalarWhereWithAggregatesInput = {
    AND?: StudioScalarWhereWithAggregatesInput | StudioScalarWhereWithAggregatesInput[]
    OR?: StudioScalarWhereWithAggregatesInput[]
    NOT?: StudioScalarWhereWithAggregatesInput | StudioScalarWhereWithAggregatesInput[]
    id?: StringWithAggregatesFilter<"Studio"> | string
    name?: StringWithAggregatesFilter<"Studio"> | string
    nameEn?: StringNullableWithAggregatesFilter<"Studio"> | string | null
    dbName?: StringWithAggregatesFilter<"Studio"> | string
    isActive?: BoolWithAggregatesFilter<"Studio"> | boolean
    plan?: StringWithAggregatesFilter<"Studio"> | string
    storageQuotaBytes?: BigIntWithAggregatesFilter<"Studio"> | bigint | number
    storageUsedBytes?: BigIntWithAggregatesFilter<"Studio"> | bigint | number
    createdAt?: DateTimeWithAggregatesFilter<"Studio"> | Date | string
    updatedAt?: DateTimeWithAggregatesFilter<"Studio"> | Date | string
  }

  export type MasterUserWhereInput = {
    AND?: MasterUserWhereInput | MasterUserWhereInput[]
    OR?: MasterUserWhereInput[]
    NOT?: MasterUserWhereInput | MasterUserWhereInput[]
    id?: StringFilter<"MasterUser"> | string
    phone?: StringFilter<"MasterUser"> | string
    passwordHash?: StringNullableFilter<"MasterUser"> | string | null
    name?: StringFilter<"MasterUser"> | string
    createdAt?: DateTimeFilter<"MasterUser"> | Date | string
    updatedAt?: DateTimeFilter<"MasterUser"> | Date | string
    memberships?: StudioMembershipListRelationFilter
    sessions?: SessionListRelationFilter
  }

  export type MasterUserOrderByWithRelationInput = {
    id?: SortOrder
    phone?: SortOrder
    passwordHash?: SortOrderInput | SortOrder
    name?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
    memberships?: StudioMembershipOrderByRelationAggregateInput
    sessions?: SessionOrderByRelationAggregateInput
  }

  export type MasterUserWhereUniqueInput = Prisma.AtLeast<{
    id?: string
    phone?: string
    AND?: MasterUserWhereInput | MasterUserWhereInput[]
    OR?: MasterUserWhereInput[]
    NOT?: MasterUserWhereInput | MasterUserWhereInput[]
    passwordHash?: StringNullableFilter<"MasterUser"> | string | null
    name?: StringFilter<"MasterUser"> | string
    createdAt?: DateTimeFilter<"MasterUser"> | Date | string
    updatedAt?: DateTimeFilter<"MasterUser"> | Date | string
    memberships?: StudioMembershipListRelationFilter
    sessions?: SessionListRelationFilter
  }, "id" | "phone">

  export type MasterUserOrderByWithAggregationInput = {
    id?: SortOrder
    phone?: SortOrder
    passwordHash?: SortOrderInput | SortOrder
    name?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
    _count?: MasterUserCountOrderByAggregateInput
    _max?: MasterUserMaxOrderByAggregateInput
    _min?: MasterUserMinOrderByAggregateInput
  }

  export type MasterUserScalarWhereWithAggregatesInput = {
    AND?: MasterUserScalarWhereWithAggregatesInput | MasterUserScalarWhereWithAggregatesInput[]
    OR?: MasterUserScalarWhereWithAggregatesInput[]
    NOT?: MasterUserScalarWhereWithAggregatesInput | MasterUserScalarWhereWithAggregatesInput[]
    id?: StringWithAggregatesFilter<"MasterUser"> | string
    phone?: StringWithAggregatesFilter<"MasterUser"> | string
    passwordHash?: StringNullableWithAggregatesFilter<"MasterUser"> | string | null
    name?: StringWithAggregatesFilter<"MasterUser"> | string
    createdAt?: DateTimeWithAggregatesFilter<"MasterUser"> | Date | string
    updatedAt?: DateTimeWithAggregatesFilter<"MasterUser"> | Date | string
  }

  export type StudioMembershipWhereInput = {
    AND?: StudioMembershipWhereInput | StudioMembershipWhereInput[]
    OR?: StudioMembershipWhereInput[]
    NOT?: StudioMembershipWhereInput | StudioMembershipWhereInput[]
    id?: StringFilter<"StudioMembership"> | string
    userId?: StringFilter<"StudioMembership"> | string
    studioId?: StringFilter<"StudioMembership"> | string
    role?: StringFilter<"StudioMembership"> | string
    isActive?: BoolFilter<"StudioMembership"> | boolean
    createdAt?: DateTimeFilter<"StudioMembership"> | Date | string
    user?: XOR<MasterUserScalarRelationFilter, MasterUserWhereInput>
    studio?: XOR<StudioScalarRelationFilter, StudioWhereInput>
  }

  export type StudioMembershipOrderByWithRelationInput = {
    id?: SortOrder
    userId?: SortOrder
    studioId?: SortOrder
    role?: SortOrder
    isActive?: SortOrder
    createdAt?: SortOrder
    user?: MasterUserOrderByWithRelationInput
    studio?: StudioOrderByWithRelationInput
  }

  export type StudioMembershipWhereUniqueInput = Prisma.AtLeast<{
    id?: string
    userId_studioId?: StudioMembershipUserIdStudioIdCompoundUniqueInput
    AND?: StudioMembershipWhereInput | StudioMembershipWhereInput[]
    OR?: StudioMembershipWhereInput[]
    NOT?: StudioMembershipWhereInput | StudioMembershipWhereInput[]
    userId?: StringFilter<"StudioMembership"> | string
    studioId?: StringFilter<"StudioMembership"> | string
    role?: StringFilter<"StudioMembership"> | string
    isActive?: BoolFilter<"StudioMembership"> | boolean
    createdAt?: DateTimeFilter<"StudioMembership"> | Date | string
    user?: XOR<MasterUserScalarRelationFilter, MasterUserWhereInput>
    studio?: XOR<StudioScalarRelationFilter, StudioWhereInput>
  }, "id" | "userId_studioId">

  export type StudioMembershipOrderByWithAggregationInput = {
    id?: SortOrder
    userId?: SortOrder
    studioId?: SortOrder
    role?: SortOrder
    isActive?: SortOrder
    createdAt?: SortOrder
    _count?: StudioMembershipCountOrderByAggregateInput
    _max?: StudioMembershipMaxOrderByAggregateInput
    _min?: StudioMembershipMinOrderByAggregateInput
  }

  export type StudioMembershipScalarWhereWithAggregatesInput = {
    AND?: StudioMembershipScalarWhereWithAggregatesInput | StudioMembershipScalarWhereWithAggregatesInput[]
    OR?: StudioMembershipScalarWhereWithAggregatesInput[]
    NOT?: StudioMembershipScalarWhereWithAggregatesInput | StudioMembershipScalarWhereWithAggregatesInput[]
    id?: StringWithAggregatesFilter<"StudioMembership"> | string
    userId?: StringWithAggregatesFilter<"StudioMembership"> | string
    studioId?: StringWithAggregatesFilter<"StudioMembership"> | string
    role?: StringWithAggregatesFilter<"StudioMembership"> | string
    isActive?: BoolWithAggregatesFilter<"StudioMembership"> | boolean
    createdAt?: DateTimeWithAggregatesFilter<"StudioMembership"> | Date | string
  }

  export type OtpCodeWhereInput = {
    AND?: OtpCodeWhereInput | OtpCodeWhereInput[]
    OR?: OtpCodeWhereInput[]
    NOT?: OtpCodeWhereInput | OtpCodeWhereInput[]
    id?: StringFilter<"OtpCode"> | string
    phone?: StringFilter<"OtpCode"> | string
    code?: StringFilter<"OtpCode"> | string
    hash?: StringFilter<"OtpCode"> | string
    expiresAt?: DateTimeFilter<"OtpCode"> | Date | string
    used?: BoolFilter<"OtpCode"> | boolean
    attempts?: IntFilter<"OtpCode"> | number
    createdAt?: DateTimeFilter<"OtpCode"> | Date | string
  }

  export type OtpCodeOrderByWithRelationInput = {
    id?: SortOrder
    phone?: SortOrder
    code?: SortOrder
    hash?: SortOrder
    expiresAt?: SortOrder
    used?: SortOrder
    attempts?: SortOrder
    createdAt?: SortOrder
  }

  export type OtpCodeWhereUniqueInput = Prisma.AtLeast<{
    id?: string
    AND?: OtpCodeWhereInput | OtpCodeWhereInput[]
    OR?: OtpCodeWhereInput[]
    NOT?: OtpCodeWhereInput | OtpCodeWhereInput[]
    phone?: StringFilter<"OtpCode"> | string
    code?: StringFilter<"OtpCode"> | string
    hash?: StringFilter<"OtpCode"> | string
    expiresAt?: DateTimeFilter<"OtpCode"> | Date | string
    used?: BoolFilter<"OtpCode"> | boolean
    attempts?: IntFilter<"OtpCode"> | number
    createdAt?: DateTimeFilter<"OtpCode"> | Date | string
  }, "id">

  export type OtpCodeOrderByWithAggregationInput = {
    id?: SortOrder
    phone?: SortOrder
    code?: SortOrder
    hash?: SortOrder
    expiresAt?: SortOrder
    used?: SortOrder
    attempts?: SortOrder
    createdAt?: SortOrder
    _count?: OtpCodeCountOrderByAggregateInput
    _avg?: OtpCodeAvgOrderByAggregateInput
    _max?: OtpCodeMaxOrderByAggregateInput
    _min?: OtpCodeMinOrderByAggregateInput
    _sum?: OtpCodeSumOrderByAggregateInput
  }

  export type OtpCodeScalarWhereWithAggregatesInput = {
    AND?: OtpCodeScalarWhereWithAggregatesInput | OtpCodeScalarWhereWithAggregatesInput[]
    OR?: OtpCodeScalarWhereWithAggregatesInput[]
    NOT?: OtpCodeScalarWhereWithAggregatesInput | OtpCodeScalarWhereWithAggregatesInput[]
    id?: StringWithAggregatesFilter<"OtpCode"> | string
    phone?: StringWithAggregatesFilter<"OtpCode"> | string
    code?: StringWithAggregatesFilter<"OtpCode"> | string
    hash?: StringWithAggregatesFilter<"OtpCode"> | string
    expiresAt?: DateTimeWithAggregatesFilter<"OtpCode"> | Date | string
    used?: BoolWithAggregatesFilter<"OtpCode"> | boolean
    attempts?: IntWithAggregatesFilter<"OtpCode"> | number
    createdAt?: DateTimeWithAggregatesFilter<"OtpCode"> | Date | string
  }

  export type SessionWhereInput = {
    AND?: SessionWhereInput | SessionWhereInput[]
    OR?: SessionWhereInput[]
    NOT?: SessionWhereInput | SessionWhereInput[]
    id?: StringFilter<"Session"> | string
    token?: StringFilter<"Session"> | string
    userId?: StringFilter<"Session"> | string
    studioId?: StringNullableFilter<"Session"> | string | null
    role?: StringNullableFilter<"Session"> | string | null
    expiresAt?: DateTimeFilter<"Session"> | Date | string
    createdAt?: DateTimeFilter<"Session"> | Date | string
    user?: XOR<MasterUserScalarRelationFilter, MasterUserWhereInput>
  }

  export type SessionOrderByWithRelationInput = {
    id?: SortOrder
    token?: SortOrder
    userId?: SortOrder
    studioId?: SortOrderInput | SortOrder
    role?: SortOrderInput | SortOrder
    expiresAt?: SortOrder
    createdAt?: SortOrder
    user?: MasterUserOrderByWithRelationInput
  }

  export type SessionWhereUniqueInput = Prisma.AtLeast<{
    id?: string
    token?: string
    AND?: SessionWhereInput | SessionWhereInput[]
    OR?: SessionWhereInput[]
    NOT?: SessionWhereInput | SessionWhereInput[]
    userId?: StringFilter<"Session"> | string
    studioId?: StringNullableFilter<"Session"> | string | null
    role?: StringNullableFilter<"Session"> | string | null
    expiresAt?: DateTimeFilter<"Session"> | Date | string
    createdAt?: DateTimeFilter<"Session"> | Date | string
    user?: XOR<MasterUserScalarRelationFilter, MasterUserWhereInput>
  }, "id" | "token">

  export type SessionOrderByWithAggregationInput = {
    id?: SortOrder
    token?: SortOrder
    userId?: SortOrder
    studioId?: SortOrderInput | SortOrder
    role?: SortOrderInput | SortOrder
    expiresAt?: SortOrder
    createdAt?: SortOrder
    _count?: SessionCountOrderByAggregateInput
    _max?: SessionMaxOrderByAggregateInput
    _min?: SessionMinOrderByAggregateInput
  }

  export type SessionScalarWhereWithAggregatesInput = {
    AND?: SessionScalarWhereWithAggregatesInput | SessionScalarWhereWithAggregatesInput[]
    OR?: SessionScalarWhereWithAggregatesInput[]
    NOT?: SessionScalarWhereWithAggregatesInput | SessionScalarWhereWithAggregatesInput[]
    id?: StringWithAggregatesFilter<"Session"> | string
    token?: StringWithAggregatesFilter<"Session"> | string
    userId?: StringWithAggregatesFilter<"Session"> | string
    studioId?: StringNullableWithAggregatesFilter<"Session"> | string | null
    role?: StringNullableWithAggregatesFilter<"Session"> | string | null
    expiresAt?: DateTimeWithAggregatesFilter<"Session"> | Date | string
    createdAt?: DateTimeWithAggregatesFilter<"Session"> | Date | string
  }

  export type StudioCreateInput = {
    id?: string
    name: string
    nameEn?: string | null
    dbName: string
    isActive?: boolean
    plan?: string
    storageQuotaBytes?: bigint | number
    storageUsedBytes?: bigint | number
    createdAt?: Date | string
    updatedAt?: Date | string
    memberships?: StudioMembershipCreateNestedManyWithoutStudioInput
  }

  export type StudioUncheckedCreateInput = {
    id?: string
    name: string
    nameEn?: string | null
    dbName: string
    isActive?: boolean
    plan?: string
    storageQuotaBytes?: bigint | number
    storageUsedBytes?: bigint | number
    createdAt?: Date | string
    updatedAt?: Date | string
    memberships?: StudioMembershipUncheckedCreateNestedManyWithoutStudioInput
  }

  export type StudioUpdateInput = {
    id?: StringFieldUpdateOperationsInput | string
    name?: StringFieldUpdateOperationsInput | string
    nameEn?: NullableStringFieldUpdateOperationsInput | string | null
    dbName?: StringFieldUpdateOperationsInput | string
    isActive?: BoolFieldUpdateOperationsInput | boolean
    plan?: StringFieldUpdateOperationsInput | string
    storageQuotaBytes?: BigIntFieldUpdateOperationsInput | bigint | number
    storageUsedBytes?: BigIntFieldUpdateOperationsInput | bigint | number
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    memberships?: StudioMembershipUpdateManyWithoutStudioNestedInput
  }

  export type StudioUncheckedUpdateInput = {
    id?: StringFieldUpdateOperationsInput | string
    name?: StringFieldUpdateOperationsInput | string
    nameEn?: NullableStringFieldUpdateOperationsInput | string | null
    dbName?: StringFieldUpdateOperationsInput | string
    isActive?: BoolFieldUpdateOperationsInput | boolean
    plan?: StringFieldUpdateOperationsInput | string
    storageQuotaBytes?: BigIntFieldUpdateOperationsInput | bigint | number
    storageUsedBytes?: BigIntFieldUpdateOperationsInput | bigint | number
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    memberships?: StudioMembershipUncheckedUpdateManyWithoutStudioNestedInput
  }

  export type StudioCreateManyInput = {
    id?: string
    name: string
    nameEn?: string | null
    dbName: string
    isActive?: boolean
    plan?: string
    storageQuotaBytes?: bigint | number
    storageUsedBytes?: bigint | number
    createdAt?: Date | string
    updatedAt?: Date | string
  }

  export type StudioUpdateManyMutationInput = {
    id?: StringFieldUpdateOperationsInput | string
    name?: StringFieldUpdateOperationsInput | string
    nameEn?: NullableStringFieldUpdateOperationsInput | string | null
    dbName?: StringFieldUpdateOperationsInput | string
    isActive?: BoolFieldUpdateOperationsInput | boolean
    plan?: StringFieldUpdateOperationsInput | string
    storageQuotaBytes?: BigIntFieldUpdateOperationsInput | bigint | number
    storageUsedBytes?: BigIntFieldUpdateOperationsInput | bigint | number
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type StudioUncheckedUpdateManyInput = {
    id?: StringFieldUpdateOperationsInput | string
    name?: StringFieldUpdateOperationsInput | string
    nameEn?: NullableStringFieldUpdateOperationsInput | string | null
    dbName?: StringFieldUpdateOperationsInput | string
    isActive?: BoolFieldUpdateOperationsInput | boolean
    plan?: StringFieldUpdateOperationsInput | string
    storageQuotaBytes?: BigIntFieldUpdateOperationsInput | bigint | number
    storageUsedBytes?: BigIntFieldUpdateOperationsInput | bigint | number
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type MasterUserCreateInput = {
    id?: string
    phone: string
    passwordHash?: string | null
    name: string
    createdAt?: Date | string
    updatedAt?: Date | string
    memberships?: StudioMembershipCreateNestedManyWithoutUserInput
    sessions?: SessionCreateNestedManyWithoutUserInput
  }

  export type MasterUserUncheckedCreateInput = {
    id?: string
    phone: string
    passwordHash?: string | null
    name: string
    createdAt?: Date | string
    updatedAt?: Date | string
    memberships?: StudioMembershipUncheckedCreateNestedManyWithoutUserInput
    sessions?: SessionUncheckedCreateNestedManyWithoutUserInput
  }

  export type MasterUserUpdateInput = {
    id?: StringFieldUpdateOperationsInput | string
    phone?: StringFieldUpdateOperationsInput | string
    passwordHash?: NullableStringFieldUpdateOperationsInput | string | null
    name?: StringFieldUpdateOperationsInput | string
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    memberships?: StudioMembershipUpdateManyWithoutUserNestedInput
    sessions?: SessionUpdateManyWithoutUserNestedInput
  }

  export type MasterUserUncheckedUpdateInput = {
    id?: StringFieldUpdateOperationsInput | string
    phone?: StringFieldUpdateOperationsInput | string
    passwordHash?: NullableStringFieldUpdateOperationsInput | string | null
    name?: StringFieldUpdateOperationsInput | string
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    memberships?: StudioMembershipUncheckedUpdateManyWithoutUserNestedInput
    sessions?: SessionUncheckedUpdateManyWithoutUserNestedInput
  }

  export type MasterUserCreateManyInput = {
    id?: string
    phone: string
    passwordHash?: string | null
    name: string
    createdAt?: Date | string
    updatedAt?: Date | string
  }

  export type MasterUserUpdateManyMutationInput = {
    id?: StringFieldUpdateOperationsInput | string
    phone?: StringFieldUpdateOperationsInput | string
    passwordHash?: NullableStringFieldUpdateOperationsInput | string | null
    name?: StringFieldUpdateOperationsInput | string
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type MasterUserUncheckedUpdateManyInput = {
    id?: StringFieldUpdateOperationsInput | string
    phone?: StringFieldUpdateOperationsInput | string
    passwordHash?: NullableStringFieldUpdateOperationsInput | string | null
    name?: StringFieldUpdateOperationsInput | string
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type StudioMembershipCreateInput = {
    id?: string
    role: string
    isActive?: boolean
    createdAt?: Date | string
    user: MasterUserCreateNestedOneWithoutMembershipsInput
    studio: StudioCreateNestedOneWithoutMembershipsInput
  }

  export type StudioMembershipUncheckedCreateInput = {
    id?: string
    userId: string
    studioId: string
    role: string
    isActive?: boolean
    createdAt?: Date | string
  }

  export type StudioMembershipUpdateInput = {
    id?: StringFieldUpdateOperationsInput | string
    role?: StringFieldUpdateOperationsInput | string
    isActive?: BoolFieldUpdateOperationsInput | boolean
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    user?: MasterUserUpdateOneRequiredWithoutMembershipsNestedInput
    studio?: StudioUpdateOneRequiredWithoutMembershipsNestedInput
  }

  export type StudioMembershipUncheckedUpdateInput = {
    id?: StringFieldUpdateOperationsInput | string
    userId?: StringFieldUpdateOperationsInput | string
    studioId?: StringFieldUpdateOperationsInput | string
    role?: StringFieldUpdateOperationsInput | string
    isActive?: BoolFieldUpdateOperationsInput | boolean
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type StudioMembershipCreateManyInput = {
    id?: string
    userId: string
    studioId: string
    role: string
    isActive?: boolean
    createdAt?: Date | string
  }

  export type StudioMembershipUpdateManyMutationInput = {
    id?: StringFieldUpdateOperationsInput | string
    role?: StringFieldUpdateOperationsInput | string
    isActive?: BoolFieldUpdateOperationsInput | boolean
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type StudioMembershipUncheckedUpdateManyInput = {
    id?: StringFieldUpdateOperationsInput | string
    userId?: StringFieldUpdateOperationsInput | string
    studioId?: StringFieldUpdateOperationsInput | string
    role?: StringFieldUpdateOperationsInput | string
    isActive?: BoolFieldUpdateOperationsInput | boolean
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type OtpCodeCreateInput = {
    id?: string
    phone: string
    code: string
    hash: string
    expiresAt: Date | string
    used?: boolean
    attempts?: number
    createdAt?: Date | string
  }

  export type OtpCodeUncheckedCreateInput = {
    id?: string
    phone: string
    code: string
    hash: string
    expiresAt: Date | string
    used?: boolean
    attempts?: number
    createdAt?: Date | string
  }

  export type OtpCodeUpdateInput = {
    id?: StringFieldUpdateOperationsInput | string
    phone?: StringFieldUpdateOperationsInput | string
    code?: StringFieldUpdateOperationsInput | string
    hash?: StringFieldUpdateOperationsInput | string
    expiresAt?: DateTimeFieldUpdateOperationsInput | Date | string
    used?: BoolFieldUpdateOperationsInput | boolean
    attempts?: IntFieldUpdateOperationsInput | number
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type OtpCodeUncheckedUpdateInput = {
    id?: StringFieldUpdateOperationsInput | string
    phone?: StringFieldUpdateOperationsInput | string
    code?: StringFieldUpdateOperationsInput | string
    hash?: StringFieldUpdateOperationsInput | string
    expiresAt?: DateTimeFieldUpdateOperationsInput | Date | string
    used?: BoolFieldUpdateOperationsInput | boolean
    attempts?: IntFieldUpdateOperationsInput | number
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type OtpCodeCreateManyInput = {
    id?: string
    phone: string
    code: string
    hash: string
    expiresAt: Date | string
    used?: boolean
    attempts?: number
    createdAt?: Date | string
  }

  export type OtpCodeUpdateManyMutationInput = {
    id?: StringFieldUpdateOperationsInput | string
    phone?: StringFieldUpdateOperationsInput | string
    code?: StringFieldUpdateOperationsInput | string
    hash?: StringFieldUpdateOperationsInput | string
    expiresAt?: DateTimeFieldUpdateOperationsInput | Date | string
    used?: BoolFieldUpdateOperationsInput | boolean
    attempts?: IntFieldUpdateOperationsInput | number
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type OtpCodeUncheckedUpdateManyInput = {
    id?: StringFieldUpdateOperationsInput | string
    phone?: StringFieldUpdateOperationsInput | string
    code?: StringFieldUpdateOperationsInput | string
    hash?: StringFieldUpdateOperationsInput | string
    expiresAt?: DateTimeFieldUpdateOperationsInput | Date | string
    used?: BoolFieldUpdateOperationsInput | boolean
    attempts?: IntFieldUpdateOperationsInput | number
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type SessionCreateInput = {
    id?: string
    token: string
    studioId?: string | null
    role?: string | null
    expiresAt: Date | string
    createdAt?: Date | string
    user: MasterUserCreateNestedOneWithoutSessionsInput
  }

  export type SessionUncheckedCreateInput = {
    id?: string
    token: string
    userId: string
    studioId?: string | null
    role?: string | null
    expiresAt: Date | string
    createdAt?: Date | string
  }

  export type SessionUpdateInput = {
    id?: StringFieldUpdateOperationsInput | string
    token?: StringFieldUpdateOperationsInput | string
    studioId?: NullableStringFieldUpdateOperationsInput | string | null
    role?: NullableStringFieldUpdateOperationsInput | string | null
    expiresAt?: DateTimeFieldUpdateOperationsInput | Date | string
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    user?: MasterUserUpdateOneRequiredWithoutSessionsNestedInput
  }

  export type SessionUncheckedUpdateInput = {
    id?: StringFieldUpdateOperationsInput | string
    token?: StringFieldUpdateOperationsInput | string
    userId?: StringFieldUpdateOperationsInput | string
    studioId?: NullableStringFieldUpdateOperationsInput | string | null
    role?: NullableStringFieldUpdateOperationsInput | string | null
    expiresAt?: DateTimeFieldUpdateOperationsInput | Date | string
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type SessionCreateManyInput = {
    id?: string
    token: string
    userId: string
    studioId?: string | null
    role?: string | null
    expiresAt: Date | string
    createdAt?: Date | string
  }

  export type SessionUpdateManyMutationInput = {
    id?: StringFieldUpdateOperationsInput | string
    token?: StringFieldUpdateOperationsInput | string
    studioId?: NullableStringFieldUpdateOperationsInput | string | null
    role?: NullableStringFieldUpdateOperationsInput | string | null
    expiresAt?: DateTimeFieldUpdateOperationsInput | Date | string
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type SessionUncheckedUpdateManyInput = {
    id?: StringFieldUpdateOperationsInput | string
    token?: StringFieldUpdateOperationsInput | string
    userId?: StringFieldUpdateOperationsInput | string
    studioId?: NullableStringFieldUpdateOperationsInput | string | null
    role?: NullableStringFieldUpdateOperationsInput | string | null
    expiresAt?: DateTimeFieldUpdateOperationsInput | Date | string
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type StringFilter<$PrismaModel = never> = {
    equals?: string | StringFieldRefInput<$PrismaModel>
    in?: string[]
    notIn?: string[]
    lt?: string | StringFieldRefInput<$PrismaModel>
    lte?: string | StringFieldRefInput<$PrismaModel>
    gt?: string | StringFieldRefInput<$PrismaModel>
    gte?: string | StringFieldRefInput<$PrismaModel>
    contains?: string | StringFieldRefInput<$PrismaModel>
    startsWith?: string | StringFieldRefInput<$PrismaModel>
    endsWith?: string | StringFieldRefInput<$PrismaModel>
    not?: NestedStringFilter<$PrismaModel> | string
  }

  export type StringNullableFilter<$PrismaModel = never> = {
    equals?: string | StringFieldRefInput<$PrismaModel> | null
    in?: string[] | null
    notIn?: string[] | null
    lt?: string | StringFieldRefInput<$PrismaModel>
    lte?: string | StringFieldRefInput<$PrismaModel>
    gt?: string | StringFieldRefInput<$PrismaModel>
    gte?: string | StringFieldRefInput<$PrismaModel>
    contains?: string | StringFieldRefInput<$PrismaModel>
    startsWith?: string | StringFieldRefInput<$PrismaModel>
    endsWith?: string | StringFieldRefInput<$PrismaModel>
    not?: NestedStringNullableFilter<$PrismaModel> | string | null
  }

  export type BoolFilter<$PrismaModel = never> = {
    equals?: boolean | BooleanFieldRefInput<$PrismaModel>
    not?: NestedBoolFilter<$PrismaModel> | boolean
  }

  export type BigIntFilter<$PrismaModel = never> = {
    equals?: bigint | number | BigIntFieldRefInput<$PrismaModel>
    in?: bigint[] | number[]
    notIn?: bigint[] | number[]
    lt?: bigint | number | BigIntFieldRefInput<$PrismaModel>
    lte?: bigint | number | BigIntFieldRefInput<$PrismaModel>
    gt?: bigint | number | BigIntFieldRefInput<$PrismaModel>
    gte?: bigint | number | BigIntFieldRefInput<$PrismaModel>
    not?: NestedBigIntFilter<$PrismaModel> | bigint | number
  }

  export type DateTimeFilter<$PrismaModel = never> = {
    equals?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    in?: Date[] | string[]
    notIn?: Date[] | string[]
    lt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    lte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    not?: NestedDateTimeFilter<$PrismaModel> | Date | string
  }

  export type StudioMembershipListRelationFilter = {
    every?: StudioMembershipWhereInput
    some?: StudioMembershipWhereInput
    none?: StudioMembershipWhereInput
  }

  export type SortOrderInput = {
    sort: SortOrder
    nulls?: NullsOrder
  }

  export type StudioMembershipOrderByRelationAggregateInput = {
    _count?: SortOrder
  }

  export type StudioCountOrderByAggregateInput = {
    id?: SortOrder
    name?: SortOrder
    nameEn?: SortOrder
    dbName?: SortOrder
    isActive?: SortOrder
    plan?: SortOrder
    storageQuotaBytes?: SortOrder
    storageUsedBytes?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
  }

  export type StudioAvgOrderByAggregateInput = {
    storageQuotaBytes?: SortOrder
    storageUsedBytes?: SortOrder
  }

  export type StudioMaxOrderByAggregateInput = {
    id?: SortOrder
    name?: SortOrder
    nameEn?: SortOrder
    dbName?: SortOrder
    isActive?: SortOrder
    plan?: SortOrder
    storageQuotaBytes?: SortOrder
    storageUsedBytes?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
  }

  export type StudioMinOrderByAggregateInput = {
    id?: SortOrder
    name?: SortOrder
    nameEn?: SortOrder
    dbName?: SortOrder
    isActive?: SortOrder
    plan?: SortOrder
    storageQuotaBytes?: SortOrder
    storageUsedBytes?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
  }

  export type StudioSumOrderByAggregateInput = {
    storageQuotaBytes?: SortOrder
    storageUsedBytes?: SortOrder
  }

  export type StringWithAggregatesFilter<$PrismaModel = never> = {
    equals?: string | StringFieldRefInput<$PrismaModel>
    in?: string[]
    notIn?: string[]
    lt?: string | StringFieldRefInput<$PrismaModel>
    lte?: string | StringFieldRefInput<$PrismaModel>
    gt?: string | StringFieldRefInput<$PrismaModel>
    gte?: string | StringFieldRefInput<$PrismaModel>
    contains?: string | StringFieldRefInput<$PrismaModel>
    startsWith?: string | StringFieldRefInput<$PrismaModel>
    endsWith?: string | StringFieldRefInput<$PrismaModel>
    not?: NestedStringWithAggregatesFilter<$PrismaModel> | string
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedStringFilter<$PrismaModel>
    _max?: NestedStringFilter<$PrismaModel>
  }

  export type StringNullableWithAggregatesFilter<$PrismaModel = never> = {
    equals?: string | StringFieldRefInput<$PrismaModel> | null
    in?: string[] | null
    notIn?: string[] | null
    lt?: string | StringFieldRefInput<$PrismaModel>
    lte?: string | StringFieldRefInput<$PrismaModel>
    gt?: string | StringFieldRefInput<$PrismaModel>
    gte?: string | StringFieldRefInput<$PrismaModel>
    contains?: string | StringFieldRefInput<$PrismaModel>
    startsWith?: string | StringFieldRefInput<$PrismaModel>
    endsWith?: string | StringFieldRefInput<$PrismaModel>
    not?: NestedStringNullableWithAggregatesFilter<$PrismaModel> | string | null
    _count?: NestedIntNullableFilter<$PrismaModel>
    _min?: NestedStringNullableFilter<$PrismaModel>
    _max?: NestedStringNullableFilter<$PrismaModel>
  }

  export type BoolWithAggregatesFilter<$PrismaModel = never> = {
    equals?: boolean | BooleanFieldRefInput<$PrismaModel>
    not?: NestedBoolWithAggregatesFilter<$PrismaModel> | boolean
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedBoolFilter<$PrismaModel>
    _max?: NestedBoolFilter<$PrismaModel>
  }

  export type BigIntWithAggregatesFilter<$PrismaModel = never> = {
    equals?: bigint | number | BigIntFieldRefInput<$PrismaModel>
    in?: bigint[] | number[]
    notIn?: bigint[] | number[]
    lt?: bigint | number | BigIntFieldRefInput<$PrismaModel>
    lte?: bigint | number | BigIntFieldRefInput<$PrismaModel>
    gt?: bigint | number | BigIntFieldRefInput<$PrismaModel>
    gte?: bigint | number | BigIntFieldRefInput<$PrismaModel>
    not?: NestedBigIntWithAggregatesFilter<$PrismaModel> | bigint | number
    _count?: NestedIntFilter<$PrismaModel>
    _avg?: NestedFloatFilter<$PrismaModel>
    _sum?: NestedBigIntFilter<$PrismaModel>
    _min?: NestedBigIntFilter<$PrismaModel>
    _max?: NestedBigIntFilter<$PrismaModel>
  }

  export type DateTimeWithAggregatesFilter<$PrismaModel = never> = {
    equals?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    in?: Date[] | string[]
    notIn?: Date[] | string[]
    lt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    lte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    not?: NestedDateTimeWithAggregatesFilter<$PrismaModel> | Date | string
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedDateTimeFilter<$PrismaModel>
    _max?: NestedDateTimeFilter<$PrismaModel>
  }

  export type SessionListRelationFilter = {
    every?: SessionWhereInput
    some?: SessionWhereInput
    none?: SessionWhereInput
  }

  export type SessionOrderByRelationAggregateInput = {
    _count?: SortOrder
  }

  export type MasterUserCountOrderByAggregateInput = {
    id?: SortOrder
    phone?: SortOrder
    passwordHash?: SortOrder
    name?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
  }

  export type MasterUserMaxOrderByAggregateInput = {
    id?: SortOrder
    phone?: SortOrder
    passwordHash?: SortOrder
    name?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
  }

  export type MasterUserMinOrderByAggregateInput = {
    id?: SortOrder
    phone?: SortOrder
    passwordHash?: SortOrder
    name?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
  }

  export type MasterUserScalarRelationFilter = {
    is?: MasterUserWhereInput
    isNot?: MasterUserWhereInput
  }

  export type StudioScalarRelationFilter = {
    is?: StudioWhereInput
    isNot?: StudioWhereInput
  }

  export type StudioMembershipUserIdStudioIdCompoundUniqueInput = {
    userId: string
    studioId: string
  }

  export type StudioMembershipCountOrderByAggregateInput = {
    id?: SortOrder
    userId?: SortOrder
    studioId?: SortOrder
    role?: SortOrder
    isActive?: SortOrder
    createdAt?: SortOrder
  }

  export type StudioMembershipMaxOrderByAggregateInput = {
    id?: SortOrder
    userId?: SortOrder
    studioId?: SortOrder
    role?: SortOrder
    isActive?: SortOrder
    createdAt?: SortOrder
  }

  export type StudioMembershipMinOrderByAggregateInput = {
    id?: SortOrder
    userId?: SortOrder
    studioId?: SortOrder
    role?: SortOrder
    isActive?: SortOrder
    createdAt?: SortOrder
  }

  export type IntFilter<$PrismaModel = never> = {
    equals?: number | IntFieldRefInput<$PrismaModel>
    in?: number[]
    notIn?: number[]
    lt?: number | IntFieldRefInput<$PrismaModel>
    lte?: number | IntFieldRefInput<$PrismaModel>
    gt?: number | IntFieldRefInput<$PrismaModel>
    gte?: number | IntFieldRefInput<$PrismaModel>
    not?: NestedIntFilter<$PrismaModel> | number
  }

  export type OtpCodeCountOrderByAggregateInput = {
    id?: SortOrder
    phone?: SortOrder
    code?: SortOrder
    hash?: SortOrder
    expiresAt?: SortOrder
    used?: SortOrder
    attempts?: SortOrder
    createdAt?: SortOrder
  }

  export type OtpCodeAvgOrderByAggregateInput = {
    attempts?: SortOrder
  }

  export type OtpCodeMaxOrderByAggregateInput = {
    id?: SortOrder
    phone?: SortOrder
    code?: SortOrder
    hash?: SortOrder
    expiresAt?: SortOrder
    used?: SortOrder
    attempts?: SortOrder
    createdAt?: SortOrder
  }

  export type OtpCodeMinOrderByAggregateInput = {
    id?: SortOrder
    phone?: SortOrder
    code?: SortOrder
    hash?: SortOrder
    expiresAt?: SortOrder
    used?: SortOrder
    attempts?: SortOrder
    createdAt?: SortOrder
  }

  export type OtpCodeSumOrderByAggregateInput = {
    attempts?: SortOrder
  }

  export type IntWithAggregatesFilter<$PrismaModel = never> = {
    equals?: number | IntFieldRefInput<$PrismaModel>
    in?: number[]
    notIn?: number[]
    lt?: number | IntFieldRefInput<$PrismaModel>
    lte?: number | IntFieldRefInput<$PrismaModel>
    gt?: number | IntFieldRefInput<$PrismaModel>
    gte?: number | IntFieldRefInput<$PrismaModel>
    not?: NestedIntWithAggregatesFilter<$PrismaModel> | number
    _count?: NestedIntFilter<$PrismaModel>
    _avg?: NestedFloatFilter<$PrismaModel>
    _sum?: NestedIntFilter<$PrismaModel>
    _min?: NestedIntFilter<$PrismaModel>
    _max?: NestedIntFilter<$PrismaModel>
  }

  export type SessionCountOrderByAggregateInput = {
    id?: SortOrder
    token?: SortOrder
    userId?: SortOrder
    studioId?: SortOrder
    role?: SortOrder
    expiresAt?: SortOrder
    createdAt?: SortOrder
  }

  export type SessionMaxOrderByAggregateInput = {
    id?: SortOrder
    token?: SortOrder
    userId?: SortOrder
    studioId?: SortOrder
    role?: SortOrder
    expiresAt?: SortOrder
    createdAt?: SortOrder
  }

  export type SessionMinOrderByAggregateInput = {
    id?: SortOrder
    token?: SortOrder
    userId?: SortOrder
    studioId?: SortOrder
    role?: SortOrder
    expiresAt?: SortOrder
    createdAt?: SortOrder
  }

  export type StudioMembershipCreateNestedManyWithoutStudioInput = {
    create?: XOR<StudioMembershipCreateWithoutStudioInput, StudioMembershipUncheckedCreateWithoutStudioInput> | StudioMembershipCreateWithoutStudioInput[] | StudioMembershipUncheckedCreateWithoutStudioInput[]
    connectOrCreate?: StudioMembershipCreateOrConnectWithoutStudioInput | StudioMembershipCreateOrConnectWithoutStudioInput[]
    createMany?: StudioMembershipCreateManyStudioInputEnvelope
    connect?: StudioMembershipWhereUniqueInput | StudioMembershipWhereUniqueInput[]
  }

  export type StudioMembershipUncheckedCreateNestedManyWithoutStudioInput = {
    create?: XOR<StudioMembershipCreateWithoutStudioInput, StudioMembershipUncheckedCreateWithoutStudioInput> | StudioMembershipCreateWithoutStudioInput[] | StudioMembershipUncheckedCreateWithoutStudioInput[]
    connectOrCreate?: StudioMembershipCreateOrConnectWithoutStudioInput | StudioMembershipCreateOrConnectWithoutStudioInput[]
    createMany?: StudioMembershipCreateManyStudioInputEnvelope
    connect?: StudioMembershipWhereUniqueInput | StudioMembershipWhereUniqueInput[]
  }

  export type StringFieldUpdateOperationsInput = {
    set?: string
  }

  export type NullableStringFieldUpdateOperationsInput = {
    set?: string | null
  }

  export type BoolFieldUpdateOperationsInput = {
    set?: boolean
  }

  export type BigIntFieldUpdateOperationsInput = {
    set?: bigint | number
    increment?: bigint | number
    decrement?: bigint | number
    multiply?: bigint | number
    divide?: bigint | number
  }

  export type DateTimeFieldUpdateOperationsInput = {
    set?: Date | string
  }

  export type StudioMembershipUpdateManyWithoutStudioNestedInput = {
    create?: XOR<StudioMembershipCreateWithoutStudioInput, StudioMembershipUncheckedCreateWithoutStudioInput> | StudioMembershipCreateWithoutStudioInput[] | StudioMembershipUncheckedCreateWithoutStudioInput[]
    connectOrCreate?: StudioMembershipCreateOrConnectWithoutStudioInput | StudioMembershipCreateOrConnectWithoutStudioInput[]
    upsert?: StudioMembershipUpsertWithWhereUniqueWithoutStudioInput | StudioMembershipUpsertWithWhereUniqueWithoutStudioInput[]
    createMany?: StudioMembershipCreateManyStudioInputEnvelope
    set?: StudioMembershipWhereUniqueInput | StudioMembershipWhereUniqueInput[]
    disconnect?: StudioMembershipWhereUniqueInput | StudioMembershipWhereUniqueInput[]
    delete?: StudioMembershipWhereUniqueInput | StudioMembershipWhereUniqueInput[]
    connect?: StudioMembershipWhereUniqueInput | StudioMembershipWhereUniqueInput[]
    update?: StudioMembershipUpdateWithWhereUniqueWithoutStudioInput | StudioMembershipUpdateWithWhereUniqueWithoutStudioInput[]
    updateMany?: StudioMembershipUpdateManyWithWhereWithoutStudioInput | StudioMembershipUpdateManyWithWhereWithoutStudioInput[]
    deleteMany?: StudioMembershipScalarWhereInput | StudioMembershipScalarWhereInput[]
  }

  export type StudioMembershipUncheckedUpdateManyWithoutStudioNestedInput = {
    create?: XOR<StudioMembershipCreateWithoutStudioInput, StudioMembershipUncheckedCreateWithoutStudioInput> | StudioMembershipCreateWithoutStudioInput[] | StudioMembershipUncheckedCreateWithoutStudioInput[]
    connectOrCreate?: StudioMembershipCreateOrConnectWithoutStudioInput | StudioMembershipCreateOrConnectWithoutStudioInput[]
    upsert?: StudioMembershipUpsertWithWhereUniqueWithoutStudioInput | StudioMembershipUpsertWithWhereUniqueWithoutStudioInput[]
    createMany?: StudioMembershipCreateManyStudioInputEnvelope
    set?: StudioMembershipWhereUniqueInput | StudioMembershipWhereUniqueInput[]
    disconnect?: StudioMembershipWhereUniqueInput | StudioMembershipWhereUniqueInput[]
    delete?: StudioMembershipWhereUniqueInput | StudioMembershipWhereUniqueInput[]
    connect?: StudioMembershipWhereUniqueInput | StudioMembershipWhereUniqueInput[]
    update?: StudioMembershipUpdateWithWhereUniqueWithoutStudioInput | StudioMembershipUpdateWithWhereUniqueWithoutStudioInput[]
    updateMany?: StudioMembershipUpdateManyWithWhereWithoutStudioInput | StudioMembershipUpdateManyWithWhereWithoutStudioInput[]
    deleteMany?: StudioMembershipScalarWhereInput | StudioMembershipScalarWhereInput[]
  }

  export type StudioMembershipCreateNestedManyWithoutUserInput = {
    create?: XOR<StudioMembershipCreateWithoutUserInput, StudioMembershipUncheckedCreateWithoutUserInput> | StudioMembershipCreateWithoutUserInput[] | StudioMembershipUncheckedCreateWithoutUserInput[]
    connectOrCreate?: StudioMembershipCreateOrConnectWithoutUserInput | StudioMembershipCreateOrConnectWithoutUserInput[]
    createMany?: StudioMembershipCreateManyUserInputEnvelope
    connect?: StudioMembershipWhereUniqueInput | StudioMembershipWhereUniqueInput[]
  }

  export type SessionCreateNestedManyWithoutUserInput = {
    create?: XOR<SessionCreateWithoutUserInput, SessionUncheckedCreateWithoutUserInput> | SessionCreateWithoutUserInput[] | SessionUncheckedCreateWithoutUserInput[]
    connectOrCreate?: SessionCreateOrConnectWithoutUserInput | SessionCreateOrConnectWithoutUserInput[]
    createMany?: SessionCreateManyUserInputEnvelope
    connect?: SessionWhereUniqueInput | SessionWhereUniqueInput[]
  }

  export type StudioMembershipUncheckedCreateNestedManyWithoutUserInput = {
    create?: XOR<StudioMembershipCreateWithoutUserInput, StudioMembershipUncheckedCreateWithoutUserInput> | StudioMembershipCreateWithoutUserInput[] | StudioMembershipUncheckedCreateWithoutUserInput[]
    connectOrCreate?: StudioMembershipCreateOrConnectWithoutUserInput | StudioMembershipCreateOrConnectWithoutUserInput[]
    createMany?: StudioMembershipCreateManyUserInputEnvelope
    connect?: StudioMembershipWhereUniqueInput | StudioMembershipWhereUniqueInput[]
  }

  export type SessionUncheckedCreateNestedManyWithoutUserInput = {
    create?: XOR<SessionCreateWithoutUserInput, SessionUncheckedCreateWithoutUserInput> | SessionCreateWithoutUserInput[] | SessionUncheckedCreateWithoutUserInput[]
    connectOrCreate?: SessionCreateOrConnectWithoutUserInput | SessionCreateOrConnectWithoutUserInput[]
    createMany?: SessionCreateManyUserInputEnvelope
    connect?: SessionWhereUniqueInput | SessionWhereUniqueInput[]
  }

  export type StudioMembershipUpdateManyWithoutUserNestedInput = {
    create?: XOR<StudioMembershipCreateWithoutUserInput, StudioMembershipUncheckedCreateWithoutUserInput> | StudioMembershipCreateWithoutUserInput[] | StudioMembershipUncheckedCreateWithoutUserInput[]
    connectOrCreate?: StudioMembershipCreateOrConnectWithoutUserInput | StudioMembershipCreateOrConnectWithoutUserInput[]
    upsert?: StudioMembershipUpsertWithWhereUniqueWithoutUserInput | StudioMembershipUpsertWithWhereUniqueWithoutUserInput[]
    createMany?: StudioMembershipCreateManyUserInputEnvelope
    set?: StudioMembershipWhereUniqueInput | StudioMembershipWhereUniqueInput[]
    disconnect?: StudioMembershipWhereUniqueInput | StudioMembershipWhereUniqueInput[]
    delete?: StudioMembershipWhereUniqueInput | StudioMembershipWhereUniqueInput[]
    connect?: StudioMembershipWhereUniqueInput | StudioMembershipWhereUniqueInput[]
    update?: StudioMembershipUpdateWithWhereUniqueWithoutUserInput | StudioMembershipUpdateWithWhereUniqueWithoutUserInput[]
    updateMany?: StudioMembershipUpdateManyWithWhereWithoutUserInput | StudioMembershipUpdateManyWithWhereWithoutUserInput[]
    deleteMany?: StudioMembershipScalarWhereInput | StudioMembershipScalarWhereInput[]
  }

  export type SessionUpdateManyWithoutUserNestedInput = {
    create?: XOR<SessionCreateWithoutUserInput, SessionUncheckedCreateWithoutUserInput> | SessionCreateWithoutUserInput[] | SessionUncheckedCreateWithoutUserInput[]
    connectOrCreate?: SessionCreateOrConnectWithoutUserInput | SessionCreateOrConnectWithoutUserInput[]
    upsert?: SessionUpsertWithWhereUniqueWithoutUserInput | SessionUpsertWithWhereUniqueWithoutUserInput[]
    createMany?: SessionCreateManyUserInputEnvelope
    set?: SessionWhereUniqueInput | SessionWhereUniqueInput[]
    disconnect?: SessionWhereUniqueInput | SessionWhereUniqueInput[]
    delete?: SessionWhereUniqueInput | SessionWhereUniqueInput[]
    connect?: SessionWhereUniqueInput | SessionWhereUniqueInput[]
    update?: SessionUpdateWithWhereUniqueWithoutUserInput | SessionUpdateWithWhereUniqueWithoutUserInput[]
    updateMany?: SessionUpdateManyWithWhereWithoutUserInput | SessionUpdateManyWithWhereWithoutUserInput[]
    deleteMany?: SessionScalarWhereInput | SessionScalarWhereInput[]
  }

  export type StudioMembershipUncheckedUpdateManyWithoutUserNestedInput = {
    create?: XOR<StudioMembershipCreateWithoutUserInput, StudioMembershipUncheckedCreateWithoutUserInput> | StudioMembershipCreateWithoutUserInput[] | StudioMembershipUncheckedCreateWithoutUserInput[]
    connectOrCreate?: StudioMembershipCreateOrConnectWithoutUserInput | StudioMembershipCreateOrConnectWithoutUserInput[]
    upsert?: StudioMembershipUpsertWithWhereUniqueWithoutUserInput | StudioMembershipUpsertWithWhereUniqueWithoutUserInput[]
    createMany?: StudioMembershipCreateManyUserInputEnvelope
    set?: StudioMembershipWhereUniqueInput | StudioMembershipWhereUniqueInput[]
    disconnect?: StudioMembershipWhereUniqueInput | StudioMembershipWhereUniqueInput[]
    delete?: StudioMembershipWhereUniqueInput | StudioMembershipWhereUniqueInput[]
    connect?: StudioMembershipWhereUniqueInput | StudioMembershipWhereUniqueInput[]
    update?: StudioMembershipUpdateWithWhereUniqueWithoutUserInput | StudioMembershipUpdateWithWhereUniqueWithoutUserInput[]
    updateMany?: StudioMembershipUpdateManyWithWhereWithoutUserInput | StudioMembershipUpdateManyWithWhereWithoutUserInput[]
    deleteMany?: StudioMembershipScalarWhereInput | StudioMembershipScalarWhereInput[]
  }

  export type SessionUncheckedUpdateManyWithoutUserNestedInput = {
    create?: XOR<SessionCreateWithoutUserInput, SessionUncheckedCreateWithoutUserInput> | SessionCreateWithoutUserInput[] | SessionUncheckedCreateWithoutUserInput[]
    connectOrCreate?: SessionCreateOrConnectWithoutUserInput | SessionCreateOrConnectWithoutUserInput[]
    upsert?: SessionUpsertWithWhereUniqueWithoutUserInput | SessionUpsertWithWhereUniqueWithoutUserInput[]
    createMany?: SessionCreateManyUserInputEnvelope
    set?: SessionWhereUniqueInput | SessionWhereUniqueInput[]
    disconnect?: SessionWhereUniqueInput | SessionWhereUniqueInput[]
    delete?: SessionWhereUniqueInput | SessionWhereUniqueInput[]
    connect?: SessionWhereUniqueInput | SessionWhereUniqueInput[]
    update?: SessionUpdateWithWhereUniqueWithoutUserInput | SessionUpdateWithWhereUniqueWithoutUserInput[]
    updateMany?: SessionUpdateManyWithWhereWithoutUserInput | SessionUpdateManyWithWhereWithoutUserInput[]
    deleteMany?: SessionScalarWhereInput | SessionScalarWhereInput[]
  }

  export type MasterUserCreateNestedOneWithoutMembershipsInput = {
    create?: XOR<MasterUserCreateWithoutMembershipsInput, MasterUserUncheckedCreateWithoutMembershipsInput>
    connectOrCreate?: MasterUserCreateOrConnectWithoutMembershipsInput
    connect?: MasterUserWhereUniqueInput
  }

  export type StudioCreateNestedOneWithoutMembershipsInput = {
    create?: XOR<StudioCreateWithoutMembershipsInput, StudioUncheckedCreateWithoutMembershipsInput>
    connectOrCreate?: StudioCreateOrConnectWithoutMembershipsInput
    connect?: StudioWhereUniqueInput
  }

  export type MasterUserUpdateOneRequiredWithoutMembershipsNestedInput = {
    create?: XOR<MasterUserCreateWithoutMembershipsInput, MasterUserUncheckedCreateWithoutMembershipsInput>
    connectOrCreate?: MasterUserCreateOrConnectWithoutMembershipsInput
    upsert?: MasterUserUpsertWithoutMembershipsInput
    connect?: MasterUserWhereUniqueInput
    update?: XOR<XOR<MasterUserUpdateToOneWithWhereWithoutMembershipsInput, MasterUserUpdateWithoutMembershipsInput>, MasterUserUncheckedUpdateWithoutMembershipsInput>
  }

  export type StudioUpdateOneRequiredWithoutMembershipsNestedInput = {
    create?: XOR<StudioCreateWithoutMembershipsInput, StudioUncheckedCreateWithoutMembershipsInput>
    connectOrCreate?: StudioCreateOrConnectWithoutMembershipsInput
    upsert?: StudioUpsertWithoutMembershipsInput
    connect?: StudioWhereUniqueInput
    update?: XOR<XOR<StudioUpdateToOneWithWhereWithoutMembershipsInput, StudioUpdateWithoutMembershipsInput>, StudioUncheckedUpdateWithoutMembershipsInput>
  }

  export type IntFieldUpdateOperationsInput = {
    set?: number
    increment?: number
    decrement?: number
    multiply?: number
    divide?: number
  }

  export type MasterUserCreateNestedOneWithoutSessionsInput = {
    create?: XOR<MasterUserCreateWithoutSessionsInput, MasterUserUncheckedCreateWithoutSessionsInput>
    connectOrCreate?: MasterUserCreateOrConnectWithoutSessionsInput
    connect?: MasterUserWhereUniqueInput
  }

  export type MasterUserUpdateOneRequiredWithoutSessionsNestedInput = {
    create?: XOR<MasterUserCreateWithoutSessionsInput, MasterUserUncheckedCreateWithoutSessionsInput>
    connectOrCreate?: MasterUserCreateOrConnectWithoutSessionsInput
    upsert?: MasterUserUpsertWithoutSessionsInput
    connect?: MasterUserWhereUniqueInput
    update?: XOR<XOR<MasterUserUpdateToOneWithWhereWithoutSessionsInput, MasterUserUpdateWithoutSessionsInput>, MasterUserUncheckedUpdateWithoutSessionsInput>
  }

  export type NestedStringFilter<$PrismaModel = never> = {
    equals?: string | StringFieldRefInput<$PrismaModel>
    in?: string[]
    notIn?: string[]
    lt?: string | StringFieldRefInput<$PrismaModel>
    lte?: string | StringFieldRefInput<$PrismaModel>
    gt?: string | StringFieldRefInput<$PrismaModel>
    gte?: string | StringFieldRefInput<$PrismaModel>
    contains?: string | StringFieldRefInput<$PrismaModel>
    startsWith?: string | StringFieldRefInput<$PrismaModel>
    endsWith?: string | StringFieldRefInput<$PrismaModel>
    not?: NestedStringFilter<$PrismaModel> | string
  }

  export type NestedStringNullableFilter<$PrismaModel = never> = {
    equals?: string | StringFieldRefInput<$PrismaModel> | null
    in?: string[] | null
    notIn?: string[] | null
    lt?: string | StringFieldRefInput<$PrismaModel>
    lte?: string | StringFieldRefInput<$PrismaModel>
    gt?: string | StringFieldRefInput<$PrismaModel>
    gte?: string | StringFieldRefInput<$PrismaModel>
    contains?: string | StringFieldRefInput<$PrismaModel>
    startsWith?: string | StringFieldRefInput<$PrismaModel>
    endsWith?: string | StringFieldRefInput<$PrismaModel>
    not?: NestedStringNullableFilter<$PrismaModel> | string | null
  }

  export type NestedBoolFilter<$PrismaModel = never> = {
    equals?: boolean | BooleanFieldRefInput<$PrismaModel>
    not?: NestedBoolFilter<$PrismaModel> | boolean
  }

  export type NestedBigIntFilter<$PrismaModel = never> = {
    equals?: bigint | number | BigIntFieldRefInput<$PrismaModel>
    in?: bigint[] | number[]
    notIn?: bigint[] | number[]
    lt?: bigint | number | BigIntFieldRefInput<$PrismaModel>
    lte?: bigint | number | BigIntFieldRefInput<$PrismaModel>
    gt?: bigint | number | BigIntFieldRefInput<$PrismaModel>
    gte?: bigint | number | BigIntFieldRefInput<$PrismaModel>
    not?: NestedBigIntFilter<$PrismaModel> | bigint | number
  }

  export type NestedDateTimeFilter<$PrismaModel = never> = {
    equals?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    in?: Date[] | string[]
    notIn?: Date[] | string[]
    lt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    lte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    not?: NestedDateTimeFilter<$PrismaModel> | Date | string
  }

  export type NestedStringWithAggregatesFilter<$PrismaModel = never> = {
    equals?: string | StringFieldRefInput<$PrismaModel>
    in?: string[]
    notIn?: string[]
    lt?: string | StringFieldRefInput<$PrismaModel>
    lte?: string | StringFieldRefInput<$PrismaModel>
    gt?: string | StringFieldRefInput<$PrismaModel>
    gte?: string | StringFieldRefInput<$PrismaModel>
    contains?: string | StringFieldRefInput<$PrismaModel>
    startsWith?: string | StringFieldRefInput<$PrismaModel>
    endsWith?: string | StringFieldRefInput<$PrismaModel>
    not?: NestedStringWithAggregatesFilter<$PrismaModel> | string
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedStringFilter<$PrismaModel>
    _max?: NestedStringFilter<$PrismaModel>
  }

  export type NestedIntFilter<$PrismaModel = never> = {
    equals?: number | IntFieldRefInput<$PrismaModel>
    in?: number[]
    notIn?: number[]
    lt?: number | IntFieldRefInput<$PrismaModel>
    lte?: number | IntFieldRefInput<$PrismaModel>
    gt?: number | IntFieldRefInput<$PrismaModel>
    gte?: number | IntFieldRefInput<$PrismaModel>
    not?: NestedIntFilter<$PrismaModel> | number
  }

  export type NestedStringNullableWithAggregatesFilter<$PrismaModel = never> = {
    equals?: string | StringFieldRefInput<$PrismaModel> | null
    in?: string[] | null
    notIn?: string[] | null
    lt?: string | StringFieldRefInput<$PrismaModel>
    lte?: string | StringFieldRefInput<$PrismaModel>
    gt?: string | StringFieldRefInput<$PrismaModel>
    gte?: string | StringFieldRefInput<$PrismaModel>
    contains?: string | StringFieldRefInput<$PrismaModel>
    startsWith?: string | StringFieldRefInput<$PrismaModel>
    endsWith?: string | StringFieldRefInput<$PrismaModel>
    not?: NestedStringNullableWithAggregatesFilter<$PrismaModel> | string | null
    _count?: NestedIntNullableFilter<$PrismaModel>
    _min?: NestedStringNullableFilter<$PrismaModel>
    _max?: NestedStringNullableFilter<$PrismaModel>
  }

  export type NestedIntNullableFilter<$PrismaModel = never> = {
    equals?: number | IntFieldRefInput<$PrismaModel> | null
    in?: number[] | null
    notIn?: number[] | null
    lt?: number | IntFieldRefInput<$PrismaModel>
    lte?: number | IntFieldRefInput<$PrismaModel>
    gt?: number | IntFieldRefInput<$PrismaModel>
    gte?: number | IntFieldRefInput<$PrismaModel>
    not?: NestedIntNullableFilter<$PrismaModel> | number | null
  }

  export type NestedBoolWithAggregatesFilter<$PrismaModel = never> = {
    equals?: boolean | BooleanFieldRefInput<$PrismaModel>
    not?: NestedBoolWithAggregatesFilter<$PrismaModel> | boolean
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedBoolFilter<$PrismaModel>
    _max?: NestedBoolFilter<$PrismaModel>
  }

  export type NestedBigIntWithAggregatesFilter<$PrismaModel = never> = {
    equals?: bigint | number | BigIntFieldRefInput<$PrismaModel>
    in?: bigint[] | number[]
    notIn?: bigint[] | number[]
    lt?: bigint | number | BigIntFieldRefInput<$PrismaModel>
    lte?: bigint | number | BigIntFieldRefInput<$PrismaModel>
    gt?: bigint | number | BigIntFieldRefInput<$PrismaModel>
    gte?: bigint | number | BigIntFieldRefInput<$PrismaModel>
    not?: NestedBigIntWithAggregatesFilter<$PrismaModel> | bigint | number
    _count?: NestedIntFilter<$PrismaModel>
    _avg?: NestedFloatFilter<$PrismaModel>
    _sum?: NestedBigIntFilter<$PrismaModel>
    _min?: NestedBigIntFilter<$PrismaModel>
    _max?: NestedBigIntFilter<$PrismaModel>
  }

  export type NestedFloatFilter<$PrismaModel = never> = {
    equals?: number | FloatFieldRefInput<$PrismaModel>
    in?: number[]
    notIn?: number[]
    lt?: number | FloatFieldRefInput<$PrismaModel>
    lte?: number | FloatFieldRefInput<$PrismaModel>
    gt?: number | FloatFieldRefInput<$PrismaModel>
    gte?: number | FloatFieldRefInput<$PrismaModel>
    not?: NestedFloatFilter<$PrismaModel> | number
  }

  export type NestedDateTimeWithAggregatesFilter<$PrismaModel = never> = {
    equals?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    in?: Date[] | string[]
    notIn?: Date[] | string[]
    lt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    lte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    not?: NestedDateTimeWithAggregatesFilter<$PrismaModel> | Date | string
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedDateTimeFilter<$PrismaModel>
    _max?: NestedDateTimeFilter<$PrismaModel>
  }

  export type NestedIntWithAggregatesFilter<$PrismaModel = never> = {
    equals?: number | IntFieldRefInput<$PrismaModel>
    in?: number[]
    notIn?: number[]
    lt?: number | IntFieldRefInput<$PrismaModel>
    lte?: number | IntFieldRefInput<$PrismaModel>
    gt?: number | IntFieldRefInput<$PrismaModel>
    gte?: number | IntFieldRefInput<$PrismaModel>
    not?: NestedIntWithAggregatesFilter<$PrismaModel> | number
    _count?: NestedIntFilter<$PrismaModel>
    _avg?: NestedFloatFilter<$PrismaModel>
    _sum?: NestedIntFilter<$PrismaModel>
    _min?: NestedIntFilter<$PrismaModel>
    _max?: NestedIntFilter<$PrismaModel>
  }

  export type StudioMembershipCreateWithoutStudioInput = {
    id?: string
    role: string
    isActive?: boolean
    createdAt?: Date | string
    user: MasterUserCreateNestedOneWithoutMembershipsInput
  }

  export type StudioMembershipUncheckedCreateWithoutStudioInput = {
    id?: string
    userId: string
    role: string
    isActive?: boolean
    createdAt?: Date | string
  }

  export type StudioMembershipCreateOrConnectWithoutStudioInput = {
    where: StudioMembershipWhereUniqueInput
    create: XOR<StudioMembershipCreateWithoutStudioInput, StudioMembershipUncheckedCreateWithoutStudioInput>
  }

  export type StudioMembershipCreateManyStudioInputEnvelope = {
    data: StudioMembershipCreateManyStudioInput | StudioMembershipCreateManyStudioInput[]
  }

  export type StudioMembershipUpsertWithWhereUniqueWithoutStudioInput = {
    where: StudioMembershipWhereUniqueInput
    update: XOR<StudioMembershipUpdateWithoutStudioInput, StudioMembershipUncheckedUpdateWithoutStudioInput>
    create: XOR<StudioMembershipCreateWithoutStudioInput, StudioMembershipUncheckedCreateWithoutStudioInput>
  }

  export type StudioMembershipUpdateWithWhereUniqueWithoutStudioInput = {
    where: StudioMembershipWhereUniqueInput
    data: XOR<StudioMembershipUpdateWithoutStudioInput, StudioMembershipUncheckedUpdateWithoutStudioInput>
  }

  export type StudioMembershipUpdateManyWithWhereWithoutStudioInput = {
    where: StudioMembershipScalarWhereInput
    data: XOR<StudioMembershipUpdateManyMutationInput, StudioMembershipUncheckedUpdateManyWithoutStudioInput>
  }

  export type StudioMembershipScalarWhereInput = {
    AND?: StudioMembershipScalarWhereInput | StudioMembershipScalarWhereInput[]
    OR?: StudioMembershipScalarWhereInput[]
    NOT?: StudioMembershipScalarWhereInput | StudioMembershipScalarWhereInput[]
    id?: StringFilter<"StudioMembership"> | string
    userId?: StringFilter<"StudioMembership"> | string
    studioId?: StringFilter<"StudioMembership"> | string
    role?: StringFilter<"StudioMembership"> | string
    isActive?: BoolFilter<"StudioMembership"> | boolean
    createdAt?: DateTimeFilter<"StudioMembership"> | Date | string
  }

  export type StudioMembershipCreateWithoutUserInput = {
    id?: string
    role: string
    isActive?: boolean
    createdAt?: Date | string
    studio: StudioCreateNestedOneWithoutMembershipsInput
  }

  export type StudioMembershipUncheckedCreateWithoutUserInput = {
    id?: string
    studioId: string
    role: string
    isActive?: boolean
    createdAt?: Date | string
  }

  export type StudioMembershipCreateOrConnectWithoutUserInput = {
    where: StudioMembershipWhereUniqueInput
    create: XOR<StudioMembershipCreateWithoutUserInput, StudioMembershipUncheckedCreateWithoutUserInput>
  }

  export type StudioMembershipCreateManyUserInputEnvelope = {
    data: StudioMembershipCreateManyUserInput | StudioMembershipCreateManyUserInput[]
  }

  export type SessionCreateWithoutUserInput = {
    id?: string
    token: string
    studioId?: string | null
    role?: string | null
    expiresAt: Date | string
    createdAt?: Date | string
  }

  export type SessionUncheckedCreateWithoutUserInput = {
    id?: string
    token: string
    studioId?: string | null
    role?: string | null
    expiresAt: Date | string
    createdAt?: Date | string
  }

  export type SessionCreateOrConnectWithoutUserInput = {
    where: SessionWhereUniqueInput
    create: XOR<SessionCreateWithoutUserInput, SessionUncheckedCreateWithoutUserInput>
  }

  export type SessionCreateManyUserInputEnvelope = {
    data: SessionCreateManyUserInput | SessionCreateManyUserInput[]
  }

  export type StudioMembershipUpsertWithWhereUniqueWithoutUserInput = {
    where: StudioMembershipWhereUniqueInput
    update: XOR<StudioMembershipUpdateWithoutUserInput, StudioMembershipUncheckedUpdateWithoutUserInput>
    create: XOR<StudioMembershipCreateWithoutUserInput, StudioMembershipUncheckedCreateWithoutUserInput>
  }

  export type StudioMembershipUpdateWithWhereUniqueWithoutUserInput = {
    where: StudioMembershipWhereUniqueInput
    data: XOR<StudioMembershipUpdateWithoutUserInput, StudioMembershipUncheckedUpdateWithoutUserInput>
  }

  export type StudioMembershipUpdateManyWithWhereWithoutUserInput = {
    where: StudioMembershipScalarWhereInput
    data: XOR<StudioMembershipUpdateManyMutationInput, StudioMembershipUncheckedUpdateManyWithoutUserInput>
  }

  export type SessionUpsertWithWhereUniqueWithoutUserInput = {
    where: SessionWhereUniqueInput
    update: XOR<SessionUpdateWithoutUserInput, SessionUncheckedUpdateWithoutUserInput>
    create: XOR<SessionCreateWithoutUserInput, SessionUncheckedCreateWithoutUserInput>
  }

  export type SessionUpdateWithWhereUniqueWithoutUserInput = {
    where: SessionWhereUniqueInput
    data: XOR<SessionUpdateWithoutUserInput, SessionUncheckedUpdateWithoutUserInput>
  }

  export type SessionUpdateManyWithWhereWithoutUserInput = {
    where: SessionScalarWhereInput
    data: XOR<SessionUpdateManyMutationInput, SessionUncheckedUpdateManyWithoutUserInput>
  }

  export type SessionScalarWhereInput = {
    AND?: SessionScalarWhereInput | SessionScalarWhereInput[]
    OR?: SessionScalarWhereInput[]
    NOT?: SessionScalarWhereInput | SessionScalarWhereInput[]
    id?: StringFilter<"Session"> | string
    token?: StringFilter<"Session"> | string
    userId?: StringFilter<"Session"> | string
    studioId?: StringNullableFilter<"Session"> | string | null
    role?: StringNullableFilter<"Session"> | string | null
    expiresAt?: DateTimeFilter<"Session"> | Date | string
    createdAt?: DateTimeFilter<"Session"> | Date | string
  }

  export type MasterUserCreateWithoutMembershipsInput = {
    id?: string
    phone: string
    passwordHash?: string | null
    name: string
    createdAt?: Date | string
    updatedAt?: Date | string
    sessions?: SessionCreateNestedManyWithoutUserInput
  }

  export type MasterUserUncheckedCreateWithoutMembershipsInput = {
    id?: string
    phone: string
    passwordHash?: string | null
    name: string
    createdAt?: Date | string
    updatedAt?: Date | string
    sessions?: SessionUncheckedCreateNestedManyWithoutUserInput
  }

  export type MasterUserCreateOrConnectWithoutMembershipsInput = {
    where: MasterUserWhereUniqueInput
    create: XOR<MasterUserCreateWithoutMembershipsInput, MasterUserUncheckedCreateWithoutMembershipsInput>
  }

  export type StudioCreateWithoutMembershipsInput = {
    id?: string
    name: string
    nameEn?: string | null
    dbName: string
    isActive?: boolean
    plan?: string
    storageQuotaBytes?: bigint | number
    storageUsedBytes?: bigint | number
    createdAt?: Date | string
    updatedAt?: Date | string
  }

  export type StudioUncheckedCreateWithoutMembershipsInput = {
    id?: string
    name: string
    nameEn?: string | null
    dbName: string
    isActive?: boolean
    plan?: string
    storageQuotaBytes?: bigint | number
    storageUsedBytes?: bigint | number
    createdAt?: Date | string
    updatedAt?: Date | string
  }

  export type StudioCreateOrConnectWithoutMembershipsInput = {
    where: StudioWhereUniqueInput
    create: XOR<StudioCreateWithoutMembershipsInput, StudioUncheckedCreateWithoutMembershipsInput>
  }

  export type MasterUserUpsertWithoutMembershipsInput = {
    update: XOR<MasterUserUpdateWithoutMembershipsInput, MasterUserUncheckedUpdateWithoutMembershipsInput>
    create: XOR<MasterUserCreateWithoutMembershipsInput, MasterUserUncheckedCreateWithoutMembershipsInput>
    where?: MasterUserWhereInput
  }

  export type MasterUserUpdateToOneWithWhereWithoutMembershipsInput = {
    where?: MasterUserWhereInput
    data: XOR<MasterUserUpdateWithoutMembershipsInput, MasterUserUncheckedUpdateWithoutMembershipsInput>
  }

  export type MasterUserUpdateWithoutMembershipsInput = {
    id?: StringFieldUpdateOperationsInput | string
    phone?: StringFieldUpdateOperationsInput | string
    passwordHash?: NullableStringFieldUpdateOperationsInput | string | null
    name?: StringFieldUpdateOperationsInput | string
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    sessions?: SessionUpdateManyWithoutUserNestedInput
  }

  export type MasterUserUncheckedUpdateWithoutMembershipsInput = {
    id?: StringFieldUpdateOperationsInput | string
    phone?: StringFieldUpdateOperationsInput | string
    passwordHash?: NullableStringFieldUpdateOperationsInput | string | null
    name?: StringFieldUpdateOperationsInput | string
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    sessions?: SessionUncheckedUpdateManyWithoutUserNestedInput
  }

  export type StudioUpsertWithoutMembershipsInput = {
    update: XOR<StudioUpdateWithoutMembershipsInput, StudioUncheckedUpdateWithoutMembershipsInput>
    create: XOR<StudioCreateWithoutMembershipsInput, StudioUncheckedCreateWithoutMembershipsInput>
    where?: StudioWhereInput
  }

  export type StudioUpdateToOneWithWhereWithoutMembershipsInput = {
    where?: StudioWhereInput
    data: XOR<StudioUpdateWithoutMembershipsInput, StudioUncheckedUpdateWithoutMembershipsInput>
  }

  export type StudioUpdateWithoutMembershipsInput = {
    id?: StringFieldUpdateOperationsInput | string
    name?: StringFieldUpdateOperationsInput | string
    nameEn?: NullableStringFieldUpdateOperationsInput | string | null
    dbName?: StringFieldUpdateOperationsInput | string
    isActive?: BoolFieldUpdateOperationsInput | boolean
    plan?: StringFieldUpdateOperationsInput | string
    storageQuotaBytes?: BigIntFieldUpdateOperationsInput | bigint | number
    storageUsedBytes?: BigIntFieldUpdateOperationsInput | bigint | number
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type StudioUncheckedUpdateWithoutMembershipsInput = {
    id?: StringFieldUpdateOperationsInput | string
    name?: StringFieldUpdateOperationsInput | string
    nameEn?: NullableStringFieldUpdateOperationsInput | string | null
    dbName?: StringFieldUpdateOperationsInput | string
    isActive?: BoolFieldUpdateOperationsInput | boolean
    plan?: StringFieldUpdateOperationsInput | string
    storageQuotaBytes?: BigIntFieldUpdateOperationsInput | bigint | number
    storageUsedBytes?: BigIntFieldUpdateOperationsInput | bigint | number
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type MasterUserCreateWithoutSessionsInput = {
    id?: string
    phone: string
    passwordHash?: string | null
    name: string
    createdAt?: Date | string
    updatedAt?: Date | string
    memberships?: StudioMembershipCreateNestedManyWithoutUserInput
  }

  export type MasterUserUncheckedCreateWithoutSessionsInput = {
    id?: string
    phone: string
    passwordHash?: string | null
    name: string
    createdAt?: Date | string
    updatedAt?: Date | string
    memberships?: StudioMembershipUncheckedCreateNestedManyWithoutUserInput
  }

  export type MasterUserCreateOrConnectWithoutSessionsInput = {
    where: MasterUserWhereUniqueInput
    create: XOR<MasterUserCreateWithoutSessionsInput, MasterUserUncheckedCreateWithoutSessionsInput>
  }

  export type MasterUserUpsertWithoutSessionsInput = {
    update: XOR<MasterUserUpdateWithoutSessionsInput, MasterUserUncheckedUpdateWithoutSessionsInput>
    create: XOR<MasterUserCreateWithoutSessionsInput, MasterUserUncheckedCreateWithoutSessionsInput>
    where?: MasterUserWhereInput
  }

  export type MasterUserUpdateToOneWithWhereWithoutSessionsInput = {
    where?: MasterUserWhereInput
    data: XOR<MasterUserUpdateWithoutSessionsInput, MasterUserUncheckedUpdateWithoutSessionsInput>
  }

  export type MasterUserUpdateWithoutSessionsInput = {
    id?: StringFieldUpdateOperationsInput | string
    phone?: StringFieldUpdateOperationsInput | string
    passwordHash?: NullableStringFieldUpdateOperationsInput | string | null
    name?: StringFieldUpdateOperationsInput | string
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    memberships?: StudioMembershipUpdateManyWithoutUserNestedInput
  }

  export type MasterUserUncheckedUpdateWithoutSessionsInput = {
    id?: StringFieldUpdateOperationsInput | string
    phone?: StringFieldUpdateOperationsInput | string
    passwordHash?: NullableStringFieldUpdateOperationsInput | string | null
    name?: StringFieldUpdateOperationsInput | string
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    memberships?: StudioMembershipUncheckedUpdateManyWithoutUserNestedInput
  }

  export type StudioMembershipCreateManyStudioInput = {
    id?: string
    userId: string
    role: string
    isActive?: boolean
    createdAt?: Date | string
  }

  export type StudioMembershipUpdateWithoutStudioInput = {
    id?: StringFieldUpdateOperationsInput | string
    role?: StringFieldUpdateOperationsInput | string
    isActive?: BoolFieldUpdateOperationsInput | boolean
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    user?: MasterUserUpdateOneRequiredWithoutMembershipsNestedInput
  }

  export type StudioMembershipUncheckedUpdateWithoutStudioInput = {
    id?: StringFieldUpdateOperationsInput | string
    userId?: StringFieldUpdateOperationsInput | string
    role?: StringFieldUpdateOperationsInput | string
    isActive?: BoolFieldUpdateOperationsInput | boolean
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type StudioMembershipUncheckedUpdateManyWithoutStudioInput = {
    id?: StringFieldUpdateOperationsInput | string
    userId?: StringFieldUpdateOperationsInput | string
    role?: StringFieldUpdateOperationsInput | string
    isActive?: BoolFieldUpdateOperationsInput | boolean
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type StudioMembershipCreateManyUserInput = {
    id?: string
    studioId: string
    role: string
    isActive?: boolean
    createdAt?: Date | string
  }

  export type SessionCreateManyUserInput = {
    id?: string
    token: string
    studioId?: string | null
    role?: string | null
    expiresAt: Date | string
    createdAt?: Date | string
  }

  export type StudioMembershipUpdateWithoutUserInput = {
    id?: StringFieldUpdateOperationsInput | string
    role?: StringFieldUpdateOperationsInput | string
    isActive?: BoolFieldUpdateOperationsInput | boolean
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    studio?: StudioUpdateOneRequiredWithoutMembershipsNestedInput
  }

  export type StudioMembershipUncheckedUpdateWithoutUserInput = {
    id?: StringFieldUpdateOperationsInput | string
    studioId?: StringFieldUpdateOperationsInput | string
    role?: StringFieldUpdateOperationsInput | string
    isActive?: BoolFieldUpdateOperationsInput | boolean
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type StudioMembershipUncheckedUpdateManyWithoutUserInput = {
    id?: StringFieldUpdateOperationsInput | string
    studioId?: StringFieldUpdateOperationsInput | string
    role?: StringFieldUpdateOperationsInput | string
    isActive?: BoolFieldUpdateOperationsInput | boolean
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type SessionUpdateWithoutUserInput = {
    id?: StringFieldUpdateOperationsInput | string
    token?: StringFieldUpdateOperationsInput | string
    studioId?: NullableStringFieldUpdateOperationsInput | string | null
    role?: NullableStringFieldUpdateOperationsInput | string | null
    expiresAt?: DateTimeFieldUpdateOperationsInput | Date | string
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type SessionUncheckedUpdateWithoutUserInput = {
    id?: StringFieldUpdateOperationsInput | string
    token?: StringFieldUpdateOperationsInput | string
    studioId?: NullableStringFieldUpdateOperationsInput | string | null
    role?: NullableStringFieldUpdateOperationsInput | string | null
    expiresAt?: DateTimeFieldUpdateOperationsInput | Date | string
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type SessionUncheckedUpdateManyWithoutUserInput = {
    id?: StringFieldUpdateOperationsInput | string
    token?: StringFieldUpdateOperationsInput | string
    studioId?: NullableStringFieldUpdateOperationsInput | string | null
    role?: NullableStringFieldUpdateOperationsInput | string | null
    expiresAt?: DateTimeFieldUpdateOperationsInput | Date | string
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }



  /**
   * Batch Payload for updateMany & deleteMany & createMany
   */

  export type BatchPayload = {
    count: number
  }

  /**
   * DMMF
   */
  export const dmmf: runtime.BaseDMMF
}