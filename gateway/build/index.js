"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
var ApolloServer = require('apollo-server').ApolloServer;
var _a = require('@apollo/gateway'), ApolloGateway = _a.ApolloGateway, IntrospectAndCompose = _a.IntrospectAndCompose;
var express = require('express');
var CachePlugin_1 = __importDefault(require("./CachePlugin"));
var utils_keyvaluecache_1 = require("@apollo/utils.keyvaluecache");
var app = express();
// Initialize an ApolloGateway instance and pass it
// the supergraph schema as a string
var gateway = new ApolloGateway({
    supergraphSdl: new IntrospectAndCompose({
        subgraphs: [
            { name: "colors", url: "http://localhost:4001/" },
            { name: "names", url: "http://localhost:4002/" }
        ]
    })
});
var cache = new utils_keyvaluecache_1.InMemoryLRUCache();
// Pass the ApolloGateway to the ApolloServer constructor
var server = new ApolloServer({
    gateway: gateway,
    plugins: [
        (0, CachePlugin_1.default)({ cache: cache })
    ]
});
app.delete("/:id", function (req, res) {
    // Prefix from prefixed cache
    cache.delete("fqc:" + req.params.id).then(function (success) {
        if (success) {
            console.log("Invalidated Item with ID" + req.params.id);
            res.status(204);
            res.send();
        }
        else {
            console.log("ID not in Cache:" + req.params.id);
            res.status(404);
            res.send();
        }
    });
});
server.listen().then(function (_a) {
    var url = _a.url;
    console.log("\uD83D\uDE80 Server ready at ".concat(url));
});
app.listen(50000, function () {
    console.log("Invalidator ready at Port 50000");
});
//# sourceMappingURL=index.js.map