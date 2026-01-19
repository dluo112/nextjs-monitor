import crypto from 'crypto';

export function sha1Hex(text: string): string {
  const shasum = crypto.createHash('sha1');
  shasum.update(text, 'utf-8');
  return shasum.digest('hex');
}
