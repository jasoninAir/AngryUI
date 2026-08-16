import path from 'path';
import fs from 'fs';
import os from 'os';

export interface Config {
  port: number;
  host: string;
  token: string | null;
  agyHome: string;
  webuiHome: string;
  agyBin: string;
}

function resolveAgyBin(): string {
  // Honor explicit override
  if (process.env.AGY_BIN && fs.existsSync(process.env.AGY_BIN)) {
    return process.env.AGY_BIN;
  }
  // Prefer ~/.local/bin/agy (real CLI binary on macOS & Linux)
  const localAgy = path.join(os.homedir(), '.local', 'bin', 'agy');
  if (fs.existsSync(localAgy)) return localAgy;

  // Windows standard install paths
  if (process.platform === 'win32') {
    const localAppData = process.env.LOCALAPPDATA || path.join(os.homedir(), 'AppData', 'Local');
    const winAgyCmd = path.join(localAppData, 'Programs', 'antigravity', 'bin', 'agy.cmd');
    if (fs.existsSync(winAgyCmd)) return winAgyCmd;
    const winAgyExe = path.join(localAppData, 'Programs', 'antigravity', 'bin', 'agy.exe');
    if (fs.existsSync(winAgyExe)) return winAgyExe;
  }

  // Fallback: rely on system PATH (resolved by child_process spawn)
  return process.platform === 'win32' ? 'agy.cmd' : 'agy';
}

export function parseCliArgs(argv = process.argv.slice(2)): {
  port?: number;
  host?: string;
  token?: string;
  help?: boolean;
} {
  const result: { port?: number; host?: string; token?: string; help?: boolean } = {};

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];

    if (arg === '--help' || arg === '-h' && argv.length === 1) {
      result.help = true;
    } else if (arg === '--port' || arg === '-p') {
      const val = argv[++i];
      if (val && !isNaN(Number(val))) result.port = Number(val);
    } else if (arg.startsWith('--port=')) {
      const val = arg.split('=')[1];
      if (val && !isNaN(Number(val))) result.port = Number(val);
    } else if (arg === '--host') {
      const val = argv[++i];
      if (val) result.host = val;
    } else if (arg.startsWith('--host=')) {
      result.host = arg.split('=')[1];
    } else if (arg === '--token' || arg === '-t') {
      const val = argv[++i];
      if (val) result.token = val;
    } else if (arg.startsWith('--token=')) {
      result.token = arg.split('=')[1];
    }
  }

  return result;
}

export function getConfig(): Config {
  const cli = parseCliArgs();

  if (cli.help) {
    console.log(`
AngryUI — Modern Web UI for Antigravity (AGY) CLI

Usage:
  npm start -- [options]
  node dist-server/server/index.js [options]

Options:
  -p, --port <port>       Port to listen on (default: 5173, env: AGY_WEBUI_PORT, PORT)
      --host <host>       Host to bind (default: 0.0.0.0, env: AGY_WEBUI_HOST)
  -t, --token <token>     Optional access token for API protection (env: AGY_WEBUI_TOKEN)
      --help              Show this help message

Examples:
  npm start -- --port 8080
  npm start -- -p 8888 --host 127.0.0.1
  node dist-server/server/index.js --port 9000
    `);
    process.exit(0);
  }

  const port =
    cli.port ??
    (process.env.AGY_WEBUI_PORT ? Number(process.env.AGY_WEBUI_PORT) : undefined) ??
    (process.env.PORT ? Number(process.env.PORT) : undefined) ??
    5173;

  const host =
    cli.host ??
    process.env.AGY_WEBUI_HOST ??
    '0.0.0.0';

  const token =
    cli.token ??
    process.env.AGY_WEBUI_TOKEN ??
    null;

  return {
    port,
    host,
    token,
    agyHome: path.join(os.homedir(), '.gemini', 'antigravity-cli'),
    webuiHome: path.join(os.homedir(), '.agy-webui'),
    agyBin: resolveAgyBin()
  };
}
