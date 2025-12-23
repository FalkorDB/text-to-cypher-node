/**
 * Basic usage example for text-to-cypher-node
 * 
 * This example demonstrates how to:
 * 1. Create a TextToCypher client
 * 2. Convert natural language to Cypher and execute queries
 * 3. Generate queries without execution
 * 4. Discover graph schema
 */

const { TextToCypher } = require('../index');

async function main() {
  // Create a client with your configuration
  const client = new TextToCypher({
    model: 'gpt-4o-mini',
    apiKey: process.env.OPENAI_API_KEY || 'your-api-key-here',
    falkordbConnection: process.env.FALKORDB_CONNECTION || 'falkor://localhost:6379'
  });

  const graphName = 'movies';

  console.log('=== Text-to-Cypher Node.js Example ===\n');

  // Example 1: Discover Schema
  console.log('1. Discovering graph schema...');
  try {
    const schema = await client.discoverSchema(graphName);
    const schemaObj = JSON.parse(schema);
    console.log('Schema discovered:');
    console.log(JSON.stringify(schemaObj, null, 2));
  } catch (error) {
    console.error('Error discovering schema:', error.message);
  }

  console.log('\n---\n');

  // Example 2: Generate Cypher Query Only
  console.log('2. Generating Cypher query (without execution)...');
  try {
    const response = await client.cypherOnly(
      graphName,
      'Find all actors who appeared in movies released after 2020'
    );
    console.log('Generated query:', response.cypherQuery);
  } catch (error) {
    console.error('Error generating query:', error.message);
  }

  console.log('\n---\n');

  // Example 3: Full Text-to-Cypher with Execution
  console.log('3. Converting text to Cypher and executing...');
  try {
    const response = await client.textToCypher(
      graphName,
      'Show me the top 5 highest rated movies'
    );
    
    if (response.status === 'success') {
      console.log('Query:', response.cypherQuery);
      console.log('Result:', response.cypherResult);
      console.log('Answer:', response.answer);
    } else {
      console.error('Error:', response.error);
    }
  } catch (error) {
    console.error('Error:', error.message);
  }

  console.log('\n---\n');

  // Example 4: Using Conversation History
  console.log('4. Using conversation with multiple messages...');
  try {
    const response = await client.textToCypherWithMessages(graphName, [
      { role: 'user', content: 'Show me actors' },
      { role: 'assistant', content: 'Here are some actors from the graph' },
      { role: 'user', content: 'Now show me only those who acted in movies after 2020' }
    ]);
    
    if (response.status === 'success') {
      console.log('Query:', response.cypherQuery);
      console.log('Answer:', response.answer);
    } else {
      console.error('Error:', response.error);
    }
  } catch (error) {
    console.error('Error:', error.message);
  }
}

// Run the examples
main().catch(console.error);
