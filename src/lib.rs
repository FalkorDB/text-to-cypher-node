#![deny(clippy::all)]

use napi::bindgen_prelude::*;
use napi_derive::napi;
use serde::{Deserialize, Serialize};
use text_to_cypher::{
    AdapterKind, ChatMessage, ChatRequest, ChatRole, TextToCypherClient, UdfCatalog, UdfFunction,
    UdfLibrary,
};

/// A user-defined function to surface to the model.
#[napi(object)]
#[derive(Debug, Clone)]
pub struct UdfFunctionInput {
    /// Function name; the right-hand side of a `library.function(...)` call
    pub name: String,
    /// Optional signature hint (e.g. "(x, y)")
    pub signature_hint: Option<String>,
    /// Optional human-readable description
    pub description: Option<String>,
}

/// A user-defined function library (namespace) and its functions.
#[napi(object)]
#[derive(Debug, Clone)]
pub struct UdfLibraryInput {
    /// Library name; the left side of a `library.function(...)` call
    pub name: String,
    /// Functions registered in this library
    pub functions: Vec<UdfFunctionInput>,
}

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
    /// Optional LLM provider endpoint/base URL override
    pub llm_endpoint: Option<String>,
    /// When true, discover the connected instance's user-defined functions (UDFs) and surface their
    /// `library.function` call targets to the model. Off by default. This is a client-level option,
    /// so it applies to `textToCypher`, `textToCypherWithMessages`, and `cypherOnly` (i.e. it may
    /// run `GRAPH.UDF LIST` against FalkorDB during query generation). Ignored when `udfs` is set.
    pub discover_udfs: Option<bool>,
    /// A caller-supplied UDF catalog to surface to the model. Takes precedence over `discoverUdfs`.
    /// Use this when you already have the UDF list (e.g. from `GRAPH.UDF LIST`) to avoid an extra
    /// discovery round-trip.
    pub udfs: Option<Vec<UdfLibraryInput>>,
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

/// Aggregated token usage for a text-to-cypher request
///
/// A single request may issue several LLM calls (cypher generation, final answer
/// generation, self-healing retries, and skill tool-call rounds). These counts are
/// summed across all of those calls.
#[napi(object)]
#[derive(Debug, Clone)]
pub struct TokenUsage {
    /// Total input (prompt) tokens consumed across all LLM calls
    pub prompt_tokens: f64,
    /// Total output (completion) tokens produced across all LLM calls
    pub completion_tokens: f64,
    /// Total tokens consumed across all LLM calls
    pub total_tokens: f64,
}

impl From<text_to_cypher::TokenUsage> for TokenUsage {
    fn from(usage: text_to_cypher::TokenUsage) -> Self {
        Self {
            prompt_tokens: usage.prompt_tokens as f64,
            completion_tokens: usage.completion_tokens as f64,
            total_tokens: usage.total_tokens as f64,
        }
    }
}

/// Response from text-to-cypher operations
#[napi(object)]
#[derive(Debug, Clone)]
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
    /// Aggregated token usage across all LLM calls made while serving the request.
    /// Omitted when no tokens were consumed (e.g. failures before any LLM call).
    pub token_usage: Option<TokenUsage>,
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
            token_usage: response.token_usage.map(Into::into),
        }
    }
}

fn normalize_model_name(model: &str) -> String {
    // If the model already uses the "::" namespace format, leave it as-is
    if model.contains("::") {
        return model.to_string();
    }
    // Convert known single-colon provider prefixes to genai's "::" namespace format
    for prefix in &["openai:", "anthropic:", "gemini:", "ollama:"] {
        if model.starts_with(prefix) {
            let provider = &prefix[..prefix.len() - 1];
            let model_name = &model[prefix.len()..];
            return format!("{}::{}", provider, model_name);
        }
    }
    model.to_string()
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
        let model = normalize_model_name(&options.model);
        let mut client =
            TextToCypherClient::new(model, options.api_key, options.falkordb_connection);
        if let Some(endpoint) = options.llm_endpoint {
            client = client.with_llm_endpoint(endpoint);
        }

        // UDF context: an explicit catalog wins; otherwise optionally discover from the instance.
        if let Some(libraries) = options.udfs {
            let catalog = UdfCatalog::from_libraries(
                libraries
                    .into_iter()
                    .map(|library| UdfLibrary {
                        name: library.name,
                        functions: library
                            .functions
                            .into_iter()
                            .map(|function| UdfFunction {
                                name: function.name,
                                signature_hint: function.signature_hint,
                                description: function.description,
                            })
                            .collect(),
                    })
                    .collect(),
            );
            client = client.with_udfs(catalog);
        } else if options.discover_udfs.unwrap_or(false) {
            client = client.with_discovered_udfs();
        }

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
            Err(e) => Err(Error::from_reason(format!(
                "Cypher generation failed: {}",
                e
            ))),
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
            Err(e) => Err(Error::from_reason(format!(
                "Schema discovery failed: {}",
                e
            ))),
        }
    }

    /// Lists all available AI models across all supported providers
    ///
    /// This method queries all provider APIs (OpenAI, Anthropic, Gemini, Ollama) and
    /// returns a combined list of available models with provider prefixes.
    ///
    /// # Returns
    ///
    /// A promise that resolves to an array of model names with provider prefixes
    ///
    /// # Example
    ///
    /// ```javascript
    /// const allModels = await client.listModels();
    /// console.log('All models:', allModels);
    /// // Output: ['gpt-4o-mini', 'gpt-4o', 'anthropic:claude-sonnet-4-5', 'gemini:gemini-2.5-pro', ...]
    /// ```
    #[napi]
    pub async fn list_models(&self) -> Result<Vec<String>> {
        let all_provider_models = self
            .client
            .list_all_models()
            .await
            .map_err(|e| Error::from_reason(format!("Failed to list models: {}", e)))?;

        let mut all_models = Vec::new();
        for (adapter_kind, models) in all_provider_models {
            let prefix = adapter_kind.as_lower_str();
            for model in models {
                if adapter_kind == AdapterKind::OpenAI {
                    // OpenAI models don't need a namespace prefix
                    all_models.push(model);
                } else {
                    all_models.push(format!("{}::{}", prefix, model));
                }
            }
        }

        Ok(all_models)
    }

    /// Lists available AI models from a specific provider
    ///
    /// # Arguments
    ///
    /// * `provider` - Provider name: "openai", "anthropic", "gemini", or "ollama" (case-insensitive)
    ///
    /// # Note
    ///
    /// Each provider's live results are merged with a curated static catalog, so
    /// providers with a curated list (OpenAI, Anthropic, Gemini) still return their
    /// well-known models even when no matching API key is configured. Providers without
    /// a curated list (e.g. Ollama) are only returned when reachable.
    ///
    /// # Returns
    ///
    /// A promise that resolves to an array of model names for the specified provider (without prefixes)
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
        let adapter_kind = match provider.to_lowercase().as_str() {
            "openai" => AdapterKind::OpenAI,
            "anthropic" => AdapterKind::Anthropic,
            "gemini" => AdapterKind::Gemini,
            "ollama" => AdapterKind::Ollama,
            _ => {
                return Err(Error::from_reason(format!(
                    "Unknown provider: '{}'. Supported providers are: openai, anthropic, gemini, ollama",
                    provider
                )))
            }
        };

        match self.client.list_models(adapter_kind).await {
            Ok(models) => Ok(models),
            Err(e) => Err(Error::from_reason(format!("Failed to list models: {}", e))),
        }
    }
}
