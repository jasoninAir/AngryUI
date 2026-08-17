import { describe, it, expect } from 'vitest';
import { parseAuthorizationMessage } from '../../src/components/chat/MessageItem';

describe('parseAuthorizationMessage', () => {
  it('detects allow once message', () => {
    const res = parseAuthorizationMessage('允许执行本次命令，请继续执行下一步任务。');
    expect(res).not.toBeNull();
    expect(res?.type).toBe('once');
    expect(res?.isAuth).toBe(true);
  });

  it('detects whitelist message with command', () => {
    const res = parseAuthorizationMessage('已将命令 ls -la 加入白名单规则，请继续执行任务。');
    expect(res).not.toBeNull();
    expect(res?.type).toBe('whitelist');
    expect(res?.command).toBe('ls -la');
  });

  it('detects English authorization granted', () => {
    const res = parseAuthorizationMessage('Authorization granted for this execution');
    expect(res).not.toBeNull();
    expect(res?.type).toBe('once');
  });

  it('returns null for normal user messages', () => {
    expect(parseAuthorizationMessage('你好，请帮我重构代码')).toBeNull();
    expect(parseAuthorizationMessage('Can you fix the bug in server.ts?')).toBeNull();
  });
});
