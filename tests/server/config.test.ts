import { describe, it, expect } from 'vitest';
import { parseCliArgs } from '../../server/config';

describe('CLI argument parsing for custom ports & hosts', () => {
  it('parses --port and -p correctly', () => {
    expect(parseCliArgs(['--port', '8080'])).toEqual({ port: 8080 });
    expect(parseCliArgs(['-p', '9000'])).toEqual({ port: 9000 });
    expect(parseCliArgs(['--port=7777'])).toEqual({ port: 7777 });
  });

  it('parses --host correctly', () => {
    expect(parseCliArgs(['--host', '127.0.0.1'])).toEqual({ host: '127.0.0.1' });
    expect(parseCliArgs(['--host=localhost'])).toEqual({ host: 'localhost' });
  });

  it('parses --token and -t correctly', () => {
    expect(parseCliArgs(['--token', 'secret123'])).toEqual({ token: 'secret123' });
    expect(parseCliArgs(['-t', 'secret456'])).toEqual({ token: 'secret456' });
  });

  it('parses multiple flags combined', () => {
    const res = parseCliArgs(['-p', '8080', '--host', '127.0.0.1', '-t', 'mytoken']);
    expect(res).toEqual({
      port: 8080,
      host: '127.0.0.1',
      token: 'mytoken'
    });
  });

  it('handles help flags', () => {
    expect(parseCliArgs(['--help']).help).toBe(true);
    expect(parseCliArgs(['-h']).help).toBe(true);
  });
});
