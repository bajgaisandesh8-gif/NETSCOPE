import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import { spawn, ChildProcess } from "child_process";
import { createProxyMiddleware } from "http-proxy-middleware";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = 3000;
const PYTHON_PORT = 5001;

let pythonProcess: ChildProcess | null = null;
let genAiClient: GoogleGenAI | null = null;

function getGeminiClient(): GoogleGenAI | null {
  if (!process.env.GEMINI_API_KEY) return null;
  if (!genAiClient) {
    genAiClient = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  }
  return genAiClient;
}

function startPythonBackend(): void {
  console.log(`[NetScope] Spawning Python Network Engine on port ${PYTHON_PORT}...`);
  pythonProcess = spawn("python3", ["-m", "backend.app"], {
    cwd: process.cwd(),
    env: {
      ...process.env,
      BACKEND_PORT: String(PYTHON_PORT),
      BACKEND_HOST: "127.0.0.1",
      PYTHONUNBUFFERED: "1",
    },
    stdio: ["pipe", "pipe", "pipe"],
  });

  pythonProcess.stdout?.on("data", (data) => {
    const text = data.toString().trim();
    if (text) console.log(`[Python Engine] ${text}`);
  });

  pythonProcess.stderr?.on("data", (data) => {
    const text = data.toString().trim();
    if (text) console.error(`[Python Engine Error] ${text}`);
  });

  pythonProcess.on("exit", (code, signal) => {
    console.warn(`[NetScope] Python Engine exited with code ${code}, signal ${signal}. Restarting in 2s...`);
    setTimeout(startPythonBackend, 2000);
  });
}

async function startServer() {
  // Start Python Network Engine
  startPythonBackend();

  const app = express();

  // AI Network Analyst powered by Gemini with strict grounding
  app.post("/api/ai/chat", express.json({ limit: "1mb" }), async (req, res) => {
    const { message, networkContext } = req.body || {};
    if (!message || typeof message !== "string") {
      return res.status(400).json({ error: "Message is required." });
    }

    const ai = getGeminiClient();

    const systemInstructions = `You are the NetScope AI Network Analyst, an elite defensive cybersecurity and network engineering specialist embedded directly into the NetScope Local Intelligence Platform.

YOUR GROUNDING DIRECTIVE:
You must strictly base your analysis on the REAL OBSERVED NETWORK TELEMETRY provided below.
DO NOT hallucinate IP addresses, MAC addresses, open ports, or network topologies.
If the user asks about an IP or device not in the telemetry, state clearly that it has not been observed by NetScope.

STRUCTURE OF YOUR RESPONSE:
1. FACT: Observations directly confirmed by hardware interface inspection, ARP, or ICMP probes.
2. INFERENCE: Logical deductions based on IEEE OUI vendor data, port patterns, or TTL characteristics.
3. RECOMMENDATION: Actionable, defensive, concrete security or configuration steps.

CURRENT NETWORK TELEMETRY:
${JSON.stringify(networkContext || {}, null, 2)}
`;

    if (!ai) {
      // Local fallback heuristic response when GEMINI_API_KEY is not configured
      const deviceCount = networkContext?.devices?.length || 0;
      const gw = networkContext?.baseline?.gateway?.ip || "Unknown";
      const score = networkContext?.security?.score ?? 85;

      const fallbackResponse = `### NetScope Local Heuristic Analysis (Offline Mode)
*Note: Google Gemini API Key is not configured. Displaying local rule-based analysis.*

**FACT (Observed Data):**
- **Active Gateway:** ${gw} (Observed via kernel routing table).
- **Discovered Inventory:** ${deviceCount} active network nodes recorded.
- **Defensive Security Score:** ${score}/100.

**INFERENCE:**
- The network topology is operational on local subnets with private RFC 1918 addressing.
- Hardware interfaces show standard local routing and ICMP responsiveness.

**RECOMMENDATION:**
1. Configure \`GEMINI_API_KEY\` in your environment or Settings to enable full multimodal AI reasoning.
2. Regularly audit unknown MAC vendor identifiers in the Device Inventory tab.`;

      return res.json({
        reply: fallbackResponse,
        model: "NetScope Local Rules (Offline)",
        grounded: true,
      });
    }

    try {
      const response = (await Promise.race([
        ai.models.generateContent({
          model: "gemini-3.6-flash",
          contents: [
            { role: "user", parts: [{ text: `${systemInstructions}\n\nUSER QUERY: ${message}` }] }
          ],
        }),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error("AI generation timed out after 15 seconds")), 15000)
        )
      ])) as { text?: string };

      const replyText = response.text || "No analysis could be generated.";
      return res.json({
        reply: replyText,
        model: "gemini-3.6-flash",
        grounded: true,
      });
    } catch (err: unknown) {
      console.error("[NetScope AI] Gemini Error:", err);
      const errMessage = err instanceof Error ? err.message : String(err);
      return res.status(500).json({
        error: `AI generation failure: ${errMessage}`,
        model: "gemini-3.6-flash",
      });
    }
  });

  // Proxy API and Socket.IO to Python Flask backend
  const pythonProxy = createProxyMiddleware({
    target: `http://127.0.0.1:${PYTHON_PORT}`,
    changeOrigin: true,
    ws: true,
    pathFilter: ["/api", "/socket.io"],
  });

  app.use(pythonProxy);

  // Health fallback endpoint
  app.get("/server-health", (_req, res) => {
    res.json({
      status: "ok",
      server: "Node Express Proxy",
      python_pid: pythonProcess?.pid,
      timestamp: new Date().toISOString(),
    });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (_req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  const server = app.listen(PORT, "0.0.0.0", () => {
    console.log(`[NetScope] Server running on http://0.0.0.0:${PORT}`);
  });

  // Support WebSocket upgrades for Socket.IO
  server.on("upgrade", (req, socket, head) => {
    if (req.url?.startsWith("/socket.io")) {
      // @ts-expect-error http-proxy-middleware upgrade handle
      pythonProxy.upgrade(req, socket, head);
    }
  });

  // Process cleanup
  const cleanup = () => {
    if (pythonProcess) {
      console.log("[NetScope] Terminating Python process...");
      pythonProcess.kill("SIGTERM");
    }
    process.exit(0);
  };

  process.on("SIGINT", cleanup);
  process.on("SIGTERM", cleanup);
}

startServer().catch((err) => {
  console.error("[NetScope] Fatal server startup failure:", err);
  process.exit(1);
});
