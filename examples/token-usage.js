/**
 * Token-usage tracking example for @falkordb/text-to-cypher
 *
 * A single `textToCypher` / `cypherOnly` request may issue several LLM calls
 * (schema-aware Cypher generation, optional self-healing retries, skill tool-call
 * rounds, and final answer generation). The library aggregates the token counts
 * from every one of those calls into `response.tokenUsage`.
 *
 * This example runs real requests against an AI model and prints the aggregated
 * `tokenUsage` for both the full pipeline and the generation-only path.
 *
 * To run this example:
 * 1. Ensure FalkorDB is running, e.g.:
 *      docker run -d -p 6379:6379 falkordb/falkordb:latest
 * 2. Seed a graph so schema discovery returns a non-empty ontology, e.g.:
 *      redis-cli GRAPH.QUERY demo_graph \
 *        "MERGE (:Person {name:'Alice'}) MERGE (:Person {name:'Bob'}) MERGE (:Person {name:'Charlie'})"
 * 3. Provide an API key and (optionally) overrides via the environment, then run:
 *      OPENAI_API_KEY=sk-... node examples/token-usage.js
 *    or, using a .env file (Node >= 20.6):
 *      node --env-file=.env examples/token-usage.js
 *
 * Supported environment variables:
 *   OPENAI_API_KEY / DEFAULT_KEY   - API key forwarded to the provider (required)
 *   MODEL / DEFAULT_MODEL          - model to use (defaults to 'gpt-5.5')
 *   FALKORDB_CONNECTION            - connection string (defaults to 'falkor://localhost:6379')
 *   GRAPH_NAME                     - graph to query (defaults to 'demo_graph')
 */

const { TextToCypher } = require('../index');

function reportUsage(response) {
  if (response.answer) {
    console.log('Answer:', response.answer);
  }

  const usage = response.tokenUsage;
  if (!usage) {
    console.error(
      '✗ No tokenUsage reported on the response — the provider may not return usage data.'
    );
    return;
  }

  console.log('Token usage:');
  console.log(`  promptTokens     = ${usage.promptTokens}`);
  console.log(`  completionTokens = ${usage.completionTokens}`);
  console.log(`  totalTokens      = ${usage.totalTokens}`);

  if (usage.totalTokens === 0) {
    console.error(
      '⚠ tokenUsage was reported but totalTokens is 0 — the provider may not return usage data.'
    );
  } else {
    console.log('✓ Token usage tracking is working.');
  }
}

async function main() {
  const apiKey = process.env.OPENAI_API_KEY || process.env.DEFAULT_KEY;
  if (!apiKey) {
    console.error('Please set OPENAI_API_KEY (or DEFAULT_KEY) to run this example.');
    process.exit(1);
  }

  const model = process.env.MODEL || process.env.DEFAULT_MODEL || 'gpt-5.5';
  const falkordbConnection = process.env.FALKORDB_CONNECTION || 'falkor://localhost:6379';
  const graphName = process.env.GRAPH_NAME || 'demo_graph';

  console.log('=== Token Usage Tracking Example ===');
  console.log(`model: ${model}`);
  console.log(`connection: ${falkordbConnection}`);
  console.log(`graph: ${graphName}\n`);

  const client = new TextToCypher({ model, apiKey, falkordbConnection });

  // Example 1: full pipeline (generate -> execute -> answer). Usage is summed across
  // every LLM call the request made.
  console.log('--- Example 1: full textToCypher pipeline ---');
  try {
    const response = await client.textToCypher(graphName, 'How many people are in the graph?');
    reportUsage(response);
  } catch (error) {
    console.error('✗ Request failed:', error.message);
  }

  // Example 2: cypherOnly (no execution / no answer generation). Usage should reflect
  // just the query-generation call(s) and therefore typically be smaller.
  console.log('\n--- Example 2: cypherOnly (generation only) ---');
  try {
    const response = await client.cypherOnly(graphName, 'List the names of all people.');
    if (response.cypherQuery) {
      console.log('Generated query:', response.cypherQuery);
    }
    reportUsage(response);
  } catch (error) {
    console.error('✗ Request failed:', error.message);
  }

  console.log('\n=== Example completed ===');
}

main().catch(console.error);
