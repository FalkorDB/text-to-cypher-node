/**
 * Model Discovery Example for @falkordb/text-to-cypher
 *
 * This example demonstrates how to:
 * 1. List all available models across all providers
 * 2. List models from specific providers (OpenAI, Anthropic, Gemini, Ollama)
 * 3. Handle provider-specific model naming conventions
 * 4. Use the discovered models in your client configuration
 *
 * Note: This queries the actual AI provider APIs for current model listings.
 */

const { TextToCypher } = require('../index');

async function main() {
  // Create a client with your configuration
  // Note: Replace placeholder values with your actual credentials
  const client = new TextToCypher({
    model: 'gpt-4o-mini',
    // API key for your AI provider (e.g., OpenAI API key starting with 'sk-...')
    apiKey: process.env.OPENAI_API_KEY || 'REPLACE_WITH_YOUR_API_KEY',
    // FalkorDB connection string in the format: falkor://host:port
    // For local development, typically: falkor://localhost:6379
    falkordbConnection: process.env.FALKORDB_CONNECTION || 'falkor://localhost:6379'
  });

  console.log('=== Model Discovery Example ===\n');

  try {
    // Example 1: List all available models
    console.log('1. Listing all available models...');
    const allModels = await client.listModels();
    console.log(`\nFound ${allModels.length} total models:\n`);
    allModels.forEach((model, index) => {
      console.log(`  ${(index + 1).toString().padStart(2)}. ${model}`);
    });
    console.log('\n---\n');

    // Example 2: List models by provider
    console.log('2. Listing models by provider...\n');
    
    const providers = ['openai', 'anthropic', 'gemini', 'ollama'];
    
    for (const provider of providers) {
      try {
        const models = await client.listModelsByProvider(provider);
        console.log(`${provider.toUpperCase()} models (${models.length}):`);
        models.forEach(model => {
          console.log(`  - ${model}`);
        });
        console.log();
      } catch (error) {
        console.log(`${provider.toUpperCase()}: ${error.message}\n`);
      }
    }

    console.log('---\n');

    // Example 3: Try an invalid provider
    console.log('3. Testing error handling with invalid provider...');
    try {
      await client.listModelsByProvider('invalid-provider');
    } catch (error) {
      console.log(`Error (expected): ${error.message}\n`);
    }

    console.log('---\n');

    // Example 4: Demonstrate usage pattern
    console.log('4. Usage pattern - selecting a model from the list...');
    const openaiModels = await client.listModelsByProvider('openai');
    console.log('\nYou can use these models when creating a client:');
    console.log('\nExample:');
    console.log('```javascript');
    console.log('const client = new TextToCypher({');
    console.log(`  model: '${openaiModels[0]}',  // or any other model from the list`);
    console.log('  apiKey: process.env.OPENAI_API_KEY,');
    console.log('  falkordbConnection: \'falkor://localhost:6379\'');
    console.log('});');
    console.log('```\n');

    console.log('---\n');

    // Example 5: Provider-specific naming conventions
    console.log('5. Note on provider-specific naming conventions:');
    console.log('\nThe API returns model names without prefixes.');
    console.log('When using models, OpenAI models can be used directly:');
    console.log('  model: \'gpt-4o-mini\'');
    console.log('\nOther providers require adding a prefix:');
    console.log('  model: \'anthropic:claude-sonnet-4-5\'');
    console.log('  model: \'gemini:gemini-2.5-pro\'');
    console.log('  model: \'ollama:llama3\'\n');

  } catch (error) {
    console.error('Error:', error.message);
    console.error(error.stack);
  }
}

// Run the example
main().catch(console.error);
