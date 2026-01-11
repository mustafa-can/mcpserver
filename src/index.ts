import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import os from "os";

// Create an MCP server
const server = new McpServer({
    name: "Node.js MCP Server",
    version: "1.0.0",
});

// Export handlers for testing
export const calculateHandler = async ({ operation, a, b }: { operation: "add" | "subtract" | "multiply" | "divide", a: number, b: number }) => {
    switch (operation) {
        case "add":
            return { content: [{ type: "text" as const, text: String(a + b) }] };
        case "subtract":
            return { content: [{ type: "text" as const, text: String(a - b) }] };
        case "multiply":
            return { content: [{ type: "text" as const, text: String(a * b) }] };
        case "divide":
            if (b === 0) {
                return { content: [{ type: "text" as const, text: "Error: Division by zero" }], isError: true };
            }
            return { content: [{ type: "text" as const, text: String(a / b) }] };
        default:
            return { content: [{ type: "text" as const, text: "Unknown operation" }], isError: true };
    }
};

export const systemInfoHandler = async () => {
    const info = {
        platform: os.platform(),
        release: os.release(),
        arch: os.arch(),
        cpus: os.cpus().length,
        totalMem: `${Math.round(os.totalmem() / 1024 / 1024)} MB`,
        freeMem: `${Math.round(os.freemem() / 1024 / 1024)} MB`,
    };
    return {
        content: [{ type: "text" as const, text: JSON.stringify(info, null, 2) }],
    };
};

// Add a calculator tool
server.tool(
    "calculate",
    {
        operation: z.enum(["add", "subtract", "multiply", "divide"]).describe("The operation to perform"),
        a: z.number().describe("The first number"),
        b: z.number().describe("The second number"),
    },
    calculateHandler
);

// Add a system info tool
server.tool(
    "get_system_info",
    {},
    systemInfoHandler
);

// Add a simple resource
server.resource(
    "system",
    "system://info",
    async (uri) => {
        const info = `System Info: ${os.platform()} ${os.release()} (${os.arch()})`;
        return {
            contents: [{
                uri: uri.href,
                text: info,
            }],
        };
    }
);

async function main() {
    const transport = new StdioServerTransport();
    await server.connect(transport);
    console.error("MCP Server running on stdio");
}

// Only run main if this file is the entry point
if (import.meta.url === `file://${process.argv[1]}`) {
    main().catch((error) => {
        console.error("Fatal error in main():", error);
        process.exit(1);
    });
}
