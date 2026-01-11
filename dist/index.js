#!/usr/bin/env node
// @ts-ignore
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
// @ts-ignore
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
// @ts-ignore
import { CallToolRequestSchema, ListToolsRequestSchema } from "@modelcontextprotocol/sdk/types.js";
import * as fs from "fs/promises";
import * as path from "path";
import { exec } from "child_process";
import { promisify } from "util";
const execAsync = promisify(exec);
// Find project root by looking for package.json
// Uses CLIENT_CWD environment variable if set, otherwise uses process.cwd()
async function findProjectRoot() {
    // Check if CLIENT_CWD is set (this should be the client's working directory)
    const clientCwd = process.env.CLIENT_CWD;
    let currentDir = clientCwd || process.cwd();
    // Log for debugging
    console.error(`[MCP Server] Starting directory: ${currentDir}`);
    console.error(`[MCP Server] CLIENT_CWD: ${clientCwd || 'not set'}`);
    console.error(`[MCP Server] process.cwd(): ${process.cwd()}`);
    while (currentDir !== path.parse(currentDir).root) {
        try {
            const packagePath = path.join(currentDir, "package.json");
            await fs.access(packagePath);
            console.error(`[MCP Server] Found package.json at: ${currentDir}`);
            return currentDir;
        }
        catch {
            currentDir = path.dirname(currentDir);
        }
    }
    // If no package.json found, use the starting directory
    const fallback = clientCwd || process.cwd();
    console.error(`[MCP Server] No package.json found, using: ${fallback}`);
    return fallback;
}
// Context Management & Learning Tools
async function readAllDocs(projectRoot) {
    const readmePath = path.join(projectRoot, "README.md");
    try {
        const content = await fs.readFile(readmePath, "utf-8");
        return `# Project Documentation\n\n> **Source**: \`${readmePath}\`\n\n${content}`;
    }
    catch (error) {
        return `# Project Documentation\n\n> **Source**: \`${readmePath}\`\n\n*File not found (Error: ${error.message})*`;
    }
}
async function updateAllDocs(projectRoot, content) {
    if (!content) {
        throw new Error("Content argument is required for update_all");
    }
    // Update or create README.md
    const readmePath = path.join(projectRoot, "README.md");
    try {
        await fs.writeFile(readmePath, content);
        return `✓ Successfully updated README.md at: ${readmePath}`;
    }
    catch (error) {
        throw new Error(`Failed to update README.md: ${error.message}`);
    }
}
// Helper functions (restored)
async function analyzeProjectStructure(projectRoot) {
    const structure = {
        name: path.basename(projectRoot),
        files: [],
        directories: [],
    };
    try {
        const items = await fs.readdir(projectRoot, { withFileTypes: true });
        for (const item of items) {
            if (item.name.startsWith(".") || item.name === "node_modules" || item.name === "dist") {
                continue;
            }
            if (item.isDirectory()) {
                structure.directories.push(item.name);
            }
            else {
                structure.files.push(item.name);
            }
        }
    }
    catch (error) {
        // Ignore errors
    }
    return structure;
}
function generateReadme(structure) {
    return `# ${structure.name}

## Overview
This project was automatically initialized.

## Project Structure
- Files: ${structure.files.join(", ") || "None"}
- Directories: ${structure.directories.join(", ") || "None"}

## Installation
\`\`\`bash
npm install
\`\`\`

## Usage
Please update this section with usage instructions.
`;
}
// Test Management Tools
async function createUpdatePlayground(projectRoot, code) {
    const playgroundPath = path.join(projectRoot, "test_playground.js");
    const testMdPath = path.join(projectRoot, "test.md");
    // Write the code to test_playground.js
    await fs.writeFile(playgroundPath, code);
    // Run the code and capture results
    let result = "";
    try {
        const { stdout, stderr } = await execAsync(`node ${playgroundPath}`, {
            cwd: projectRoot,
            timeout: 30000,
        });
        result = `# Test Results\n\n## Execution: SUCCESS\n\n### Output\n\`\`\`\n${stdout}\`\`\`\n`;
        if (stderr) {
            result += `\n### Warnings/Errors\n\`\`\`\n${stderr}\`\`\`\n`;
        }
    }
    catch (error) {
        result = `# Test Results\n\n## Execution: FAILED\n\n### Error\n\`\`\`\n${error.message}\`\`\`\n`;
        if (error.stdout) {
            result += `\n### Stdout\n\`\`\`\n${error.stdout}\`\`\`\n`;
        }
        if (error.stderr) {
            result += `\n### Stderr\n\`\`\`\n${error.stderr}\`\`\`\n`;
        }
    }
    // Write results to test.md
    const timestamp = new Date().toISOString();
    result += `\n\n---\n*Generated at: ${timestamp}*\n`;
    await fs.writeFile(testMdPath, result);
    return result;
}
// Build & Run Tools
async function runDev(projectRoot) {
    try {
        const packageJsonPath = path.join(projectRoot, "package.json");
        const packageJson = JSON.parse(await fs.readFile(packageJsonPath, "utf-8"));
        if (!packageJson.scripts?.dev) {
            return "Error: No 'dev' script found in package.json";
        }
        return `Starting development mode...\nRun: npm run dev\n\nNote: This is a long-running process. Execute manually in terminal.`;
    }
    catch (error) {
        return `Error: ${error.message}`;
    }
}
async function runProd(projectRoot) {
    try {
        const packageJsonPath = path.join(projectRoot, "package.json");
        const packageJson = JSON.parse(await fs.readFile(packageJsonPath, "utf-8"));
        if (!packageJson.scripts?.build) {
            return "Error: No 'build' script found in package.json";
        }
        // Build the project
        const { stdout: buildOut, stderr: buildErr } = await execAsync("npm run build", {
            cwd: projectRoot,
            timeout: 120000,
        });
        let result = `Build completed!\n\n### Build Output\n\`\`\`\n${buildOut}\`\`\`\n`;
        if (buildErr) {
            result += `\n### Build Warnings\n\`\`\`\n${buildErr}\`\`\`\n`;
        }
        // Check for start script
        if (packageJson.scripts?.start) {
            result += `\n\nTo run in production, execute: npm start`;
        }
        else {
            result += `\n\nBuild complete. No 'start' script found in package.json.`;
        }
        return result;
    }
    catch (error) {
        return `Error during build: ${error.message}`;
    }
}
// Define MCP Tools
const tools = [
    {
        name: "md",
        description: "Context Management & Learning - Read or create project README.md",
        inputSchema: {
            type: "object",
            properties: {
                action: {
                    type: "string",
                    enum: ["read_all", "update_all"],
                    description: "Action to perform: read_all (read README.md) or update_all (overwrite/update README.md with new content provided by client)",
                },
                path: {
                    type: "string",
                    description: "Absolute path to the project root. Defaults to current directory.",
                },
                content: {
                    type: "string",
                    description: "The content to write to README.md (Required for update_all)",
                },
            },
            required: ["action"],
        },
    },
    {
        name: "test",
        description: "Test Management - Create/update test playground and report results",
        inputSchema: {
            type: "object",
            properties: {
                action: {
                    type: "string",
                    enum: ["create_update_playground"],
                    description: "Create/update test_playground.js and run it",
                },
                code: {
                    type: "string",
                    description: "JavaScript code to write to test_playground.js",
                },
                path: {
                    type: "string",
                    description: "Absolute path to the project root. Defaults to current directory.",
                },
            },
            required: ["action", "code"],
        },
    },
    {
        name: "deploy",
        description: "Build & Run - Run project in development or production mode",
        inputSchema: {
            type: "object",
            properties: {
                action: {
                    type: "string",
                    enum: ["dev", "prod"],
                    description: "Action to perform: dev (development mode) or prod (build and run)",
                },
                path: {
                    type: "string",
                    description: "Absolute path to the project root. Defaults to current directory.",
                },
            },
            required: ["action"],
        },
    },
];
// Create and configure the server
const server = new Server({
    name: "mcp-job-server",
    version: "1.0.0",
}, {
    capabilities: {
        tools: {},
    },
});
// Handle tool listing
server.setRequestHandler(ListToolsRequestSchema, async () => {
    return { tools };
});
// Handle tool execution
server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;
    // Use provided path or fallback to finding project root
    let projectRoot;
    if (args?.path && typeof args.path === 'string') {
        projectRoot = args.path;
        console.error(`[MCP Server] Using provided path: ${projectRoot}`);
    }
    else {
        projectRoot = await findProjectRoot();
        console.error(`[MCP Server] Auto-detected root: ${projectRoot}`);
    }
    try {
        switch (name) {
            case "md": {
                const action = args?.action;
                if (action === "read_all") {
                    const content = await readAllDocs(projectRoot);
                    return {
                        content: [{ type: "text", text: content }],
                    };
                }
                else if (action === "update_all") {
                    const content = args?.content;
                    const result = await updateAllDocs(projectRoot, content);
                    return {
                        content: [{ type: "text", text: result }],
                    };
                }
                throw new Error(`Unknown action: ${action}`);
            }
            case "test": {
                const action = args?.action;
                const code = args?.code;
                if (action === "create_update_playground") {
                    if (!code) {
                        throw new Error("Code parameter is required");
                    }
                    const result = await createUpdatePlayground(projectRoot, code);
                    return {
                        content: [{ type: "text", text: result }],
                    };
                }
                throw new Error(`Unknown action: ${action}`);
            }
            case "deploy": {
                const action = args?.action;
                if (action === "dev") {
                    const result = await runDev(projectRoot);
                    return {
                        content: [{ type: "text", text: result }],
                    };
                }
                else if (action === "prod") {
                    const result = await runProd(projectRoot);
                    return {
                        content: [{ type: "text", text: result }],
                    };
                }
                throw new Error(`Unknown action: ${action}`);
            }
            default:
                throw new Error(`Unknown tool: ${name}`);
        }
    }
    catch (error) {
        return {
            content: [{ type: "text", text: `Error: ${error.message}` }],
            isError: true,
        };
    }
});
// Start the server
async function main() {
    const transport = new StdioServerTransport();
    await server.connect(transport);
    console.error("MCP Job Server running on stdio");
}
main().catch((error) => {
    console.error("Fatal error:", error);
    process.exit(1);
});
//# sourceMappingURL=index.js.map