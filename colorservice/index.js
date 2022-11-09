const {ApolloServer, gql} = require('apollo-server');
const {buildSubgraphSchema} = require('@apollo/subgraph');
const axios = require('axios');
// A schema is a collection of type definitions (hence "typeDefs")

// that together define the "shape" of queries that are executed against

// your data.

const typeDefs = gql`
	####
	extend schema @link(url: "https://specs.apollo.dev/federation/v2.0", import: ["@key", "@shareable"])
	enum CacheControlScope {
		PUBLIC
		PRIVATE
	}

	directive @cacheControl(
		maxAge: Int
		scope: CacheControlScope
		inheritMaxAge: Boolean
	) on FIELD_DEFINITION | OBJECT | INTERFACE | UNION
	####
	interface Node {
		id: ID!
	}
	type Query @shareable{
		allPersons: [Person!]! @cacheControl(maxAge: 600, scope: PUBLIC)
		person(id: ID!): Person @cacheControl(maxAge: 600, scope: PUBLIC)
	}
	type Mutation {
		changeColor(id:ID!, color: String!):Boolean
	}
	type Person implements Node @key(fields: "id") @cacheControl(maxAge: 600, scope: PUBLIC){
		id: ID!
		lightSaborColor: String!
		homeWorld: World!
		other: [String!]!
	}
	type World implements Node @key(fields: "id") @cacheControl(maxAge: 600, scope: PUBLIC){
		id: ID!
		name: String!
		population: Int
	}
`;
let worlds = [
    {id: "A", name: "Stewjon"},
    {id: "B", name: "Tatooine", population: 200000}];
let persons = [
    {id: "1", lightSaborColor: "blue", homeWorld: worlds[1], other: ["a", "b"]},
    {id: "2", lightSaborColor: "blue", homeWorld: worlds[0], other: ["c", "d"]},
    {id: "3", lightSaborColor: "red", homeWorld: worlds[1], other: ["e", "f"]}]
const resolvers = {
    Query: {
        allPersons() {
            return persons
        }, person(parent, args, context, info) {
            return persons.find(person => person.id === args.id);
        }
    },
    Mutation: {
        async changeColor(parent, args, context, info) {
            if (persons.find(person => person.id = args.id).lightSaborColor) {
                persons.find(person => person.id = args.id).lightSaborColor = args.color
                try {
                    await axios.delete('http://localhost:50000/' + args.id)
                    return true;
                } catch (e) {
                    console.error(e);
                    return false;
                }
            }
            return false
        }
    }, Person: {
        __resolveReference(args, {fetchPersonById}) {
            return persons.find(person => person.id === args.id)
        },
    }, World: {
        __resolveReference(args, {fetchWorldById}) {
            return worlds.find(world => world.id === args.id)
        },
    }
}

const server = new ApolloServer({
    schema: buildSubgraphSchema({typeDefs, resolvers})
});


server.listen(4001).then(({url}) => {
    console.log(`🚀 Server ready at ${url}`);
});
