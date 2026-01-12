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


// Helper functions for model listing
fn get_openai_models() -> Vec<String> {
    vec![
        "gpt-4o-mini".to_string(),
        "gpt-4o".to_string(),
        "gpt-4-turbo".to_string(),
        "gpt-4".to_string(),
        "gpt-3.5-turbo".to_string(),
    ]
}

fn get_anthropic_models() -> Vec<String> {
    vec![
        "anthropic:claude-3-5-sonnet-20241022".to_string(),
        "anthropic:claude-3-opus-20240229".to_string(),
        "anthropic:claude-3-sonnet-20240229".to_string(),
        "anthropic:claude-3-haiku-20240307".to_string(),
    ]
}

fn get_gemini_models() -> Vec<String> {
    vec![
        "gemini:gemini-2.0-flash-exp".to_string(),
        "gemini:gemini-1.5-pro".to_string(),
        "gemini:gemini-1.5-flash".to_string(),
    ]
}

fn get_ollama_models() -> Vec<String> {
    vec![
        "ollama:llama2".to_string(),
        "ollama:llama3".to_string(),
        "ollama:mixtral".to_string(),
        "ollama:phi3".to_string(),
    ]
}

const SUPPORTED_PROVIDERS: &[&str] = &["openai", "anthropic", "gemini", "ollama"];

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
        let client = TextToCypherClient::new(
            options.model,
            options.api_key,
            options.falkordb_connection,
        );

        Ok(Self { client })
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

        match self.client.text_to_cypher(graph_name, request).await {
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
        let chat_messages: Result<Vec<ChatMessage>> = messages
            .into_iter()
            .map(|msg| {
                let role = match msg.role.to_lowercase().as_str() {
                    "user" => ChatRole::User,
                    "assistant" => ChatRole::Assistant,
                    "system" => ChatRole::System,
                    _ => {
                        return Err(Error::from_reason(format!(
                            "Invalid message role: '{}'. Must be 'user', 'assistant', or 'system'",
                            msg.role
                        )))
                    }
                };
                Ok(ChatMessage {
                    role,
                    content: msg.content,
                })
            })
            .collect();

        let request = ChatRequest {
            messages: chat_messages?,
        };

        match self.client.text_to_cypher(graph_name, request).await {
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

        match self.client.cypher_only(graph_name, request).await {
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
        match self.client.discover_schema(graph_name).await {
            Ok(schema) => Ok(schema),
            Err(e) => Err(Error::from_reason(format!("Schema discovery failed: {}", e))),
        }
    }

    /// Lists all available AI models across all supported providers
    ///
    /// Returns a list of commonly available models from OpenAI, Anthropic, Gemini, and Ollama.
    ///
    /// # Note
    ///
    /// This method returns a curated list of well-known models. The actual availability
    /// of models depends on your API credentials and the current offerings from each provider.
    ///
    /// # Returns
    ///
    /// A promise that resolves to an array of model names
    ///
    /// # Example
    ///
    /// ```javascript
    /// const models = await client.listModels();
    /// console.log('Available models:', models);
    /// // Output: ['gpt-4o-mini', 'gpt-4o', 'claude-3-5-sonnet-20241022', ...]
    /// ```
    #[napi]
    pub async fn list_models(&self) -> Result<Vec<String>> {
        let mut models = Vec::new();
        
        // Aggregate models from all providers
        models.extend(get_openai_models());
        models.extend(get_anthropic_models());
        models.extend(get_gemini_models());
        models.extend(get_ollama_models());
        
        Ok(models)
    }

    /// Lists available AI models from a specific provider
    ///
    /// # Arguments
    ///
    /// * `provider` - Provider name: "openai", "anthropic", "gemini", or "ollama" (case-insensitive)
    ///
    /// # Note
    ///
    /// This method returns a curated list of well-known models. The actual availability
    /// of models depends on your API credentials and the current offerings from each provider.
    ///
    /// # Returns
    ///
    /// A promise that resolves to an array of model names for the specified provider
    ///
    /// # Example
    ///
    /// ```javascript
    /// const openaiModels = await client.listModelsByProvider('openai');
    /// console.log('OpenAI models:', openaiModels);
    /// // Output: ['gpt-4o-mini', 'gpt-4o', 'gpt-4-turbo', ...]
    /// ```
    #[napi]
    pub async fn list_models_by_provider(&self, provider: String) -> Result<Vec<String>> {
        let provider_lower = provider.to_lowercase();
        
        match provider_lower.as_str() {
            "openai" => Ok(get_openai_models()),
            "anthropic" => Ok(get_anthropic_models()),
            "gemini" => Ok(get_gemini_models()),
            "ollama" => Ok(get_ollama_models()),
            _ => Err(Error::from_reason(format!(
                "Unknown provider: '{}'. Supported providers are: {}",
                provider,
                SUPPORTED_PROVIDERS.join(", ")
            ))),
        }
    }
}
