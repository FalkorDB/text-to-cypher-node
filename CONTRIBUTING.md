# Contributing to text-to-cypher-node

Thank you for your interest in contributing to text-to-cypher-node! This document provides guidelines and instructions for contributing.

## Development Setup

### Prerequisites

- Node.js >= 18
- Rust toolchain (install from [rustup.rs](https://rustup.rs/))
- C++ compiler (platform-specific)
  - Windows: Visual Studio 2019 or later with C++ tools
  - macOS: Xcode Command Line Tools
  - Linux: GCC or Clang

### Getting Started

1. Fork and clone the repository:
```bash
git clone https://github.com/YOUR_USERNAME/text-to-cypher-node.git
cd text-to-cypher-node
```

2. Install dependencies:
```bash
npm install
```

3. Build the native module:
```bash
npm run build
```

4. Run tests:
```bash
npm test
```

## Project Structure

```
text-to-cypher-node/
├── src/
│   └── lib.rs          # Rust NAPI bindings
├── __test__/
│   └── index.test.ts   # TypeScript tests
├── examples/
│   ├── basic-usage.js  # JavaScript examples
│   └── typescript-usage.ts
├── index.js            # Native module loader
├── index.d.ts          # TypeScript definitions
├── Cargo.toml          # Rust dependencies
├── package.json        # NPM package config
└── README.md           # Documentation
```

## Making Changes

### Code Style

- **Rust**: Follow standard Rust formatting with `rustfmt`
- **TypeScript/JavaScript**: Follow the existing code style
- Add comments for complex logic
- Update documentation for API changes

### Commit Messages

Follow conventional commits format:

```
type(scope): subject

body

footer
```

Types:
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `test`: Adding or updating tests
- `refactor`: Code refactoring
- `chore`: Maintenance tasks

Examples:
```
feat(api): add support for conversation history
fix(build): resolve Windows compilation issue
docs(readme): update installation instructions
```

### Testing

1. Write tests for new features
2. Ensure all tests pass before submitting PR
3. Add integration tests when applicable

Run tests:
```bash
npm test
```

Run tests in watch mode:
```bash
npm run test:watch
```

### Documentation

- Update README.md for user-facing changes
- Update TypeScript definitions (index.d.ts) for API changes
- Add examples for new features
- Update INTEGRATION.md for integration changes

## Pull Request Process

1. Create a feature branch:
```bash
git checkout -b feat/your-feature-name
```

2. Make your changes and commit:
```bash
git add .
git commit -m "feat: add your feature"
```

3. Push to your fork:
```bash
git push origin feat/your-feature-name
```

4. Create a Pull Request on GitHub

5. Ensure CI passes:
   - All tests pass
   - Code builds successfully on all platforms
   - No linting errors

6. Address review comments

## Building for Different Platforms

### Linux
```bash
npm run build
```

### macOS
```bash
npm run build
```

### Windows
```bash
npm run build
```

### Cross-compilation

For cross-platform builds, use the CI pipeline or Docker:

```bash
# Linux x64 musl
docker run --rm -v $(pwd):/build -w /build \
  ghcr.io/napi-rs/napi-rs/nodejs-rust:lts-alpine \
  sh -c "npm install && npm run build"
```

## Debugging

### Rust debugging
```bash
RUST_BACKTRACE=1 npm test
```

### Enable NAPI debug output
```bash
DEBUG=napi:* npm test
```

### Build in debug mode
```bash
npm run build:debug
```

## Release Process

Releases are automated through GitHub Actions when a version tag is pushed:

1. Update version in `package.json` and `Cargo.toml`
2. Update CHANGELOG.md
3. Commit changes: `git commit -am "chore: release v0.2.0"`
4. Create and push tag: `git tag v0.2.0 && git push origin v0.2.0`
5. GitHub Actions will build and publish to npm

## Reporting Bugs

When reporting bugs, please include:

1. Node.js version
2. Operating system and version
3. Rust version
4. Steps to reproduce
5. Expected vs actual behavior
6. Error messages and stack traces

Create an issue at: https://github.com/FalkorDB/text-to-cypher-node/issues

## Feature Requests

We welcome feature requests! Please:

1. Check existing issues first
2. Describe the use case clearly
3. Explain why it would be useful
4. Provide examples if possible

## Code of Conduct

- Be respectful and inclusive
- Welcome newcomers
- Focus on constructive feedback
- Help maintain a positive community

## Questions?

- Open a discussion on GitHub
- Join the [FalkorDB Discord](https://discord.gg/falkordb)
- Check existing documentation and issues

## License

By contributing, you agree that your contributions will be licensed under the MIT License.
