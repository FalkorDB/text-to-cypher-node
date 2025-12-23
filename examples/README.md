# Examples

This directory contains example code demonstrating how to use `@falkordb/text-to-cypher-node`.

## Running Examples

### JavaScript Example

```bash
# Set environment variables
export OPENAI_API_KEY="your-api-key"
export FALKORDB_CONNECTION="falkor://localhost:6379"

# Run the example
node examples/basic-usage.js
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
2. **typescript-usage.ts** - TypeScript example with type safety

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
