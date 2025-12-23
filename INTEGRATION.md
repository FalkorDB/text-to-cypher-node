# Integration Guide for FalkorDB Browser

This guide explains how to integrate `@falkordb/text-to-cypher-node` into the [FalkorDB Browser](https://github.com/FalkorDB/falkordb-browser).

## Overview

The FalkorDB Browser can use text-to-cypher-node to provide a natural language interface for querying graphs. Users can ask questions in plain English instead of writing Cypher queries.

## Installation

In your FalkorDB Browser project:

```bash
npm install @falkordb/text-to-cypher-node
```

## Backend Integration (Node.js/Express)

### 1. Create a Text-to-Cypher Service

```typescript
// services/textToCypherService.ts
import { TextToCypher, TextToCypherResponse } from '@falkordb/text-to-cypher-node';

export class TextToCypherService {
  private client: TextToCypher;

  constructor(
    model: string = process.env.AI_MODEL || 'gpt-4o-mini',
    apiKey: string = process.env.OPENAI_API_KEY || '',
    falkordbConnection: string = process.env.FALKORDB_CONNECTION || 'falkor://localhost:6379'
  ) {
    this.client = new TextToCypher({
      model,
      apiKey,
      falkordbConnection
    });
  }

  async convertQuery(graphName: string, question: string): Promise<TextToCypherResponse> {
    return await this.client.textToCypher(graphName, question);
  }

  async generateCypherOnly(graphName: string, question: string): Promise<TextToCypherResponse> {
    return await this.client.cypherOnly(graphName, question);
  }

  async getSchema(graphName: string): Promise<string> {
    return await this.client.discoverSchema(graphName);
  }
}
```

### 2. Create API Endpoints

```typescript
// routes/textToCypher.ts
import { Router, Request, Response } from 'express';
import { TextToCypherService } from '../services/textToCypherService';

const router = Router();
const textToCypherService = new TextToCypherService();

// Convert natural language to Cypher and execute
router.post('/api/text-to-cypher', async (req: Request, res: Response) => {
  try {
    const { graphName, question } = req.body;

    if (!graphName || !question) {
      return res.status(400).json({
        error: 'Missing required fields: graphName and question'
      });
    }

    const response = await textToCypherService.convertQuery(graphName, question);

    if (response.status === 'error') {
      return res.status(500).json(response);
    }

    res.json(response);
  } catch (error) {
    res.status(500).json({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Generate Cypher only (for preview)
router.post('/api/generate-cypher', async (req: Request, res: Response) => {
  try {
    const { graphName, question } = req.body;

    if (!graphName || !question) {
      return res.status(400).json({
        error: 'Missing required fields: graphName and question'
      });
    }

    const response = await textToCypherService.generateCypherOnly(graphName, question);

    if (response.status === 'error') {
      return res.status(500).json(response);
    }

    res.json(response);
  } catch (error) {
    res.status(500).json({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Get graph schema
router.get('/api/schema/:graphName', async (req: Request, res: Response) => {
  try {
    const { graphName } = req.params;
    const schema = await textToCypherService.getSchema(graphName);
    res.json({ schema: JSON.parse(schema) });
  } catch (error) {
    res.status(500).json({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export default router;
```

### 3. Register Routes in Your App

```typescript
// app.ts
import express from 'express';
import textToCypherRoutes from './routes/textToCypher';

const app = express();

app.use(express.json());
app.use(textToCypherRoutes);

// ... other routes and middleware

export default app;
```

## Frontend Integration (React)

### 1. Create a Text-to-Cypher Hook

```typescript
// hooks/useTextToCypher.ts
import { useState } from 'react';

interface TextToCypherResponse {
  status: string;
  schema?: string;
  cypherQuery?: string;
  cypherResult?: string;
  answer?: string;
  error?: string;
}

export const useTextToCypher = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const convertQuery = async (
    graphName: string,
    question: string
  ): Promise<TextToCypherResponse | null> => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/text-to-cypher', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ graphName, question }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to convert query');
      }

      return data;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMessage);
      return null;
    } finally {
      setLoading(false);
    }
  };

  const generateCypher = async (
    graphName: string,
    question: string
  ): Promise<TextToCypherResponse | null> => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/generate-cypher', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ graphName, question }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to generate query');
      }

      return data;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMessage);
      return null;
    } finally {
      setLoading(false);
    }
  };

  return { convertQuery, generateCypher, loading, error };
};
```

### 2. Create a Natural Language Query Component

```typescript
// components/NaturalLanguageQuery.tsx
import React, { useState } from 'react';
import { useTextToCypher } from '../hooks/useTextToCypher';

interface Props {
  graphName: string;
  onQueryGenerated?: (query: string) => void;
  onResultReceived?: (result: string, answer: string) => void;
}

export const NaturalLanguageQuery: React.FC<Props> = ({
  graphName,
  onQueryGenerated,
  onResultReceived,
}) => {
  const [question, setQuestion] = useState('');
  const { convertQuery, generateCypher, loading, error } = useTextToCypher();

  const handleConvert = async () => {
    const response = await convertQuery(graphName, question);
    if (response && response.status === 'success') {
      if (response.cypherQuery) {
        onQueryGenerated?.(response.cypherQuery);
      }
      if (response.cypherResult && response.answer) {
        onResultReceived?.(response.cypherResult, response.answer);
      }
    }
  };

  const handleGenerateOnly = async () => {
    const response = await generateCypher(graphName, question);
    if (response && response.cypherQuery) {
      onQueryGenerated?.(response.cypherQuery);
    }
  };

  return (
    <div className="natural-language-query">
      <h3>Ask a Question</h3>
      <textarea
        value={question}
        onChange={(e) => setQuestion(e.target.value)}
        placeholder="e.g., Find all actors who appeared in movies after 2020"
        disabled={loading}
      />
      <div className="buttons">
        <button onClick={handleConvert} disabled={loading || !question}>
          {loading ? 'Processing...' : 'Execute Query'}
        </button>
        <button onClick={handleGenerateOnly} disabled={loading || !question}>
          Generate Query Only
        </button>
      </div>
      {error && <div className="error">{error}</div>}
    </div>
  );
};
```

## Environment Variables

Create a `.env` file in your project:

```env
# AI Model Configuration
AI_MODEL=gpt-4o-mini
OPENAI_API_KEY=your-openai-api-key-here

# FalkorDB Connection
FALKORDB_CONNECTION=falkor://localhost:6379

# Optional: for other AI providers
# ANTHROPIC_API_KEY=your-anthropic-key
# GOOGLE_API_KEY=your-google-key
```

## Usage Examples

### Example 1: Simple Query

User asks: "Show me all actors"

Response:
- Generated Query: `MATCH (a:Actor) RETURN a.name`
- Result: List of actor names
- Answer: "Here are all the actors in the database: Tom Hanks, Meryl Streep, ..."

### Example 2: Complex Query

User asks: "Find actors who worked with Tom Hanks in movies released after 2000"

Response:
- Generated Query: `MATCH (a:Actor)-[:ACTED_IN]->(m:Movie)<-[:ACTED_IN]-(coactor:Actor {name: 'Tom Hanks'}) WHERE m.year > 2000 RETURN DISTINCT a.name`
- Result: List of co-actors
- Answer: "Tom Hanks worked with the following actors in movies after 2000: ..."

## Best Practices

1. **Rate Limiting**: Implement rate limiting on the API endpoints to prevent abuse
2. **Caching**: Cache schema discovery results to reduce database queries
3. **Error Handling**: Provide helpful error messages to users
4. **User Feedback**: Show the generated Cypher query to users for transparency
5. **Query Validation**: Always validate and sanitize queries before execution

## Security Considerations

1. Never expose your AI API keys in frontend code
2. Implement proper authentication for the API endpoints
3. Use read-only connections when possible
4. Consider implementing a query whitelist for production environments
5. Monitor usage to detect potential abuse

## Troubleshooting

### Issue: "Cannot connect to FalkorDB"

Solution: Ensure FalkorDB is running and the connection string is correct.

### Issue: "Invalid API key"

Solution: Check that your AI provider API key is set correctly in environment variables.

### Issue: "Query generation failed"

Solution: The AI model might need more context. Try rephrasing the question or providing more specific details.

## Support

For issues or questions:
- [text-to-cypher-node GitHub Issues](https://github.com/FalkorDB/text-to-cypher-node/issues)
- [FalkorDB Discord](https://discord.gg/falkordb)
