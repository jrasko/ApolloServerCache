"use strict";
var __makeTemplateObject = (this && this.__makeTemplateObject) || function (cooked, raw) {
    if (Object.defineProperty) { Object.defineProperty(cooked, "raw", { value: raw }); } else { cooked.raw = raw; }
    return cooked;
};
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
    return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (_) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
var utils_keyvaluecache_1 = require("@apollo/utils.keyvaluecache");
var graphql_tag_1 = __importDefault(require("graphql-tag"));
var SessionMode;
(function (SessionMode) {
    SessionMode[SessionMode["NoSession"] = 0] = "NoSession";
    SessionMode[SessionMode["Private"] = 1] = "Private";
    SessionMode[SessionMode["AuthenticatedPublic"] = 2] = "AuthenticatedPublic";
})(SessionMode || (SessionMode = {}));
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
function isGraphQLQuery(requestContext) {
    var _a;
    return ((_a = requestContext.operation) === null || _a === void 0 ? void 0 : _a.operation) === 'query';
}
function plugin(options) {
    if (options === void 0) { options = Object.create(null); }
    return {
        requestDidStart: function (outerRequestContext) {
            return __awaiter(this, void 0, void 0, function () {
                var cache, sessionId, age;
                return __generator(this, function (_a) {
                    cache = new utils_keyvaluecache_1.PrefixingKeyValueCache(options.cache || outerRequestContext.cache, 'fqc:');
                    sessionId = null;
                    age = null;
                    return [2 /*return*/, {
                            // Read from Cache
                            responseForOperation: function (requestContext) {
                                return __awaiter(this, void 0, void 0, function () {
                                    function recursiveCacheExtract(query, ids) {
                                        return __awaiter(this, void 0, void 0, function () {
                                            var array, _i, ids_1, id, extracted, i, returnset, itemFromCache, _a, _b, field, cacheItemField, _c, _d, _e, _f;
                                            return __generator(this, function (_g) {
                                                switch (_g.label) {
                                                    case 0:
                                                        if (!Array.isArray(ids)) return [3 /*break*/, 5];
                                                        array = [];
                                                        _i = 0, ids_1 = ids;
                                                        _g.label = 1;
                                                    case 1:
                                                        if (!(_i < ids_1.length)) return [3 /*break*/, 4];
                                                        id = ids_1[_i];
                                                        return [4 /*yield*/, recursiveCacheExtract(query, id)];
                                                    case 2:
                                                        extracted = _g.sent();
                                                        if (extracted === undefined) {
                                                            return [2 /*return*/, undefined];
                                                        }
                                                        array.push(extracted);
                                                        _g.label = 3;
                                                    case 3:
                                                        _i++;
                                                        return [3 /*break*/, 1];
                                                    case 4: return [2 /*return*/, array];
                                                    case 5: return [4 /*yield*/, cache.get(ids)];
                                                    case 6:
                                                        i = _g.sent();
                                                        if (i == undefined) {
                                                            return [2 /*return*/, undefined];
                                                        }
                                                        returnset = {};
                                                        itemFromCache = JSON.parse(i);
                                                        _a = 0, _b = query.selectionSet.selections;
                                                        _g.label = 7;
                                                    case 7:
                                                        if (!(_a < _b.length)) return [3 /*break*/, 14];
                                                        field = _b[_a];
                                                        cacheItemField = itemFromCache[field.name.value];
                                                        if (cacheItemField === undefined) {
                                                            // Item liegt nicht im Cache und muss neu abgefragt werden
                                                            return [2 /*return*/, undefined];
                                                        }
                                                        if (!Array.isArray(cacheItemField)) return [3 /*break*/, 9];
                                                        // Fall 1: Feld besitzt Liste mit Referenzen
                                                        _c = returnset;
                                                        _d = field.name.value;
                                                        return [4 /*yield*/, recursiveCacheExtract(field, cacheItemField)];
                                                    case 8:
                                                        // Fall 1: Feld besitzt Liste mit Referenzen
                                                        _c[_d] = _g.sent();
                                                        return [3 /*break*/, 12];
                                                    case 9:
                                                        if (!(cacheItemField instanceof Object)) return [3 /*break*/, 11];
                                                        // Fall 2: Feld ist Referenz auf einzelnes Objekt
                                                        _e = returnset;
                                                        _f = field.name.value;
                                                        return [4 /*yield*/, recursiveCacheExtract(field, cacheItemField.id)];
                                                    case 10:
                                                        // Fall 2: Feld ist Referenz auf einzelnes Objekt
                                                        _e[_f] = _g.sent();
                                                        return [3 /*break*/, 12];
                                                    case 11:
                                                        returnset[field.name.value] = cacheItemField;
                                                        _g.label = 12;
                                                    case 12:
                                                        if (returnset[field.name.value] === undefined) {
                                                            return [2 /*return*/, undefined];
                                                        }
                                                        _g.label = 13;
                                                    case 13:
                                                        _a++;
                                                        return [3 /*break*/, 7];
                                                    case 14: return [2 /*return*/, returnset];
                                                }
                                            });
                                        });
                                    }
                                    function cacheGet(contextualCacheKeyFields) {
                                        return __awaiter(this, void 0, void 0, function () {
                                            var returnset, query, queryRoot, _i, _a, queryName, cacheKey, args, _b, args_1, argument, ids, queryCache;
                                            return __generator(this, function (_c) {
                                                switch (_c.label) {
                                                    case 0:
                                                        returnset = {};
                                                        query = (0, graphql_tag_1.default)(templateObject_1 || (templateObject_1 = __makeTemplateObject(["", ""], ["", ""])), requestContext.request.query);
                                                        queryRoot = query.definitions[0];
                                                        _i = 0, _a = queryRoot.selectionSet.selections;
                                                        _c.label = 1;
                                                    case 1:
                                                        if (!(_i < _a.length)) return [3 /*break*/, 5];
                                                        queryName = _a[_i];
                                                        cacheKey = queryName.name.value;
                                                        args = queryName.arguments;
                                                        if (Array.isArray(args)) {
                                                            args = args.sort(function (a, b) { return a.name.value.localeCompare(b.name.value); });
                                                            for (_b = 0, args_1 = args; _b < args_1.length; _b++) {
                                                                argument = args_1[_b];
                                                                if ("value" in argument.value) {
                                                                    cacheKey += ',' + argument.name.value + ':' + argument.value.value;
                                                                }
                                                                else if ("values" in argument.value) {
                                                                    cacheKey += ',' + argument.name.value + ':' + JSON.stringify(argument.value.values);
                                                                }
                                                                else if ("fields" in argument.value) {
                                                                    cacheKey += ',' + argument.name.value + ':' + JSON.stringify(argument.value.fields);
                                                                }
                                                            }
                                                        }
                                                        return [4 /*yield*/, cache.get(cacheKey)
                                                            // Prüfe ob sich Query im Cache befindet
                                                        ];
                                                    case 2:
                                                        ids = _c.sent();
                                                        // Prüfe ob sich Query im Cache befindet
                                                        if (ids == undefined) {
                                                            return [2 /*return*/, null];
                                                        }
                                                        return [4 /*yield*/, recursiveCacheExtract(queryName, JSON.parse(ids))];
                                                    case 3:
                                                        queryCache = _c.sent();
                                                        // Gebe null zurück, wenn nicht alle Felder im Cache sind
                                                        if (queryCache === undefined) {
                                                            requestContext.logger.debug("No Cache Hit, cache is incomplete");
                                                            console.log("No Cache Hit, cache is incomplete");
                                                            return [2 /*return*/, null];
                                                        }
                                                        // Nutze alias wenn verfügbar
                                                        if (queryName.alias == undefined) {
                                                            returnset[queryName.name.value] = queryCache;
                                                        }
                                                        else {
                                                            returnset[queryName.alias.value] = queryCache;
                                                        }
                                                        _c.label = 4;
                                                    case 4:
                                                        _i++;
                                                        return [3 /*break*/, 1];
                                                    case 5:
                                                        // Setze Felder
                                                        requestContext.metrics.responseCacheHit = true;
                                                        requestContext.logger.debug("Retrieved from Cache: " + JSON.stringify(returnset));
                                                        console.log("Retrieved from Cache: " + JSON.stringify(returnset));
                                                        return [2 /*return*/, { data: returnset }];
                                                }
                                            });
                                        });
                                    }
                                    var extraCacheKeyData, shouldReadFromCache, privateResponse;
                                    return __generator(this, function (_a) {
                                        switch (_a.label) {
                                            case 0:
                                                requestContext.metrics.responseCacheHit = false;
                                                if (!isGraphQLQuery(requestContext) || requestContext.request.operationName == "IntrospectionQuery") {
                                                    return [2 /*return*/, null];
                                                }
                                                extraCacheKeyData = null;
                                                if (!options.sessionId) return [3 /*break*/, 2];
                                                return [4 /*yield*/, options.sessionId(requestContext)];
                                            case 1:
                                                sessionId = _a.sent();
                                                _a.label = 2;
                                            case 2:
                                                if (!options.extraCacheKeyData) return [3 /*break*/, 4];
                                                return [4 /*yield*/, options.extraCacheKeyData(requestContext)];
                                            case 3:
                                                extraCacheKeyData = _a.sent();
                                                _a.label = 4;
                                            case 4:
                                                if (!options.shouldReadFromCache) return [3 /*break*/, 6];
                                                return [4 /*yield*/, options.shouldReadFromCache(requestContext)];
                                            case 5:
                                                shouldReadFromCache = _a.sent();
                                                if (!shouldReadFromCache)
                                                    return [2 /*return*/, null];
                                                _a.label = 6;
                                            case 6:
                                                if (!(sessionId === null)) return [3 /*break*/, 7];
                                                return [2 /*return*/, cacheGet({ sessionMode: SessionMode.NoSession })];
                                            case 7: return [4 /*yield*/, cacheGet({
                                                    sessionId: sessionId,
                                                    sessionMode: SessionMode.Private,
                                                })];
                                            case 8:
                                                privateResponse = _a.sent();
                                                if (privateResponse !== null) {
                                                    return [2 /*return*/, privateResponse];
                                                }
                                                return [2 /*return*/, cacheGet({ sessionMode: SessionMode.AuthenticatedPublic })];
                                        }
                                    });
                                });
                            },
                            // Write to Cache
                            willSendResponse: function (requestContext) {
                                return __awaiter(this, void 0, void 0, function () {
                                    var logger, http, shouldWriteToCache, response, data, policyIfCacheable, cacheObject, cacheQuery;
                                    var _this = this;
                                    return __generator(this, function (_a) {
                                        switch (_a.label) {
                                            case 0:
                                                logger = requestContext.logger || console;
                                                if (!isGraphQLQuery(requestContext)) {
                                                    return [2 /*return*/];
                                                }
                                                if (requestContext.metrics.responseCacheHit) {
                                                    http = requestContext.response.http;
                                                    if (http && age !== null) {
                                                        http.headers.set('age', age.toString());
                                                    }
                                                    return [2 /*return*/];
                                                }
                                                if (!options.shouldWriteToCache) return [3 /*break*/, 2];
                                                return [4 /*yield*/, options.shouldWriteToCache(requestContext)];
                                            case 1:
                                                shouldWriteToCache = _a.sent();
                                                if (!shouldWriteToCache)
                                                    return [2 /*return*/];
                                                _a.label = 2;
                                            case 2:
                                                response = requestContext.response;
                                                data = response.data;
                                                policyIfCacheable = requestContext.overallCachePolicy.policyIfCacheable();
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
                                                    return [2 /*return*/];
                                                }
                                                cacheObject = function (obj) { return __awaiter(_this, void 0, void 0, function () {
                                                    var ids, _i, obj_1, o, id, value, cacheSet, _a, _b, _c, _d, k, v, ids, jsonCacheString;
                                                    return __generator(this, function (_e) {
                                                        switch (_e.label) {
                                                            case 0:
                                                                if (!Array.isArray(obj)) return [3 /*break*/, 5];
                                                                ids = [];
                                                                _i = 0, obj_1 = obj;
                                                                _e.label = 1;
                                                            case 1:
                                                                if (!(_i < obj_1.length)) return [3 /*break*/, 4];
                                                                o = obj_1[_i];
                                                                return [4 /*yield*/, cacheObject(o)];
                                                            case 2:
                                                                id = _e.sent();
                                                                if (id === undefined) {
                                                                    return [2 /*return*/, undefined];
                                                                }
                                                                if (typeof id === "string") {
                                                                    ids.push(id);
                                                                }
                                                                _e.label = 3;
                                                            case 3:
                                                                _i++;
                                                                return [3 /*break*/, 1];
                                                            case 4: return [2 /*return*/, ids];
                                                            case 5:
                                                                if (obj.id === undefined) {
                                                                    return [2 /*return*/, undefined];
                                                                }
                                                                return [4 /*yield*/, cache.get(obj.id)
                                                                    // Create empty CacheSet or with Values in Cache
                                                                ];
                                                            case 6:
                                                                value = _e.sent();
                                                                if (!(value == undefined)) return [3 /*break*/, 7];
                                                                _a = {};
                                                                return [3 /*break*/, 9];
                                                            case 7: return [4 /*yield*/, JSON.parse(value)];
                                                            case 8:
                                                                _a = _e.sent();
                                                                _e.label = 9;
                                                            case 9:
                                                                cacheSet = _a;
                                                                _b = 0, _c = Object.entries(obj);
                                                                _e.label = 10;
                                                            case 10:
                                                                if (!(_b < _c.length)) return [3 /*break*/, 14];
                                                                _d = _c[_b], k = _d[0], v = _d[1];
                                                                if (!(typeof v == 'object' && v !== null)) return [3 /*break*/, 12];
                                                                return [4 /*yield*/, cacheObject(v)];
                                                            case 11:
                                                                ids = _e.sent();
                                                                if (ids === undefined) {
                                                                    return [2 /*return*/, undefined];
                                                                }
                                                                else if (Array.isArray(ids)) {
                                                                    cacheSet[k] = ids;
                                                                }
                                                                else {
                                                                    cacheSet[k] = { id: ids };
                                                                }
                                                                return [3 /*break*/, 13];
                                                            case 12:
                                                                cacheSet[k] = v;
                                                                _e.label = 13;
                                                            case 13:
                                                                _b++;
                                                                return [3 /*break*/, 10];
                                                            case 14:
                                                                jsonCacheString = JSON.stringify(cacheSet);
                                                                requestContext.logger.debug("Saved to Cache: " + jsonCacheString);
                                                                console.log("Saved to Cache: " + jsonCacheString);
                                                                cache.set(obj.id, jsonCacheString);
                                                                return [2 /*return*/, obj.id];
                                                        }
                                                    });
                                                }); };
                                                cacheQuery = function () {
                                                    var reqQuery = (0, graphql_tag_1.default)(templateObject_2 || (templateObject_2 = __makeTemplateObject(["", ""], ["", ""])), requestContext.request.query);
                                                    Object.entries(data).forEach(function (_a, i) {
                                                        var key = _a[0], value = _a[1];
                                                        // Key,Value: Query, Subfield
                                                        return cacheObject(value).then(function (id) {
                                                            if (id === undefined) {
                                                                requestContext.logger.debug("Could not cache item due to missing ids");
                                                                console.log("Could not cache item due to missing ids");
                                                                return;
                                                            }
                                                            var query = reqQuery.definitions[0].selectionSet.selections[i];
                                                            var cacheKey = query.name.value;
                                                            // Query Params:
                                                            var args = query.arguments;
                                                            if (Array.isArray(args)) {
                                                                args = args.sort(function (a, b) { return a.name.value.localeCompare(b.name.value); });
                                                                for (var _i = 0, args_2 = args; _i < args_2.length; _i++) {
                                                                    var argument = args_2[_i];
                                                                    if ("value" in argument.value) {
                                                                        cacheKey += ',' + argument.name.value + ':' + argument.value.value;
                                                                    }
                                                                    else if ("values" in argument.value) {
                                                                        cacheKey += ',' + argument.name.value + ':' + JSON.stringify(argument.value.values);
                                                                    }
                                                                    else if ("fields" in argument.value) {
                                                                        cacheKey += ',' + argument.name.value + ':' + JSON.stringify(argument.value.fields);
                                                                    }
                                                                }
                                                            }
                                                            var queryValues = JSON.stringify(id);
                                                            cache.set(cacheKey, queryValues);
                                                            requestContext.logger.debug("Saved to Cache: \"" + cacheKey + "\":" + queryValues);
                                                            console.log("Saved to Cache: \"" + cacheKey + "\":" + queryValues);
                                                        });
                                                    });
                                                };
                                                cacheQuery();
                                                return [2 /*return*/];
                                        }
                                    });
                                });
                            },
                        }];
                });
            });
        },
    };
}
exports.default = plugin;
var templateObject_1, templateObject_2;
//# sourceMappingURL=CachePlugin.js.map