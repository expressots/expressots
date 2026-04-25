/**
 * Studio Orchestrator
 * 
 * Two modes:
 * 1. UI-only mode (default): Just serves the UI, connects to agent in user's app
 * 2. Standalone mode: Starts its own agent (for demos or when not using core integration)
 */

import express, { Express, Request, Response } from 'express';
import { createServer, Server } from 'http';
import { io as SocketIOClient, Socket } from 'socket.io-client';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { StudioAgent } from '@expressots/studio-agent';

export interface StudioConfig {
  uiPort: number;
  agentPort: number;
  dbPath: string;
  srcPath: string;
  serviceName?: string;
  /** If true, starts a standalone agent (default: false, just serves UI) */
  standalone?: boolean;
}

export class Studio {
  private config: StudioConfig;
  private agent: StudioAgent | null = null;
  private uiApp: Express | null = null;
  private uiServer: Server | null = null;
  private agentClient: Socket | null = null;
  private agentConnected: boolean = false;

  constructor(config: Partial<StudioConfig> = {}) {
    this.config = {
      uiPort: config.uiPort ?? 3333,
      agentPort: config.agentPort ?? 3334,
      dbPath: config.dbPath ?? '.studio/studio.db',
      srcPath: config.srcPath ?? './src',
      serviceName: config.serviceName ?? 'expressots-app',
      standalone: config.standalone ?? false,
    };
  }

  /** Start the Studio */
  async start(): Promise<void> {
    if (this.config.standalone) {
      // Standalone mode: Start our own agent
      console.log('🔧 Starting in standalone mode...');
      await this.startAgent();
    } else {
      // UI-only mode: Try to connect to existing agent
      await this.connectToAgent();
    }

    // Start the UI server
    await this.startUIServer();
  }

  /** Stop the Studio */
  async stop(): Promise<void> {
    // Disconnect from agent
    if (this.agentClient) {
      this.agentClient.disconnect();
      this.agentClient = null;
    }

    // Stop UI server
    if (this.uiServer) {
      await new Promise<void>((resolve) => {
        this.uiServer!.close(() => resolve());
      });
      this.uiServer = null;
    }

    // Stop agent (only if we started it)
    if (this.agent) {
      await this.agent.stop();
      this.agent = null;
    }
  }

  /** Connect to an existing agent running in the user's app */
  private async connectToAgent(): Promise<void> {
    const agentUrl = `http://localhost:${this.config.agentPort}`;
    
    return new Promise((resolve) => {
      this.agentClient = SocketIOClient(agentUrl, {
        transports: ['websocket'],
        reconnection: true,
        reconnectionDelay: 1000,
        reconnectionAttempts: 5,
        timeout: 3000,
      });

      const timeout = setTimeout(() => {
        if (!this.agentConnected) {
          console.log('\n⚠️  No agent detected on port ' + this.config.agentPort);
          console.log('   Your app needs @expressots/studio-agent installed to capture requests.');
          console.log('');
          console.log('   Quick fix options:');
          console.log('   1. Install in your app: npm install @expressots/studio-agent');
          console.log('   2. Or run standalone:   expressots studio --standalone');
          console.log('');
          resolve();
        }
      }, 3000);

      this.agentClient.on('connect', () => {
        clearTimeout(timeout);
        this.agentConnected = true;
        console.log('✅ Connected to Studio Agent in your app');
        resolve();
      });

      this.agentClient.on('disconnect', () => {
        this.agentConnected = false;
        console.log('⚠️  Disconnected from Studio Agent');
      });

      this.agentClient.on('connect_error', () => {
        // Will retry automatically
      });
    });
  }

  /** Start the Studio Agent (standalone mode only) */
  private async startAgent(): Promise<void> {
    this.agent = new StudioAgent({
      port: this.config.agentPort,
      dbPath: this.config.dbPath,
      serviceName: this.config.serviceName,
      enableRecording: true,
      enableProfiling: true,
    });

    await this.agent.start();
  }

  /** Start the UI server */
  private async startUIServer(): Promise<void> {
    this.uiApp = express();

    // Try to find the built UI files
    const uiDistPath = this.findUIDistPath();

    if (uiDistPath && fs.existsSync(uiDistPath)) {
      // Serve static files from the UI build
      this.uiApp.use(express.static(uiDistPath));

      // SPA fallback - Express 5.x requires named wildcards
      this.uiApp.get('/{*splat}', (_req: Request, res: Response) => {
        res.sendFile(path.join(uiDistPath, 'index.html'));
      });
    } else {
      // Development mode - show placeholder
      this.uiApp.get('/{*splat}', (_req: Request, res: Response) => {
        res.send(this.getDevModeHTML());
      });
    }

    this.uiServer = createServer(this.uiApp);

    return new Promise((resolve, reject) => {
      this.uiServer!.listen(this.config.uiPort, () => {
        resolve();
      });

      this.uiServer!.on('error', (err: Error) => {
        reject(err);
      });
    });
  }

