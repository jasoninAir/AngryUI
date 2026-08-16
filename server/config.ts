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

export function getConfig(): Config {
  return {
    port: Number(process.env.AGY_WEBUI_PORT ?? 3000),
    host: process.env.AGY_WEBUI_HOST ?? '0.0.0.0',
    token: process.env.AGY_WEBUI_TOKEN || null,
    agyHome: path.join(os.homedir(), '.gemini', 'antigravity-cli'),
    webuiHome: path.join(os.homedir(), '.agy-webui'),
    agyBin: resolveAgyBin()
  };
}
