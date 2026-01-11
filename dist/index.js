#!/usr/bin/env node
// @ts-ignore
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
// @ts-ignore
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
// @ts-ignore
import { CallToolRequestSchema, ListToolsRequestSchema, ListPromptsRequestSchema, GetPromptRequestSchema } from "@modelcontextprotocol/sdk/types.js";
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
// Test Management Tools
async function handleTestExecution(projectRoot, testPath, code, scriptName = "test", baseUrl) {
    try {
        const fullTestPath = path.join(projectRoot, testPath);
        const testMdPath = path.join(projectRoot, "test.md");
        // 1. Write/Update the test file
        // Ensure directory exists
        const dir = path.dirname(fullTestPath);
        await fs.mkdir(dir, { recursive: true });
        await fs.writeFile(fullTestPath, code);
        // 2. Run the tests
        const packageJsonPath = path.join(projectRoot, "package.json");
        const packageJson = JSON.parse(await fs.readFile(packageJsonPath, "utf-8"));
        if (!packageJson.scripts?.[scriptName]) {
            throw new Error(`No '${scriptName}' script found in package.json`);
        }
        let runOutput = "";
        let runError = "";
        // Prepare environment variables
        const env = { ...process.env };
        if (baseUrl) {
            env.TEST_BASE_URL = baseUrl;
        }
        try {
            const { stdout, stderr } = await execAsync(`npm run ${scriptName}`, {
                cwd: projectRoot,
                timeout: 60000,
                env, // Pass the environment with potential TEST_BASE_URL
            });
            runOutput = stdout;
            runError = stderr;
        }
        catch (error) {
            runOutput = error.stdout || "";
            runError = error.message + "\n" + (error.stderr || "");
        }
        // 3. Report detailed results to test.md
        let report = `# Test Report\n\n`;
        report += `**Test File**: \`${testPath}\`\n`;
        report += `**Execution Time**: ${new Date().toISOString()}\n\n`;
        report += `## Output\n\`\`\`\n${runOutput}\`\`\`\n\n`;
        if (runError) {
            report += `## Errors/Warnings\n\`\`\`\n${runError}\`\`\`\n`;
        }
        await fs.writeFile(testMdPath, report);
        return `✓ Updated test file: ${testPath}\n✓ Ran 'npm test'\n✓ Reported results to: test.md`;
    }
    catch (error) {
        throw new Error(`Test execution failed: ${error.message}`);
    }
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
        description: "Test Management - Write test code, run tests, and report results.",
        inputSchema: {
            type: "object",
            properties: {
                action: {
                    type: "string",
                    enum: ["test"],
                    description: "Action to perform: test (Unified action)",
                },
                path: {
                    type: "string",
                    description: "Absolute path to the project root.",
                },
                test_path: {
                    type: "string",
                    description: "Relative path to the test file (e.g., tests/my.test.js)",
                },
                code: {
                    type: "string",
                    description: "Content of the test file",
                },
                script: {
                    type: "string",
                    description: "NPM script to run (e.g. 'test', 'e2e'). Defaults to 'test'.",
                },
                baseUrl: {
                    type: "string",
                    description: "Base URL of the application to test (e.g. 'http://localhost:3000'). Passed to tests as TEST_BASE_URL env var.",
                },
            },
            required: ["action", "test_path", "code"],
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
// Define Prompts
const prompts = [
    {
        name: "test/create",
        description: "Create a playground test of all pages, functionalities for backend and front end",
    },
    {
        name: "test/run",
        description: "Run the test you created, or create it if missing, and report results to test.md",
    }
];
// Create and configure the server
const server = new Server({
    name: "mcp-job-server",
    version: "1.0.0",
}, {
    capabilities: {
        tools: {},
        prompts: {},
    },
});
// Handle prompt listing
server.setRequestHandler(ListPromptsRequestSchema, async () => {
    return { prompts };
});
// Handle prompt retrieval
server.setRequestHandler(GetPromptRequestSchema, async (request) => {
    const { name } = request.params;
    if (name === "test/create") {
        return {
            description: "Create a playground test of all pages, functionalities for backend and front end",
            messages: [
                {
                    role: "user",
                    content: {
                        type: "text",
                        text: `ACT AS A SENIOR QA ENGINEER. Your goal is to write a "test_playground.js" file that performs an EXHAUSTIVE TEAR-DOWN of this project.

1.  **SCOPE**:
    *   **Frontend**: You must test EVERY page, EVERY component, EVERY interactive element. Use simulated DOM interactions (like jsdom/cheerio concepts or fetch requests for HTML) to verify specific <div> content, ensure buttons exist, and check forms.
    *   **Backend**: Test EVERY API endpoint, EVERY service function.
    *   **Granularity**: Do not vaguely check "is it working?". Check specific IDs, classes, and text content.

2.  **ENVIRONMENT**:
    *   The code MUST use \`process.env.TEST_BASE_URL\` as the target.
    *   It must handle being run against a LIVE DEPLOYMENT or localhost.

3.  **STRICTNESS**:
    *   If a button is missing, it's a FAIL.
    *   If a text typo exists, it's a FAIL.
    *   Write the test code to be ruthless.`
                    }
                }
            ]
        };
    }
    else if (name === "test/run") {
        return {
            description: "Run the test you created, or create it if missing, and report results to test.md",
            messages: [
                {
                    role: "user",
                    content: {
                        type: "text",
                        text: `Run the comprehensive "test_playground.js" file.

1.  **EXECUTION**:
    *   Check if the user provided a URL (e.g. "https://myapp.com"). If yes, PASS IT as the \`baseUrl\` argument to the 'test' tool.
    *   Run the test using the 'test' tool.

2.  **REPORTING ("The Judge")**:
    *   After running, you must write the results to "test.md".
    *   **DO NOT** just paste logs.
    *   **YOU MUST WRITE A PERSONAL REPORT TO THE DEVELOPER**:
        *   Use the headers: "## WHAT YOU DID WELL" and "## WHAT YOU DID WRONG".
        *   For bugs/failures, say: "You did wrong here: [explanation of the button/div/function that failed]".
        *   For successes, say: "You did well: [specific feature works perfectly]".
    *   Be direct. The developer needs to know exactly what is broken.`
                    }
                }
            ]
        };
    }
    throw new Error(`Prompt not found: ${name}`);
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
                if (action === "test") {
                    const testPath = args?.test_path;
                    const code = args?.code;
                    const script = args?.script; // Optional script name
                    const baseUrl = args?.baseUrl; // Optional base URL
                    if (!testPath || !code) {
                        throw new Error("test_path and code parameters are required for test action");
                    }
                    const result = await handleTestExecution(projectRoot, testPath, code, script, baseUrl);
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