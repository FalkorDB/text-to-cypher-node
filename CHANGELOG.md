# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.1.0] - 2025-12-23

### Added
- Initial release of @falkordb/text-to-cypher
- NAPI-RS bindings for the text-to-cypher Rust library
- `TextToCypher` class with the following methods:
  - `textToCypher(graphName, question)` - Convert natural language to Cypher and execute
  - `textToCypherWithMessages(graphName, messages)` - Support for conversation history
  - `cypherOnly(graphName, question)` - Generate Cypher without execution
  - `discoverSchema(graphName)` - Discover and return graph schema
- TypeScript definitions for all public APIs
- Comprehensive documentation:
  - README.md with usage examples
  - INTEGRATION.md for FalkorDB Browser integration
  - CONTRIBUTING.md for developers
- Examples:
  - basic-usage.js - JavaScript example
  - typescript-usage.ts - TypeScript example
- Test suite using Vitest
- GitHub Actions CI/CD:
  - Build workflow for multiple platforms (Linux, macOS, Windows)
  - Test workflow
  - Release workflow with automatic npm publishing
- Support for multiple AI models:
  - OpenAI (GPT-4, GPT-4 Turbo, GPT-4o Mini, etc.)
  - Anthropic (Claude 3)
  - Google (Gemini)
- Pre-built binaries for:
  - Linux x64 (glibc and musl)
  - Linux ARM64 (glibc and musl)
  - macOS x64 (Intel)
  - macOS ARM64 (Apple Silicon)
  - Windows x64

### Technical Details
- Built with NAPI-RS for high-performance native Node.js bindings
- Async/await support throughout the API
- Proper error handling and propagation from Rust to JavaScript
- Zero runtime dependencies

[0.1.0]: https://github.com/FalkorDB/text-to-cypher-node/releases/tag/v0.1.0
