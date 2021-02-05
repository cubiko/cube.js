import crypto from 'crypto';
import { asyncMemoize } from '@cubejs-backend/shared';
import fetch from 'node-fetch';
import jwkToPem from 'jwk-to-pem';

export const fetchJWKS = asyncMemoize(async (url: string) => {
  const response = await fetch(url);
  const json = await response.json();

  if (!json.keys) {
    throw new Error('Unable to find keys inside response from JWK_URL');
  }

  const result = new Map<string, string>();

  // eslint-disable-next-line no-restricted-syntax
  for (const jwk of json.keys) {
    if (!jwk.kid) {
      throw new Error('Unable to find kid inside JWK');
    }

    result.set(jwk.kid, jwkToPem(jwk));
  }

  return result;
}, {
  extractKey: (url) => crypto.createHash('md5').update(url).digest('hex'),
  extractCacheLifetime: () => 60 * 5,
});