  /** Find the UI dist path */
  private findUIDistPath(): string | null {
    const possiblePaths = [
      // Monorepo development
      path.resolve(process.cwd(), 'node_modules/@expressots/studio-ui/dist'),
      // Installed as dependency
      path.resolve(
        path.dirname(fileURLToPath(import.meta.url)),
        '../../studio-ui/dist'
      ),
      // Relative to this package
      path.resolve(
        path.dirname(fileURLToPath(import.meta.url)),
        '../../../studio-ui/dist'
      ),
    ];

    for (const p of possiblePaths) {
      if (fs.existsSync(p)) {
        return p;
      }
    }

    return null;
  }

  /** Get development mode HTML */
  private getDevModeHTML(): string {
    const modeText = this.config.standalone 
      ? '🔧 Standalone Mode - Agent running here'
      : this.agentConnected 
        ? '✅ Connected to your app\'s agent'
        : '⏳ Waiting for agent connection...';

    const modeColor = this.config.standalone 
      ? '#f59e0b'
      : this.agentConnected 
        ? '#22c55e'
        : '#6b7280';

    return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>ExpressoTS Studio</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: linear-gradient(135deg, #0c1222 0%, #1a1a2e 100%);
      color: #fff;
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .container { text-align: center; padding: 40px; max-width: 600px; }
    .logo { font-size: 4rem; margin-bottom: 20px; }
    h1 {
      font-size: 2.5rem;
      margin-bottom: 10px;
      background: linear-gradient(90deg, #0ea5e9, #d946ef);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
    }
    .subtitle { color: #9ca3af; font-size: 1.1rem; margin-bottom: 30px; }
    .status {
      background: rgba(14, 165, 233, 0.1);
      border: 1px solid ${modeColor}40;
      border-radius: 12px;
      padding: 20px 30px;
      margin-bottom: 30px;
    }
    .status h2 { color: ${modeColor}; font-size: 1.2rem; margin-bottom: 10px; }
    .status p { color: #9ca3af; }
    .agent-info {
      background: rgba(34, 197, 94, 0.1);
      border: 1px solid rgba(34, 197, 94, 0.3);
      border-radius: 8px;
      padding: 15px;
      margin-top: 20px;
    }
    .agent-info code { color: #22c55e; font-family: 'JetBrains Mono', monospace; }
    .instructions { color: #6b7280; font-size: 0.9rem; margin-top: 30px; line-height: 1.8; }
    .instructions code {
      background: rgba(255,255,255,0.1);
      padding: 2px 8px;
      border-radius: 4px;
      font-family: 'JetBrains Mono', monospace;
    }
    .help-box {
      background: rgba(99, 102, 241, 0.1);
      border: 1px solid rgba(99, 102, 241, 0.3);
      border-radius: 8px;
      padding: 20px;
      margin-top: 30px;
      text-align: left;
    }
    .help-box h3 { color: #818cf8; margin-bottom: 10px; }
    .help-box ol { padding-left: 20px; color: #9ca3af; }
    .help-box li { margin-bottom: 8px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="logo">⚡</div>
    <h1>ExpressoTS Studio</h1>
    <p class="subtitle">Developer Experience Platform</p>
    
    <div class="status">
      <h2>${modeText}</h2>
      <div class="agent-info">
        <code>ws://localhost:${this.config.agentPort}</code>
      </div>
    </div>
    
    ${!this.agentConnected && !this.config.standalone ? `
    <div class="help-box">
      <h3>📋 How to capture requests:</h3>
      <ol>
        <li>Install the agent in your app: <code>npm install @expressots/studio-agent</code></li>
        <li>Restart your ExpressoTS app</li>
        <li>Refresh this page</li>
      </ol>
    </div>
    ` : ''}
    
    <p class="instructions">
      To see the full UI, ensure @expressots/studio-ui is installed
    </p>
  </div>
</body>
</html>
    `;
  }

  /** Check if agent is connected */
  isAgentConnected(): boolean {
    return this.agentConnected || this.agent !== null;
  }

  /** Get the Studio Agent instance (standalone mode only) */
  getAgent(): StudioAgent | null {
    return this.agent;
  }

  /** Get configuration */
  getConfig(): StudioConfig {
    return { ...this.config };
  }
}
