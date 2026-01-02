/**
 * Blockchain audit verification client for the Kiket API.
 */
import { createHash } from 'crypto';

export interface BlockchainAnchor {
  id: number;
  merkle_root: string;
  leaf_count: number;
  first_record_at: string | null;
  last_record_at: string | null;
  network: string;
  status: string;
  tx_hash: string | null;
  block_number: number | null;
  block_timestamp: string | null;
  confirmed_at: string | null;
  explorer_url: string | null;
  created_at: string | null;
  records?: AnchorRecord[];
}

export interface AnchorRecord {
  id: number;
  type: string;
  leaf_index: number;
  content_hash: string;
}

export interface BlockchainProof {
  record_id: number;
  record_type: string;
  content_hash: string;
  anchor_id: number;
  merkle_root: string;
  leaf_index: number;
  leaf_count: number;
  proof: string[];
  network: string;
  tx_hash: string | null;
  block_number: number | null;
  block_timestamp: string | null;
  verified: boolean;
  verification_url: string | null;
}

export interface VerificationResult {
  verified: boolean;
  proof_valid: boolean;
  blockchain_verified: boolean;
  content_hash: string;
  merkle_root: string;
  leaf_index: number;
  block_number: number | null;
  block_timestamp: string | null;
  network: string | null;
  explorer_url: string | null;
  error?: string;
}

export interface ListAnchorsOptions {
  status?: 'pending' | 'submitted' | 'confirmed' | 'failed';
  network?: 'polygon_amoy' | 'polygon_mainnet';
  from?: Date;
  to?: Date;
  page?: number;
  per_page?: number;
}

export interface PaginationInfo {
  page: number;
  per_page: number;
  total: number;
  total_pages: number;
}

export interface ListAnchorsResult {
  anchors: BlockchainAnchor[];
  pagination: PaginationInfo;
}

/**
 * HTTP client interface expected by AuditClient
 */
export interface HttpClient {
  get(path: string, params?: Record<string, string>): Promise<{ json(): Promise<unknown> }>;
  post(path: string, body?: Record<string, unknown>): Promise<{ json(): Promise<unknown> }>;
}

/**
 * Client for blockchain audit verification operations.
 */
export class AuditClient {
  constructor(private readonly httpClient: HttpClient) {}

  /**
   * List blockchain anchors for the organization.
   */
  async listAnchors(options: ListAnchorsOptions = {}): Promise<ListAnchorsResult> {
    const params: Record<string, string> = {};

    if (options.status) params.status = options.status;
    if (options.network) params.network = options.network;
    if (options.from) params.from = options.from.toISOString();
    if (options.to) params.to = options.to.toISOString();
    if (options.page) params.page = String(options.page);
    if (options.per_page) params.per_page = String(options.per_page);

    const response = await this.httpClient.get('/api/v1/audit/anchors', params);
    const data = (await response.json()) as ListAnchorsResult;

    return data;
  }

  /**
   * Get details of a specific anchor by merkle root.
   */
  async getAnchor(merkleRoot: string, options: { includeRecords?: boolean } = {}): Promise<BlockchainAnchor> {
    const params: Record<string, string> = {};
    if (options.includeRecords) params.include_records = 'true';

    const response = await this.httpClient.get(`/api/v1/audit/anchors/${merkleRoot}`, params);
    return (await response.json()) as BlockchainAnchor;
  }

  /**
   * Get the blockchain proof for a specific audit record.
   * @param recordId - The ID of the audit record
   * @param recordType - Type of record ("AuditLog" or "AIAuditLog"), defaults to "AuditLog"
   */
  async getProof(
    recordId: number,
    recordType: 'AuditLog' | 'AIAuditLog' = 'AuditLog'
  ): Promise<BlockchainProof> {
    const params = recordType !== 'AuditLog' ? { record_type: recordType } : {};
    const response = await this.httpClient.get(
      `/api/v1/audit/records/${recordId}/proof`,
      params
    );
    return (await response.json()) as BlockchainProof;
  }

  /**
   * Verify a blockchain proof via the API.
   */
  async verify(proof: BlockchainProof | VerifyProofParams): Promise<VerificationResult> {
    const payload = 'record_id' in proof
      ? {
          content_hash: proof.content_hash,
          merkle_root: proof.merkle_root,
          proof: proof.proof,
          leaf_index: proof.leaf_index,
          tx_hash: proof.tx_hash,
        }
      : proof;

    const response = await this.httpClient.post('/api/v1/audit/verify', payload);
    return (await response.json()) as VerificationResult;
  }

  /**
   * Compute the content hash for a record (for local verification).
   */
  static computeContentHash(data: Record<string, unknown>): string {
    const sorted = Object.keys(data)
      .sort()
      .reduce((acc, key) => {
        acc[key] = data[key];
        return acc;
      }, {} as Record<string, unknown>);

    const canonical = JSON.stringify(sorted);
    const hash = createHash('sha256').update(canonical, 'utf8').digest('hex');
    return `0x${hash}`;
  }

  /**
   * Verify a Merkle proof locally without making an API call.
   */
  static verifyProofLocally(
    contentHash: string,
    proofPath: string[],
    leafIndex: number,
    merkleRoot: string
  ): boolean {
    const normalizeHash = (h: string): Buffer => {
      const hex = h.startsWith('0x') ? h.slice(2) : h;
      return Buffer.from(hex, 'hex');
    };

    const hashPair = (left: Buffer, right: Buffer): Buffer => {
      if (left.compare(right) > 0) {
        [left, right] = [right, left];
      }
      return createHash('sha256').update(Buffer.concat([left, right])).digest();
    };

    let current = normalizeHash(contentHash);
    let idx = leafIndex;

    for (const siblingHex of proofPath) {
      const sibling = normalizeHash(siblingHex);
      if (idx % 2 === 0) {
        current = hashPair(current, sibling);
      } else {
        current = hashPair(sibling, current);
      }
      idx = Math.floor(idx / 2);
    }

    const expected = normalizeHash(merkleRoot);
    return current.equals(expected);
  }
}

export interface VerifyProofParams {
  content_hash: string;
  merkle_root: string;
  proof: string[];
  leaf_index: number;
  tx_hash?: string | null;
}
