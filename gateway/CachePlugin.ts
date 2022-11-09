import type {ApolloServerPlugin, GraphQLRequestListener,} from 'apollo-server-plugin-base';
import type {GraphQLRequestContext, GraphQLResponse, ValueOrPromise,} from 'apollo-server-types';
import {KeyValueCache, PrefixingKeyValueCache,} from '@apollo/utils.keyvaluecache';
import gql from 'graphql-tag';

// XXX This should use createSHA from apollo-server-core in order to work on
// non-Node environments. I'm not sure where that should end up ---
// apollo-server-sha as its own tiny module? apollo-server-env seems bad because
// that would add sha.js to unnecessary places, I think?
import {FieldNode} from "graphql";
import {OperationDefinitionNode} from "graphql/language/ast";

interface Options<TContext = Record<string, any>> {
  // Underlying cache used to save results. All writes will be under keys that
  // start with 'fqc:' and are followed by a fixed-size cryptographic hash of a
  // JSON object with keys representing the query document, operation name,
  // variables, and other keys derived from the sessionId and extraCacheKeyData
  // hooks. If not provided, use the cache in the GraphQLRequestContext instead
  // (ie, the cache passed to the ApolloServer constructor).
  cache?: KeyValueCache;

  // Define this hook if you're setting any cache hints with scope PRIVATE.
  // This should return a session ID if the user is "logged in", or null if
  // there is no "logged in" user.
  //
  // If a cacheable response has any PRIVATE nodes, then:
  // - If this hook is not defined, a warning will be logged and it will not be cached.
  // - Else if this hook returns null, it will not be cached.
  // - Else it will be cached under a cache key tagged with the session ID and
  //   mode "private".
  //
  // If a cacheable response has no PRIVATE nodes, then:
  // - If this hook is not defined or returns null, it will be cached under a cache
  //   key tagged with the mode "no session".
  // - Else it will be cached under a cache key tagged with the mode
  //   "authenticated public".
  //
  // When reading from the cache:
  // - If this hook is not defined or returns null, look in the cache under a cache
  //   key tagged with the mode "no session".
  // - Else look in the cache under a cache key tagged with the session ID and the
  //   mode "private". If no response is found in the cache, then look under a cache
  //   key tagged with the mode "authenticated public".
  //
  // This allows the cache to provide different "public" results to anonymous
  // users and logged in users ("no session" vs "authenticated public").
  //
  // A common implementation of this hook would be to look in
  // requestContext.request.http.headers for a specific authentication header or
  // cookie.
  //
  // This hook may return a promise because, for example, you might need to
  // validate a cookie against an external service.
  sessionId?(
      requestContext: GraphQLRequestContext<TContext>,
  ): ValueOrPromise<string | null>;

  // Define this hook if you want the cache key to vary based on some aspect of
  // the request other than the query document, operation name, variables, and
  // session ID. For example, responses that include translatable text may want
  // to return a string derived from
  // requestContext.request.http.headers.get('Accept-Language'). The data may
  // be anything that can be JSON-stringified.
  extraCacheKeyData?(
      requestContext: GraphQLRequestContext<TContext>,
  ): ValueOrPromise<any>;

  // If this hook is defined and returns false, the plugin will not read
  // responses from the cache.
  shouldReadFromCache?(
      requestContext: GraphQLRequestContext<TContext>,
  ): ValueOrPromise<boolean>;

  // If this hook is defined and returns false, the plugin will not write the
  // response to the cache.
  shouldWriteToCache?(
      requestContext: GraphQLRequestContext<TContext>,
  ): ValueOrPromise<boolean>;

  // This hook allows one to replace the function that is used to create a cache
  // key. By default, it is the SHA-256 (from the Node `crypto` package) of the result of
  // calling `JSON.stringify(keyData)`. You can override this to customize the serialization
  // or the hash, or to make other changes like adding a prefix to keys to allow for
  // app-specific prefix-based cache invalidation. You may assume that `keyData` is an object
  // and that all relevant data will be found by the kind of iteration performed by
  // `JSON.stringify`, but you should not assume anything about the particular fields on
  // `keyData`.
  generateCacheKey?(
      requestContext: GraphQLRequestContext<Record<string, any>>,
      keyData: unknown,
  ): string;
}

enum SessionMode {
  NoSession,
  Private,
  AuthenticatedPublic,
}


interface ContextualCacheKeyData {
  sessionMode: SessionMode;
  sessionId?: string | null;
}

// We split the CacheKey type into two pieces just for convenience in the code
// below. Note that we don't actually export this type publicly (the
// generateCacheKey hook gets an `unknown` argument).
/*
interface CacheValue {
  // Note: we only store data responses in the cache, not errors.
  //
  // There are two reasons we don't cache errors. The user-level reason is that
  // we think that in general errors are less cacheable than real results, since
  // they might indicate something transient like a failure to talk to a
  // backend. (If you need errors to be cacheable, represent the erroneous
  // condition explicitly in data instead of out-of-band as an error.) The
  // implementation reason is that this lets us avoid complexities around
  // serialization and deserialization of GraphQL errors, and the distinction
  // between formatted and unformatted errors, etc.
  data: Record<string, any>;
  cachePolicy: Required<CacheHint>;
  cacheTime: number; // epoch millis, used to calculate Age header
}
*/
interface CacheReference {
  __ref: string | string[]
}

