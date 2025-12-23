#![deny(clippy::all)]

use napi::bindgen_prelude::*;
use napi_derive::napi;
use serde::{Deserialize, Serialize};
use text_to_cypher::{ChatMessage, ChatRequest, ChatRole, TextToCypherClient};

/// Options for creating a TextToCypher client
#[napi(object)]
#[derive(Debug, Clone)]
pub struct ClientOptions {
    /// The AI model to use (e.g., "gpt-4o-mini", "anthropic:claude-3")
    pub model: String,
    /// API key for the AI service
    pub api_key: String,
    /// FalkorDB connection string (e.g., "falkor://localhost:6379")
    pub falkordb_connection: String,
}

/// A chat message in the conversation
#[napi(object)]
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Message {
    /// Role of the message sender: "user", "assistant", or "system"
    pub role: String,
    /// Content of the message
    pub content: String,
}

/// Response from text-to-cypher operations
#[napi(object)]
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TextToCypherResponse {
    /// Status of the operation: "success" or "error"
    pub status: String,
    /// The discovered graph schema (JSON string)
    pub schema: Option<String>,
    /// The generated Cypher query
    pub cypher_query: Option<String>,
    /// The result from executing the Cypher query
    pub cypher_result: Option<String>,
    /// Natural language answer generated from the results
    pub answer: Option<String>,
    /// Error message if status is "error"
    pub error: Option<String>,
}

impl From<text_to_cypher::TextToCypherResponse> for TextToCypherResponse {
    fn from(response: text_to_cypher::TextToCypherResponse) -> Self {
        Self {
            status: response.status,
            schema: response.schema,
            cypher_query: response.cypher_query,
            cypher_result: response.cypher_result,
            answer: response.answer,
            error: response.error,
        }
    }
}

/// Node.js wrapper for the text-to-cypher Rust library
///
/// This class provides methods to convert natural language text to Cypher queries
/// and execute them against a FalkorDB instance.
///
/// # Example
///
/// ```javascript
/// const { TextToCypher } = require('@falkordb/text-to-cypher-node');
///
/// const client = new TextToCypher({
///   model: 'gpt-4o-mini',
///   apiKey: 'your-api-key',
///   falkordbConnection: 'falkor://localhost:6379'
/// });
///
/// const response = await client.textToCypher('movies', 'Find all actors');
/// console.log(response.answer);
/// ```
#[napi]
pub struct TextToCypher {
    runtime: tokio::runtime::Runtime,
    client: TextToCypherClient,
}

#[napi]
impl TextToCypher {
    /// Creates a new TextToCypher client
    ///
    /// # Arguments
    ///
    /// * `options` - Client configuration including model, API key, and FalkorDB connection
    ///
    /// # Example
    ///
    /// ```javascript
    /// const client = new TextToCypher({
    ///   model: 'gpt-4o-mini',
    ///   apiKey: 'your-api-key',
    ///   falkordbConnection: 'falkor://localhost:6379'
    /// });
    /// ```
    #[napi(constructor)]
    pub fn new(options: ClientOptions) -> Result<Self> {
        let runtime = tokio::runtime::Runtime::new()
            .map_err(|e| Error::from_reason(format!("Failed to create tokio runtime: {}", e)))?;

        let client = TextToCypherClient::new(
            options.model,
            options.api_key,
            options.falkordb_connection,
        );

        Ok(Self { runtime, client })
    }

    /// Converts natural language text to Cypher and executes the query
    ///
    /// This method:
    /// 1. Discovers the graph schema
    /// 2. Generates a Cypher query using AI
    /// 3. Executes the query
    /// 4. Generates a natural language answer
    ///
    /// # Arguments
    ///
    /// * `graph_name` - Name of the graph to query
    /// * `question` - Natural language question or request
    ///
    /// # Returns
    ///
    /// A promise that resolves to a TextToCypherResponse containing the query, result, and answer
    ///
    /// # Example
    ///
    /// ```javascript
    /// const response = await client.textToCypher(
    ///   'movies',
    ///   'Find all actors who appeared in movies released after 2020'
    /// );
    /// console.log('Query:', response.cypherQuery);
    /// console.log('Answer:', response.answer);
    /// ```
    #[napi]
    pub async fn text_to_cypher(
        &self,
        graph_name: String,
        question: String,
    ) -> Result<TextToCypherResponse> {
        let request = ChatRequest {
            messages: vec![ChatMessage {
                role: ChatRole::User,
                content: question,
            }],
        };

        let result = self.runtime.block_on(async {
            self.client.text_to_cypher(graph_name, request).await
        });

        match result {
            Ok(response) => Ok(response.into()),
            Err(e) => Err(Error::from_reason(format!("Text-to-Cypher failed: {}", e))),
        }
    }

