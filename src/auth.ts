/**
 * JWT verification for webhook payloads.
 * Verifies runtime tokens are signed by Kiket using ES256 (ECDSA P-256).
 */
import * as jose from 'jose';
import axios from 'axios';

const ALGORITHM = 'ES256';
const ISSUER = 'kiket.dev';
const JWKS_CACHE_TTL = 3600 * 1000; // 1 hour in ms

interface JwksCache {
  jwks: jose.JSONWebKeySet;
  fetchedAt: number;
}

interface JwtPayload {
  sub: string;
  org_id?: number;
  ext_id?: number;
  proj_id?: number;
  pi_id?: number;
  scopes?: string[];
  src?: string;
  iss: string;
  iat: number;
  exp: number;
  jti: string;
}

const jwksCache: Map<string, JwksCache> = new Map();

/**
 * Authentication error.
 */
export class AuthenticationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AuthenticationError';
  }
}

/**
 * Verify the runtime token JWT from the payload.
 *
 * @param payload - The webhook payload containing authentication.runtime_token
 * @param baseUrl - Base URL for fetching JWKS
 * @returns The decoded JWT payload
 * @throws {AuthenticationError} If token is invalid or missing
 */
export async function verifyRuntimeToken(
  payload: Record<string, unknown>,
  baseUrl: string
): Promise<JwtPayload> {
  const auth = (payload?.authentication as Record<string, unknown>) || {};
  const token = auth.runtime_token as string;

  if (!token) {
    throw new AuthenticationError('Missing runtime_token in payload');
  }

  return decodeJwt(token, baseUrl);
}

/**
 * Decode and verify a JWT token using the public key from JWKS.
 *
 * @param token - The JWT token to verify
 * @param baseUrl - Base URL for fetching JWKS
 * @returns The decoded payload
 * @throws {AuthenticationError} If token is invalid
 */
export async function decodeJwt(token: string, baseUrl: string): Promise<JwtPayload> {
  try {
    const jwks = await fetchJwks(baseUrl);
    const keySet = jose.createLocalJWKSet(jwks);

    const { payload } = await jose.jwtVerify(token, keySet, {
      algorithms: [ALGORITHM],
      issuer: ISSUER,
    });

    return payload as unknown as JwtPayload;
  } catch (error) {
    if (error instanceof jose.errors.JWTExpired) {
      throw new AuthenticationError('Runtime token has expired');
    }
    if (error instanceof jose.errors.JWTClaimValidationFailed) {
      throw new AuthenticationError(`Invalid token claim: ${error.message}`);
    }
    if (error instanceof jose.errors.JWSSignatureVerificationFailed) {
      throw new AuthenticationError('Invalid token signature');
    }
    if (error instanceof AuthenticationError) {
      throw error;
    }
    throw new AuthenticationError(`Invalid token: ${(error as Error).message}`);
  }
}

/**
 * Fetch JWKS from the well-known endpoint with caching.
 *
 * @param baseUrl - Base URL for fetching JWKS
 * @returns The JWKS response
 * @throws {AuthenticationError} If JWKS cannot be fetched
 */
export async function fetchJwks(baseUrl: string): Promise<jose.JSONWebKeySet> {
  const cached = jwksCache.get(baseUrl);

  if (cached && Date.now() - cached.fetchedAt < JWKS_CACHE_TTL) {
    return cached.jwks;
  }

  const jwksUrl = `${baseUrl.replace(/\/+$/, '')}/.well-known/jwks.json`;

  try {
    const response = await axios.get<jose.JSONWebKeySet>(jwksUrl, {
      timeout: 10000,
    });

    const jwks = response.data;
    jwksCache.set(baseUrl, { jwks, fetchedAt: Date.now() });
    return jwks;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      throw new AuthenticationError(`Failed to fetch JWKS: ${error.message}`);
    }
    throw new AuthenticationError(`Failed to fetch JWKS: ${(error as Error).message}`);
  }
}

/**
 * Clear the JWKS cache (useful for testing or key rotation).
 */
export function clearJwksCache(): void {
  jwksCache.clear();
}

/**
 * Authentication context extracted from JWT.
 */
export interface AuthContext {
  runtimeToken: string;
  tokenType: string;
  expiresAt: string | null;
  scopes: string[];
  orgId?: number;
  extId?: number;
  projId?: number;
}

/**
 * Build authentication context from verified JWT payload and raw payload.
 *
 * @param jwtPayload - The verified JWT claims
 * @param rawPayload - The original webhook payload
 * @returns Authentication context
 */
export function buildAuthContext(
  jwtPayload: JwtPayload,
  rawPayload: Record<string, unknown>
): AuthContext {
  const rawAuth = (rawPayload?.authentication as Record<string, unknown>) || {};

  return {
    runtimeToken: rawAuth.runtime_token as string,
    tokenType: 'runtime',
    expiresAt: jwtPayload.exp ? new Date(jwtPayload.exp * 1000).toISOString() : null,
    scopes: jwtPayload.scopes || [],
    orgId: jwtPayload.org_id,
    extId: jwtPayload.ext_id,
    projId: jwtPayload.proj_id,
  };
}
