
# MAIN ASPECTS
The ai is not human, we should simplify it and we can make it understand the prompt clearly for some regular tasks.
Managing human behavior is not easy. We should not let the ai to behave like a human and to make the prompt processing difficult. We should let the ai to do its job and to make it understand the prompt clearly in regular cases. We must reduce the token usage. Otherwise it will be expensive. 

# Node.js MCP Server

A specialized MCP server focused on **3 Core Jobs** for agentic workflows.

## The 3 Jobs

### 1. Context Management & Learning
The agent can manage the project's documentation and "learn" the entire context.

-   **Tool**: `md`
-   **Actions**:
    -   `read_all`: Reads `README.md` from the specified path.
    -   `update_all`: Overwrites/updates `README.md` with new content provided by the client.
    -   **Arguments**: 
        - `path` (string, optional) - Absolute path to project root.
        - `content` (string, required for `update_all`) - The new content for `README.md`.

### 2. Test Management
The agent can manage the project's tests in a unified workflow.

-   **Tool**: `test`
-   **Action**: `test`
-   **Functionality**:
    1.  Writes the provided test `code` to `test_path`.
    2.  Runs the project's test suite (`npm test`).
    3.  Reports output and errors to `test.md`.
-   **Arguments**:
    -   `path` (string, optional) - Absolute path to project root.
    -   `test_path` (string, required) - Relative path to the test file (e.g., `tests/api.test.js`).
    -   `code` (string, required) - Content of the test file.

### 3. Build & Run

-   **Tool**: `deploy`
-   **Actions**:
    -   `dev`: Runs the project in development mode.
    -   `prod`: Builds the project and runs it.
    -   **Arguments**:
        -   `path` (string, optional) - Absolute path to project root.

## Installation & Usage

### 1. Build the Server
```bash
cd /home/mc/Desktop/mcpserver
npm install
npm run build
```

### 2. Configuration (Claude / Antigravity)

Add to your MCP configuration file:

**Location**: `~/.config/Claude/claude_desktop_config.json` (Linux)

```json
{
  "mcpServers": {
    "job-server": {
      "command": "node",
      "args": ["path/to/mcpserver/dist/index.js"]
    }
  }
}
```

```mcp_config.json
{
  "mcpServers": {
    "my-job-server": {
      "command": "node",
      "args": ["path/to/mcpserver/dist/index.js"]
    }
  }
}
```

### 3. Usage Examples

#### Manage Tests
To create a test, update it, or simply run existing tests (by re-submitting the code), use the `test` tool.

```json
{
  "name": "test",
  "arguments": {
    "action": "test",
    "path": "path/to/ServiceApp",
    "test_path": "tests/login.test.js",
    "code": "describe('Login', () => { ... });"
  }
}
```

The server will:
1.  Save `tests/login.test.js`.
2.  Run `npm test`.
3.  Report full results to `test.md`.

## Troubleshooting

- **Path Issues**: Always provide the `path` argument.
- **npm test**: The `test` action requires a valid `test` script in the project's `package.json`.