function isGraphQLQuery(requestContext: GraphQLRequestContext<any>) {
  return requestContext.operation?.operation === 'query';
}

export default function plugin(
    options: Options = Object.create(null),
): ApolloServerPlugin {
  return {
    async requestDidStart(
        outerRequestContext: GraphQLRequestContext<any>,
    ): Promise<GraphQLRequestListener<any>> {
      const cache = new PrefixingKeyValueCache(
          options.cache || outerRequestContext.cache!,
          'fqc:',
      );

      let sessionId: string | null = null;
      let age: number | null = null;

      return {
        // Read from Cache
        async responseForOperation(
            requestContext,
        ): Promise<GraphQLResponse | null> {
          requestContext.metrics.responseCacheHit = false;

          if (!isGraphQLQuery(requestContext) || requestContext.request.operationName == "IntrospectionQuery") {
            return null;
          }

          async function recursiveCacheExtract(query: FieldNode, ids: CacheReference) {
            if (Array.isArray(ids.__ref)) {
              // Mehrere Objekte werden abgefragt
              let array = []
              for (const id of ids.__ref) {
                let extracted = await recursiveCacheExtract(query, {__ref: id});
                if (extracted === undefined) {
                  return undefined
                }
                array.push(extracted)
              }
              return array
            }
            // ein einzelnes Objekt wird abgefragt
            const i = await cache.get(ids.__ref)
            if (i == undefined) {
              return undefined
            }
            let returnset = {}
            let itemFromCache = JSON.parse(i)
            // Iteriere über Felder der Query
            for (const field of <FieldNode[]>query.selectionSet.selections) {
              let cacheItemField = itemFromCache[field.name.value];
              if (cacheItemField === undefined) {
                // Item liegt nicht im Cache und muss neu abgefragt werden
                return undefined
              }
              if (cacheItemField instanceof Object && !Array.isArray(cacheItemField)) {
                // Fall 2: Feld ist Referenz auf einzelnes Objekt
                returnset[field.name.value] = await recursiveCacheExtract(field, cacheItemField);

              } else {
                returnset[field.name.value] = cacheItemField
              }
              if (returnset[field.name.value] === undefined) {
                return undefined
              }
            }
            return returnset
          }

          async function cacheGet(
              contextualCacheKeyFields: ContextualCacheKeyData,
          ): Promise<GraphQLResponse | null> {
            // TODO Sessionmode
            const returnset = {};
            const query = gql`${requestContext.request.query}`;
            let queryRoot = <OperationDefinitionNode>query.definitions[0];
            // iteriere über alle Queries
            for (const queryName of <FieldNode[]>queryRoot.selectionSet.selections) {
              let cacheKey = queryName.name.value
              // Query Params:
              let args = queryName.arguments;
              if (Array.isArray(args)) {
                args = args.sort((a, b) => a.name.value.localeCompare(b.name.value))
                for (const argument of args) {
                  if ("value" in argument.value) {
                    cacheKey += ',' + argument.name.value + ':' + argument.value.value
                  } else if ("values" in argument.value) {
                    cacheKey += ',' + argument.name.value + ':' + JSON.stringify(argument.value.values)
                  } else if ("fields" in argument.value) {
                    cacheKey += ',' + argument.name.value + ':' + JSON.stringify(argument.value.fields)
                  }
                }
              }
              let ids = await cache.get(cacheKey)
              // Prüfe ob sich Query im Cache befindet
              if (ids == undefined) {
                return null
              }
              let queryCache = await recursiveCacheExtract(queryName, JSON.parse(ids));
              // Gebe null zurück, wenn nicht alle Felder im Cache sind
              if (queryCache === undefined) {
                requestContext.logger.debug("No Cache Hit, cache is incomplete")
                console.log("No Cache Hit, cache is incomplete")
                return null
              }
              // Nutze alias wenn verfügbar
              if (queryName.alias == undefined) {
                returnset[queryName.name.value] = queryCache
              } else {
                returnset[queryName.alias.value] = queryCache
              }
            }
            // Setze Felder
            requestContext.metrics.responseCacheHit = true;
            requestContext.logger.debug("Retrieved from Cache: " + JSON.stringify(returnset))
            console.log("Retrieved from Cache: " + JSON.stringify(returnset))
            return {data: returnset}
          }

          // Call hooks. Save values which will be used in willSendResponse as well.
          let extraCacheKeyData: any = null;
          if (options.sessionId) {
            sessionId = await options.sessionId(requestContext);
          }
          if (options.extraCacheKeyData) {
            extraCacheKeyData = await options.extraCacheKeyData(requestContext);
          }

          // Note that we set up sessionId and baseCacheKey before doing this
          // check, so that we can still write the result to the cache even if
          // we are told not to read from the cache.
          if (options.shouldReadFromCache) {
            const shouldReadFromCache = await options.shouldReadFromCache(
                requestContext,
            );
            if (!shouldReadFromCache) return null;
          }

          if (sessionId === null) {
            return cacheGet({sessionMode: SessionMode.NoSession});
          } else {
            const privateResponse = await cacheGet({
              sessionId,
              sessionMode: SessionMode.Private,
            });
            if (privateResponse !== null) {
              return privateResponse;
            }
            return cacheGet({sessionMode: SessionMode.AuthenticatedPublic});
          }
        },
        // Write to Cache
        async willSendResponse(requestContext) {
          const logger = requestContext.logger || console;

          if (!isGraphQLQuery(requestContext)) {
            return;
          }

          if (requestContext.metrics.responseCacheHit) {
            // Never write back to the cache what we just read from it. But do set the Age header!
            const http = requestContext.response.http;
            if (http && age !== null) {
              http.headers.set('age', age.toString());
            }
            return;
          }

          if (options.shouldWriteToCache) {
            const shouldWriteToCache = await options.shouldWriteToCache(
                requestContext,
            );
            if (!shouldWriteToCache) return;
          }

          const {response} = requestContext;
          const {data} = response;
          const policyIfCacheable =
              requestContext.overallCachePolicy.policyIfCacheable();
          if (response.errors || !data || Object.keys(data).includes("__schema")) {
            // ~Ignoriere Introspections
            // This plugin never caches errors or anything without a cache policy.
            //
            // There are two reasons we don't cache errors. The user-level
            // reason is that we think that in general errors are less cacheable
            // than real results, since they might indicate something transient
            // like a failure to talk to a backend. (If you need errors to be
            // cacheable, represent the erroneous condition explicitly in data
            // instead of out-of-band as an error.) The implementation reason is
            // that this lets us avoid complexities around serialization and
            // deserialization of GraphQL errors, and the distinction between
            // formatted and unformatted errors, etc.
            return;
          }

          type cacheID = string[] | string | undefined;
          const cacheObject = async (obj: any): Promise<cacheID> => {
            if (obj === null) {
              return null
            }
            if (Array.isArray(obj)) {
              let ids: string[] = []
              for (const o of obj) {
                let id = await cacheObject(o)
                if (id === undefined) {
                  return undefined
                }
                if (typeof id === "string") {
                  ids.push(id)
                }
              }
              return ids
            }
            if (obj.id === undefined) {
              return undefined
            }
            // Search Cache
            const value = await cache.get(obj.id)
            // Create empty CacheSet or with Values in Cache
            const cacheSet = (value == undefined) ? {} : await JSON.parse(value);
            for (const [k, v] of Object.entries(obj)) {
              if (typeof v == 'object' && v != null) {
                // start recursive call to cache this object seperate
                let ids = await cacheObject(v);
                if (ids === undefined) {
                  // List of primitive datatypes
                  cacheSet[k] = v
                } else {
                  cacheSet[k] = {__ref: ids}
                }
              } else {
                cacheSet[k] = v
              }
            }
            let jsonCacheString = JSON.stringify(cacheSet);
            requestContext.logger.debug("Saved to Cache: " + jsonCacheString)
            console.log("Saved to Cache: " + jsonCacheString)
            cache.set(obj.id, jsonCacheString)
            return obj.id
          }
          const cacheQuery = (): void => {
            const reqQuery = gql`${requestContext.request.query}`;
            Object.entries(data).forEach(([key, value], i) => {
              // Key,Value: Query, Subfield
              return cacheObject(value).then((id) => {
                if (id === undefined) {
                  requestContext.logger.debug("Could not cache item due to missing ids")
                  console.log("Could not cache item due to missing ids")
                  return;
                }
                const query = (<FieldNode>(<OperationDefinitionNode>reqQuery.definitions[0]).selectionSet.selections[i]);
                let cacheKey = query.name.value
                // Query Params:
                let args = query.arguments;
                if (Array.isArray(args)) {
                  args = args.sort((a, b) => a.name.value.localeCompare(b.name.value))
                  for (const argument of args) {
                    // Add query arguments
                    if ("value" in argument.value) {
                      cacheKey += ',' + argument.name.value + ':' + argument.value.value
                    } else if ("values" in argument.value) {
                      cacheKey += ',' + argument.name.value + ':' + JSON.stringify(argument.value.values)
                    } else if ("fields" in argument.value) {
                      cacheKey += ',' + argument.name.value + ':' + JSON.stringify(argument.value.fields)
                    }
                  }
                }
                let queryValues = JSON.stringify({__ref: id});
                cache.set(cacheKey, queryValues)
                requestContext.logger.debug("Saved to Cache: \"" + cacheKey + "\":" + queryValues)
                console.log("Saved to Cache: \"" + cacheKey + "\":" + queryValues)
              })
            })
          };
          cacheQuery();
        },
      };
    },
  };
}
