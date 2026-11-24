import pako from 'pako';

export interface SharedDiagramPayload {
  title: string;
  code: string;
  presentation?: boolean;
}

function uint8ToBase64Url(bytes: Uint8Array): string {
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function base64UrlToUint8(str: string): Uint8Array {
  let base64 = str.replace(/-/g, '+').replace(/_/g, '/');
  while (base64.length % 4) {
    base64 += '=';
  }
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

export function encodeSharePayload(payload: SharedDiagramPayload): string {
  const json = JSON.stringify(payload);
  const compressed = pako.deflate(new TextEncoder().encode(json));
  return `pako:${uint8ToBase64Url(compressed)}`;
}

export function decodeShareHash(hash: string): SharedDiagramPayload | null {
  try {
    const clean = hash.replace(/^#/, '');
    if (!clean.startsWith('pako:')) return null;
    const encoded = clean.slice(5);
    const compressed = base64UrlToUint8(encoded);
    const jsonBytes = pako.inflate(compressed);
    const parsed = JSON.parse(new TextDecoder().decode(jsonBytes));
    if (typeof parsed?.code === 'string') {
      return {
        title: typeof parsed.title === 'string' ? parsed.title : 'Shared Diagram',
        code: parsed.code,
        presentation: Boolean(parsed.presentation),
      };
    }
    return null;
  } catch {
    return null;
  }
}

export function buildShareUrl(payload: SharedDiagramPayload): string {
  const base = `${window.location.origin}${window.location.pathname}`;
  return `${base}#${encodeSharePayload(payload)}`;
}
