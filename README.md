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
The agent can maintain a test playground and report results.

-   **Tool**: `test`
-   **Actions**:
    -   `create_update_playground`: Writes code to `test_playground.js`, runs it, and reports results in `test.md`.
    -   **Arguments**:
        - `path` (string, optional) - Absolute path to project root.
        - `code` (string, required) - The test code to execute.

### 3. Build & Run

-   **Tool**: `deploy`
-   **Actions**:
    -   `dev`: Runs the project in development mode.
    -   `prod`: Builds the project and runs it.
    -   **Arguments**:
        - `path` (string, optional) - Absolute path to project root.

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
      "args": ["/home/mc/Desktop/mcpserver/dist/index.js"]
    }
  }
}
```

### 3. Usage Examples

#### Read Documentation
```json
{
  "name": "md",
  "arguments": {
    "action": "read_all",
    "path": "/home/mc/Desktop/ServiceApp"
  }
}
```

#### Update Documentation
The Client (AI Agent) is responsible for generating the new content.
```json
{
  "name": "md",
  "arguments": {
    "action": "update_all",
    "path": "/home/mc/Desktop/ServiceApp",
    "content": "# New Project Documentation\n\nUpdated based on recent changes..."
  }
}
```

## Troubleshooting

- **Path Issues**: Always provide the `path` argument to ensure files are read from/written to the correct location.
- **Content Required**: The `update_all` action requires the `content` argument.