    /// Converts natural language text to Cypher and executes the query with multiple messages
    ///
    /// This method allows for conversation history by accepting multiple messages.
    ///
    /// # Arguments
    ///
    /// * `graph_name` - Name of the graph to query
    /// * `messages` - Array of conversation messages
    ///
    /// # Returns
    ///
    /// A promise that resolves to a TextToCypherResponse
    ///
    /// # Example
    ///
    /// ```javascript
    /// const response = await client.textToCypherWithMessages('movies', [
    ///   { role: 'user', content: 'Show me actors' },
    ///   { role: 'assistant', content: 'Here are the actors...' },
    ///   { role: 'user', content: 'Filter those who acted after 2020' }
    /// ]);
    /// ```
    #[napi]
    pub async fn text_to_cypher_with_messages(
        &self,
        graph_name: String,
        messages: Vec<Message>,
    ) -> Result<TextToCypherResponse> {
        let chat_messages: Vec<ChatMessage> = messages
            .into_iter()
            .map(|msg| {
                let role = match msg.role.to_lowercase().as_str() {
                    "user" => ChatRole::User,
                    "assistant" => ChatRole::Assistant,
                    "system" => ChatRole::System,
                    _ => ChatRole::User, // Default to User if unknown
                };
                ChatMessage {
                    role,
                    content: msg.content,
                }
            })
            .collect();

        let request = ChatRequest {
            messages: chat_messages,
        };

        let result = self.runtime.block_on(async {
            self.client.text_to_cypher(graph_name, request).await
        });

        match result {
            Ok(response) => Ok(response.into()),
            Err(e) => Err(Error::from_reason(format!("Text-to-Cypher failed: {}", e))),
        }
    }

    /// Generates a Cypher query without executing it
    ///
    /// Use this when you only want to generate the query for inspection or manual execution.
    ///
    /// # Arguments
    ///
    /// * `graph_name` - Name of the graph to generate query for
    /// * `question` - Natural language question or request
    ///
    /// # Returns
    ///
    /// A promise that resolves to a TextToCypherResponse with only the schema and query
    ///
    /// # Example
    ///
    /// ```javascript
    /// const response = await client.cypherOnly('movies', 'Find all actors');
    /// console.log('Generated query:', response.cypherQuery);
    /// // You can now review, modify, or execute the query yourself
    /// ```
    #[napi]
    pub async fn cypher_only(
        &self,
        graph_name: String,
        question: String,
    ) -> Result<TextToCypherResponse> {
        let request = ChatRequest {
            messages: vec![ChatMessage {
                role: ChatRole::User,
                content: question,
            }],
        };

        let result = self
            .runtime
            .block_on(async { self.client.cypher_only(graph_name, request).await });

        match result {
            Ok(response) => Ok(response.into()),
            Err(e) => Err(Error::from_reason(format!("Cypher generation failed: {}", e))),
        }
    }

    /// Discovers and returns the schema of a graph
    ///
    /// # Arguments
    ///
    /// * `graph_name` - Name of the graph to discover schema for
    ///
    /// # Returns
    ///
    /// A promise that resolves to a JSON string representing the graph schema
    ///
    /// # Example
    ///
    /// ```javascript
    /// const schema = await client.discoverSchema('movies');
    /// console.log('Schema:', JSON.parse(schema));
    /// ```
    #[napi]
    pub async fn discover_schema(&self, graph_name: String) -> Result<String> {
        let result = self
            .runtime
            .block_on(async { self.client.discover_schema(graph_name).await });

        match result {
            Ok(schema) => Ok(schema),
            Err(e) => Err(Error::from_reason(format!("Schema discovery failed: {}", e))),
        }
    }
}
