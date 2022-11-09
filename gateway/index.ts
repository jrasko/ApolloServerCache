const {ApolloServer} = require('apollo-server');
const {ApolloGateway, IntrospectAndCompose} = require('@apollo/gateway');
const express = require('express');
import plugin from './CachePlugin';
import {InMemoryLRUCache} from '@apollo/utils.keyvaluecache';

const app = express()
// Initialize an ApolloGateway instance and pass it
// the supergraph schema as a string
const gateway = new ApolloGateway({
  supergraphSdl: new IntrospectAndCompose({
    subgraphs: [
      {name: "colors", url: "http://localhost:4001/"},
      {name: "names", url: "http://localhost:4002/"}
    ]
  })
});
let cache = new InMemoryLRUCache()
// Pass the ApolloGateway to the ApolloServer constructor
const server = new ApolloServer({
  gateway,
  plugins: [
    plugin({cache: cache})
  ]
});
app.delete("/:id", (req, res) => {
  // Prefix from prefixed cache
  cache.delete("fqc:" + req.params.id).then(success => {
    if (success) {
      console.log("Invalidated Item with ID" + req.params.id)
      res.status(204)
      res.send()
    } else {
      console.log("ID not in Cache:" + req.params.id)
      res.status(404)
      res.send();
    }
  })
})

server.listen().then(({url}) => {
  console.log(`🚀 Server ready at ${url}`);
});
app.listen(50000, () => {
  console.log(`Invalidator ready at Port 50000`)
})
