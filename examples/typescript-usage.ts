/**
 * TypeScript example for text-to-cypher-node
 */

import { TextToCypher, ClientOptions, TextToCypherResponse } from '../index';

async function main(): Promise<void> {
  // Create client with type safety
  const options: ClientOptions = {
    model: 'gpt-4o-mini',
    apiKey: process.env.OPENAI_API_KEY || 'your-api-key-here',
    falkordbConnection: process.env.FALKORDB_CONNECTION || 'falkor://localhost:6379'
  };

  const client = new TextToCypher(options);
  const graphName = 'movies';

  console.log('=== TypeScript Text-to-Cypher Example ===\n');

  // Type-safe query execution
  try {
    const response: TextToCypherResponse = await client.textToCypher(
      graphName,
      'Find actors who worked with Tom Hanks'
    );

    if (response.status === 'success') {
      console.log('Generated Query:', response.cypherQuery);
      console.log('Result:', response.cypherResult);
      console.log('Answer:', response.answer);
    } else {
      console.error('Error:', response.error);
    }
  } catch (error) {
    if (error instanceof Error) {
      console.error('Exception:', error.message);
    }
  }

  // Schema discovery with type safety
  try {
    const schemaJson: string = await client.discoverSchema(graphName);
    const schema = JSON.parse(schemaJson);
    console.log('\nSchema:', schema);
  } catch (error) {
    if (error instanceof Error) {
      console.error('Schema discovery failed:', error.message);
    }
  }
}

main().catch(console.error);
