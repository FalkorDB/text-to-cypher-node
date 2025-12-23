# @falkordb/text-to-cypher

Node.js bindings for the [FalkorDB text-to-cypher](https://github.com/FalkorDB/text-to-cypher) library - Convert natural language to Cypher queries using AI.

[![npm version](https://img.shields.io/npm/v/@falkordb/text-to-cypher.svg)](https://www.npmjs.com/package/@falkordb/text-to-cypher)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

## Features

- 🤖 **AI-Powered**: Convert natural language questions to Cypher queries using GPT-4, Claude, Gemini, and other AI models
- 🔍 **Schema Discovery**: Automatically discovers and analyzes graph database schemas
- ✅ **Query Validation**: Built-in validation to catch syntax errors before execution
- 🚀 **High Performance**: Native Rust implementation with Node.js bindings via NAPI-RS
- 🌍 **Cross-Platform**: Pre-built binaries for Linux, macOS, and Windows
- 📦 **Zero Dependencies**: No runtime dependencies required

## Installation

```bash
npm install @falkordb/text-to-cypher
```

**📚 New to this library? Check out the [Quick Start Guide](QUICKSTART.md) for a 5-minute introduction!**

## Quick Start

```javascript
const { TextToCypher } = require('@falkordb/text-to-cypher');

// Create a client
const client = new TextToCypher({
  model: 'gpt-4o-mini',
  apiKey: process.env.OPENAI_API_KEY,
  falkordbConnection: 'falkor://localhost:6379'
});

// Convert text to Cypher and execute
async function main() {
  const response = await client.textToCypher(
    'movies',
    'Find all actors who appeared in movies released after 2020'
  );

  console.log('Generated Query:', response.cypherQuery);
  console.log('Result:', response.cypherResult);
  console.log('Answer:', response.answer);
}

main().catch(console.error);
```

## API Reference

### `new TextToCypher(options)`

Creates a new text-to-cypher client.

**Parameters:**
- `options.model` (string): AI model to use (e.g., `'gpt-4o-mini'`, `'anthropic:claude-3'`, `'gemini:gemini-2.0-flash-exp'`)
- `options.apiKey` (string): API key for the AI service
- `options.falkordbConnection` (string): FalkorDB connection string (e.g., `'falkor://localhost:6379'`)

**Example:**
```javascript
const client = new TextToCypher({
  model: 'gpt-4o-mini',
  apiKey: 'sk-...',
  falkordbConnection: 'falkor://localhost:6379'
});
```

### `textToCypher(graphName, question)`

Converts natural language to Cypher, executes the query, and generates a natural language answer.

**Parameters:**
- `graphName` (string): Name of the graph to query
- `question` (string): Natural language question

**Returns:** `Promise<TextToCypherResponse>`

**Example:**
```javascript
const response = await client.textToCypher('movies', 'Who directed The Matrix?');
console.log(response.answer); // "The Matrix was directed by..."
```

### `textToCypherWithMessages(graphName, messages)`

Same as `textToCypher` but accepts multiple messages for conversation context.

**Parameters:**
- `graphName` (string): Name of the graph to query
- `messages` (Array<Message>): Array of conversation messages

**Example:**
```javascript
const response = await client.textToCypherWithMessages('movies', [
  { role: 'user', content: 'Show me actors' },
  { role: 'assistant', content: 'Here are some actors...' },
  { role: 'user', content: 'Filter those who acted after 2020' }
]);
```

### `cypherOnly(graphName, question)`

Generates a Cypher query without executing it.

**Parameters:**
- `graphName` (string): Name of the graph
- `question` (string): Natural language question

**Returns:** `Promise<TextToCypherResponse>` (with only `schema` and `cypherQuery` populated)

**Example:**
```javascript
const response = await client.cypherOnly('movies', 'Find all actors');
console.log('Generated query:', response.cypherQuery);
// Use the query however you want
```

### `discoverSchema(graphName)`

Discovers and returns the schema of a graph as JSON.

**Parameters:**
- `graphName` (string): Name of the graph

**Returns:** `Promise<string>` (JSON string)

**Example:**
```javascript
const schema = await client.discoverSchema('movies');
const schemaObj = JSON.parse(schema);
console.log('Nodes:', schemaObj.nodes);
console.log('Relationships:', schemaObj.relationships);
```

## Types

### TextToCypherResponse

```typescript
interface TextToCypherResponse {
  status: string;           // "success" or "error"
  schema?: string;          // JSON schema of the graph
  cypherQuery?: string;     // Generated Cypher query
  cypherResult?: string;    // Query execution result
  answer?: string;          // Natural language answer
  error?: string;           // Error message if status is "error"
}
```

### Message

```typescript
interface Message {
  role: string;    // "user", "assistant", or "system"
  content: string; // Message content
}
```

## Supported AI Models

This library uses the [genai](https://crates.io/crates/genai) crate and supports:

- **OpenAI**: `gpt-4o-mini`, `gpt-4o`, `gpt-4-turbo`, etc.
- **Anthropic**: `anthropic:claude-3-5-sonnet-20241022`, `anthropic:claude-3-opus-20240229`
- **Google Gemini**: `gemini:gemini-2.0-flash-exp`, `gemini:gemini-1.5-pro`

See [genai documentation](https://docs.rs/genai/latest/genai/) for a complete list.

## Examples

### Using with FalkorDB Browser

```javascript
const { TextToCypher } = require('@falkordb/text-to-cypher');

// In your Express.js or other Node.js server
app.post('/api/text-to-cypher', async (req, res) => {
  const { graphName, question } = req.body;

  try {
    const client = new TextToCypher({
      model: 'gpt-4o-mini',
      apiKey: process.env.OPENAI_API_KEY,
      falkordbConnection: process.env.FALKORDB_CONNECTION
    });

    const response = await client.textToCypher(graphName, question);
    res.json(response);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
```

### TypeScript Usage

```typescript
import { TextToCypher, ClientOptions, TextToCypherResponse } from '@falkordb/text-to-cypher';

const options: ClientOptions = {
  model: 'gpt-4o-mini',
  apiKey: process.env.OPENAI_API_KEY!,
  falkordbConnection: 'falkor://localhost:6379'
};

const client = new TextToCypher(options);

const response: TextToCypherResponse = await client.textToCypher(
  'movies',
  'Find top 10 highest rated movies'
);

console.log(response.answer);
```

### Error Handling

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

## Requirements

- Node.js >= 20
- FalkorDB instance running and accessible
- API key for your chosen AI provider (OpenAI, Anthropic, etc.)

## Development

### Building from Source

```bash
# Install dependencies
npm install

# Build the native module
npm run build

# Run tests
npm test
```

### Prerequisites for Building

- Rust toolchain (install from [rustup.rs](https://rustup.rs/))
- Node.js >= 20
- C++ compiler (platform-specific)

## Platform Support

Pre-built binaries are available for:

- Linux x64 (glibc and musl)
- Linux ARM64 (glibc and musl)
- macOS x64 (Intel)
- macOS ARM64 (Apple Silicon)
- Windows x64

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

MIT License - see [LICENSE](LICENSE) file for details.

## Related Projects

- [text-to-cypher](https://github.com/FalkorDB/text-to-cypher) - The underlying Rust library
- [falkordb-browser](https://github.com/FalkorDB/falkordb-browser) - FalkorDB web interface
- [FalkorDB](https://github.com/FalkorDB/FalkorDB) - Graph database

## Support

- [GitHub Issues](https://github.com/FalkorDB/text-to-cypher-node/issues)
- [FalkorDB Discord](https://discord.gg/falkordb)

## Acknowledgments

Built with [NAPI-RS](https://napi.rs/) - A framework for building compiled Node.js add-ons in Rust. 
