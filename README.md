# Node.js MCP Server

A professional Model Context Protocol (MCP) server built with Node.js, TypeScript, and the official `@modelcontextprotocol/sdk`.

## Features

- **Tools**:
  - `calculate`: Perform basic arithmetic operations (add, subtract, multiply, divide).
  - `get_system_info`: Retrieve system information (Platform, CPU, Memory).
- **Resources**:
  - `system://info`: A text resource containing basic system details.

## Installation

1.  **Install dependencies**:
    ```bash
    npm install
    ```

2.  **Build the project**:
    ```bash
    npm run build
    ```

## Usage

### Running the Server

This server communicates via `stdio`. You can run it directly:

```bash
node dist/index.js
```

### Integration with Claude Desktop (or other MCP Clients)

To use this server with Claude Desktop, add the following configuration to your `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "my-node-server": {
      "command": "node",
      "args": ["/absolute/path/to/mcpserver/dist/index.js"]
    }
  }
}
```

*Note: Replace `/absolute/path/to/mcpserver` with the actual path to this directory.*

## Development

- **Run in development mode** (restarts on change):
  ```bash
  npm run build -- --watch
  # In another terminal:
  node dist/index.js
  ```

- **Run Tests**:
  ```bash
  npm test
  ```
