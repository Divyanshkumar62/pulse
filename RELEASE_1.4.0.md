# Release Notes v1.4.0 - Postman cURL Importer Engine & Header Autocomplete

## 🚀 What's New in v1.4.0

### 1. Postman cURL Importer Support
- Added native support for Postman-exported cURL and code snippets starting directly with HTTP methods (`POST 'https://...'`, `GET 'https://...'`).
- Fully supports Postman `--body` flags as JSON or raw payloads.
- Supports multiline command continuations, single/double quote escaping, and custom headers (`-H`, `--header`).
- Automatically extracts URL query parameters into editable request parameter key-value pairs (`params`).
- Enhanced authentication parsing for Bearer tokens and Basic authentication (`-u` / `--user`).

### 2. HTTP Header & Query Parameter Autocomplete
- Added Postman-inspired floating suggestion dropdown for 35+ standard HTTP header keys and contextual header values (`application/json`, `Bearer {{token}}`, etc.).
- Added query parameter autocompletion for common API params (`page`, `limit`, `sort`, `filter`, `query`, etc.).
- Integrated seamless keyboard navigation (`ArrowUp`, `ArrowDown`, `Enter`, `Tab`, `Escape`) and mouse selection.

---

## 🛠️ Internal & Quality Fixes
- Added comprehensive unit tests for `CurlParser` with Vitest, guaranteeing 100% test coverage for Postman cURL snippets.
- Validated TypeScript type safety across the frontend (`npx tsc --noEmit`).
