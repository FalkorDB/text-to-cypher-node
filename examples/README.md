# Examples

This directory contains example code demonstrating how to use `@falkordb/text-to-cypher`.

## Running Examples

### JavaScript Example

```bash
# Set environment variables
export OPENAI_API_KEY="your-api-key"
export FALKORDB_CONNECTION="falkor://localhost:6379"

# Run the example
node examples/basic-usage.js
```

### Model Discovery Example

```bash
# An API key lets each provider return its live model list; a curated static
# catalog is also merged in, so well-known models appear even without a key.
export OPENAI_API_KEY="your-api-key"

node examples/list-models.js
```

### Token Usage Example

```bash
# Requires a running FalkorDB and a seeded graph so schema discovery succeeds.
docker run -d -p 6379:6379 falkordb/falkordb:latest
redis-cli GRAPH.QUERY demo_graph \
  "MERGE (:Person {name:'Alice'}) MERGE (:Person {name:'Bob'}) MERGE (:Person {name:'Charlie'})"

# Provide an API key (the account must have available quota)
export OPENAI_API_KEY="sk-..."

# MODEL defaults to gpt-5.5; GRAPH_NAME defaults to demo_graph
node examples/token-usage.js

# Or load variables from a .env file (Node >= 20.6)
node --env-file=.env examples/token-usage.js
```

### TypeScript Example

```bash
# Install TypeScript if needed
npm install -g typescript ts-node

# Run the TypeScript example
ts-node examples/typescript-usage.ts
```

## Examples Included

1. **basic-usage.js** - Comprehensive JavaScript example showing all major features
2. **list-models.js** - Model discovery across providers (`listModels` / `listModelsByProvider`)
3. **token-usage.js** - Reading aggregated LLM token usage from `response.tokenUsage`
4. **typescript-usage.ts** - TypeScript example with type safety

## Prerequisites

- FalkorDB instance running on `localhost:6379` (or set `FALKORDB_CONNECTION`)
- Valid OpenAI API key (or API key for your chosen AI provider)
- Sample graph data loaded in FalkorDB

## Creating Sample Data

If you need sample data for testing, you can use FalkorDB's movie graph:

```bash
# Connect to FalkorDB
redis-cli

# Create sample movie graph
GRAPH.QUERY movies "CREATE (:Actor {name: 'Tom Hanks'})-[:ACTED_IN]->(:Movie {title: 'Forrest Gump', year: 1994})"
GRAPH.QUERY movies "CREATE (:Actor {name: 'Robin Williams'})-[:ACTED_IN]->(:Movie {title: 'Good Will Hunting', year: 1997})"
```
