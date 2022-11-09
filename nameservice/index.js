const {ApolloServer, gql} = require('apollo-server');
const {buildSubgraphSchema} = require('@apollo/subgraph');
const axios = require('axios');

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
	#####
	interface Node {
		id: ID!
	}
	type Query @shareable {
		allPersons: [Person!]! @cacheControl(maxAge: 600, scope: PUBLIC)
		person(id: ID!): Person @cacheControl(maxAge: 600, scope: PUBLIC)
	}
	type Mutation {
		setAge(id:ID!, age: Int!):Boolean
	}

	type Person implements Node @key(fields: "id") @cacheControl(maxAge: 600, inheritMaxAge: true, scope: PUBLIC){
		id: ID!
		name: String!
		age: Int!
		ships: [Ship!]!
	}
	type Ship implements Node @key(fields: "id") @cacheControl(maxAge: 600, inheritMaxAge: true, scope: PUBLIC){
		id: ID!
		name: String!
		spaceable: Boolean!
	}
`;
let ships = [
	{id: "01", name: "jedi fighter", spaceable: true},
	{id: "02", name: "x-wing", spaceable: true},
	{id: "03", name: "podracer",  spaceable: false},
	{id: "04", name: "Tribubble bongo", spaceable: false},
]
let persons = [
    {id: "1", name: "Luke Skywalker", age:19, ships:[ships[1]]},
    {id: "2", name: "Obi-Wan Kenobi", age: 57, ships: [ships[0],ships[3]]},
    {id: "3", name: "Darth Vader", age: 42, ships: [ships[2]]}
]
const resolvers = {
	Query: {
		allPersons() {
			return persons
		},
		person(parent, args, context, info) {
			return persons.find(person => person.id === args.id);
		}
	},
	Mutation: {
		async setAge(parent, args, context, info) {
			if (persons.find(person => person.id = args.id).age) {
				persons.find(person => person.id = args.id).age = args.age
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
	},
	Person: {
		__resolveReference(args, { fetchPersonById }){
			return persons.find(person => person.id === args.id)
		}
	}
}

const server = new ApolloServer({
	schema: buildSubgraphSchema({typeDefs, resolvers})
});


server.listen(4002).then(({url}) => {
	console.log(`🚀 Server ready at ${url}`);
});
