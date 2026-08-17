/**
 * Strips ANSI escape sequences and non-printable control characters
 * while preserving standard whitespace (\n, \r, \t) and valid unicode characters.
 */
export function sanitizeOutputText(text: string = ''): string {
  if (!text) return '';
  return text
    // Strip ANSI escape codes (\x1b[...m, \x1b]... etc)
    .replace(/\x1b(?:[@-Z\\-_]|\[[0-?]*[ -/]*[@-~])/g, '')
    .replace(/\u001b\[[0-9;]*[a-zA-Z]/g, '')
    // Strip non-printable C0/C1 control chars and replacement character \uFFFD
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F-\u009F\uFFFD]/g, '');
}
