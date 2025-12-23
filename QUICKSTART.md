# Quick Start Guide

Get started with `@falkordb/text-to-cypher-node` in less than 5 minutes!

## Prerequisites

- Node.js 16 or higher
- FalkorDB instance running (or connection to one)
- API key for your chosen AI provider (OpenAI, Anthropic, or Google)

## Installation

```bash
npm install @falkordb/text-to-cypher-node
```

## Basic Usage

### 1. Import and Create Client

```javascript
const { TextToCypher } = require('@falkordb/text-to-cypher-node');

const client = new TextToCypher({
  model: 'gpt-4o-mini',                    // AI model to use
  apiKey: process.env.OPENAI_API_KEY,     // Your API key
  falkordbConnection: 'falkor://localhost:6379'  // FalkorDB connection
});
```

### 2. Ask Questions in Natural Language

```javascript
async function example() {
  // Ask a question in plain English
  const response = await client.textToCypher(
    'movies',  // Graph name
    'Find actors who appeared in movies after 2020'
  );

  console.log('Generated Query:', response.cypherQuery);
  console.log('Results:', response.cypherResult);
  console.log('Answer:', response.answer);
}

example();
```

That's it! You're now converting natural language to Cypher queries.

## Common Use Cases

### Use Case 1: Generate Query for Review

If you want to see the query before executing it:

```javascript
const response = await client.cypherOnly('movies', 'Show me all actors');
console.log('Query:', response.cypherQuery);
// Now you can review, modify, or execute it yourself
```

### Use Case 2: Explore Graph Schema

```javascript
const schema = await client.discoverSchema('movies');
const schemaObj = JSON.parse(schema);
console.log('Nodes:', schemaObj.nodes);
console.log('Relationships:', schemaObj.relationships);
```

### Use Case 3: Conversation Context

```javascript
const response = await client.textToCypherWithMessages('movies', [
  { role: 'user', content: 'Show me actors' },
  { role: 'assistant', content: 'Here are the actors...' },
  { role: 'user', content: 'Now filter those who acted after 2020' }
]);
```

## TypeScript Usage

```typescript
import { TextToCypher, ClientOptions } from '@falkordb/text-to-cypher-node';

const options: ClientOptions = {
  model: 'gpt-4o-mini',
  apiKey: process.env.OPENAI_API_KEY!,
  falkordbConnection: 'falkor://localhost:6379'
};

const client = new TextToCypher(options);

const response = await client.textToCypher('movies', 'Find all actors');
console.log(response.answer);
```

## Environment Variables

Create a `.env` file:

```env
OPENAI_API_KEY=sk-your-key-here
FALKORDB_CONNECTION=falkor://localhost:6379
AI_MODEL=gpt-4o-mini
```

Then use it in your code:

```javascript
require('dotenv').config();

const client = new TextToCypher({
  model: process.env.AI_MODEL,
  apiKey: process.env.OPENAI_API_KEY,
  falkordbConnection: process.env.FALKORDB_CONNECTION
});
```

## Error Handling

```javascript
try {
  const response = await client.textToCypher('movies', 'Find all actors');
  
  if (response.status === 'error') {
    console.error('Error:', response.error);
  } else {
    console.log('Success:', response.answer);
  }
} catch (error) {
  console.error('Exception:', error.message);
}
```

## Supported AI Models

### OpenAI
```javascript
{ model: 'gpt-4o-mini' }
{ model: 'gpt-4o' }
{ model: 'gpt-4-turbo' }
```

### Anthropic
```javascript
{ model: 'anthropic:claude-3-5-sonnet-20241022' }
{ model: 'anthropic:claude-3-opus-20240229' }
```

### Google Gemini
```javascript
{ model: 'gemini:gemini-2.0-flash-exp' }
{ model: 'gemini:gemini-1.5-pro' }
```

## Next Steps

- Check out the [full API documentation](README.md)
- See [integration guide for FalkorDB Browser](INTEGRATION.md)
- Explore [examples directory](examples/) for more use cases
- Read [contributing guide](CONTRIBUTING.md) if you want to contribute

## Need Help?

- [GitHub Issues](https://github.com/FalkorDB/text-to-cypher-node/issues)
- [FalkorDB Discord](https://discord.gg/falkordb)

## Tips

1. **Start with `cypherOnly()`** to see what queries are being generated
2. **Use conversation context** for follow-up questions
3. **Cache schemas** if you're making multiple queries to the same graph
4. **Handle errors gracefully** - AI responses can occasionally fail
5. **Review generated queries** before executing in production

Happy querying! 🚀
