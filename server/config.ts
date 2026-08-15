import path from 'path';
import os from 'os';

export interface Config {
  port: number;
  host: string;
  token: string | null;
  agyHome: string;
  webuiHome: string;
}

export function getConfig(): Config {
  return {
    port: Number(process.env.AGY_WEBUI_PORT ?? 3000),
    host: process.env.AGY_WEBUI_HOST ?? '0.0.0.0',
    token: process.env.AGY_WEBUI_TOKEN || null,
    agyHome: path.join(os.homedir(), '.gemini', 'antigravity-cli'),
    webuiHome: path.join(os.homedir(), '.agy-webui')
  };
}
