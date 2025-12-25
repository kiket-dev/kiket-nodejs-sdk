/**
 * Intake forms client for managing intake forms and submissions.
 */
import {
  KiketClient,
  IntakeFormsClient,
  IntakeForm,
  IntakeFormListResponse,
  IntakeSubmission,
  IntakeSubmissionListResponse,
  IntakeFormStats,
  IntakeFormListOptions,
  IntakeSubmissionListOptions,
  IntakeSubmissionCreateOptions,
} from './types';

const API_PREFIX = '/api/v1';

const encodeSegment = (value: string) => encodeURIComponent(value);

function buildParams(
  projectId: number | string,
  options?: Record<string, string | number | boolean | undefined>
): Record<string, string> {
  const params: Record<string, string> = { project_id: String(projectId) };
  if (options) {
    for (const [key, value] of Object.entries(options)) {
      if (value !== undefined && value !== null) {
        params[key] = String(value);
      }
    }
  }
  return params;
}

/**
 * Client for managing intake forms and submissions via the Kiket API.
 */
export class KiketIntakeFormsClient implements IntakeFormsClient {
  constructor(
    private client: KiketClient,
    private projectId: number | string
  ) {
    if (projectId === undefined || projectId === null || projectId === '') {
      throw new Error('project_id is required for intake form operations');
    }
  }

  /**
   * List all intake forms for the project.
   */
  async list(options: IntakeFormListOptions = {}): Promise<IntakeFormListResponse> {
    const params = buildParams(this.projectId, {
      active: options.active,
      public: options.publicOnly,
      limit: options.limit,
    });

    return this.client.get(`${API_PREFIX}/ext/intake_forms`, { params });
  }

  /**
   * Get a specific intake form by key or ID.
   */
  async get(formKey: string): Promise<IntakeForm> {
    if (!formKey) {
      throw new Error('formKey is required');
    }

    return this.client.get(
      `${API_PREFIX}/ext/intake_forms/${encodeSegment(formKey)}`,
      { params: buildParams(this.projectId) }
    );
  }

  /**
   * Get the public URL for a form if it's public.
   */
  publicUrl(form: IntakeForm): string | null {
    if (form.public) {
      return form.formUrl ?? null;
    }
    return null;
  }

  /**
   * List submissions for an intake form.
   */
  async listSubmissions(
    formKey: string,
    options: IntakeSubmissionListOptions = {}
  ): Promise<IntakeSubmissionListResponse> {
    if (!formKey) {
      throw new Error('formKey is required');
    }

    const params = buildParams(this.projectId, {
      status: options.status,
      limit: options.limit,
      since: options.since instanceof Date ? options.since.toISOString() : options.since,
    });

    return this.client.get(
      `${API_PREFIX}/ext/intake_forms/${encodeSegment(formKey)}/submissions`,
      { params }
    );
  }

  /**
   * Get a specific submission by ID.
   */
  async getSubmission(formKey: string, submissionId: string | number): Promise<IntakeSubmission> {
    if (!formKey) {
      throw new Error('formKey is required');
    }
    if (submissionId === undefined || submissionId === null) {
      throw new Error('submissionId is required');
    }

    return this.client.get(
      `${API_PREFIX}/ext/intake_forms/${encodeSegment(formKey)}/submissions/${submissionId}`,
      { params: buildParams(this.projectId) }
    );
  }

  /**
   * Create a new submission for an intake form.
   * Typically used for internal/programmatic submissions.
   */
  async createSubmission(
    formKey: string,
    data: Record<string, unknown>,
    options: IntakeSubmissionCreateOptions = {}
  ): Promise<IntakeSubmission> {
    if (!formKey) {
      throw new Error('formKey is required');
    }
    if (!data) {
      throw new Error('data is required');
    }

    const payload: Record<string, unknown> = {
      project_id: this.projectId,
      data,
    };
    if (options.metadata) {
      payload.metadata = options.metadata;
    }

    return this.client.post(
      `${API_PREFIX}/ext/intake_forms/${encodeSegment(formKey)}/submissions`,
      payload
    );
  }

  /**
   * Approve a pending submission.
   */
  async approveSubmission(
    formKey: string,
    submissionId: string | number,
    notes?: string
  ): Promise<IntakeSubmission> {
    if (!formKey) {
      throw new Error('formKey is required');
    }
    if (submissionId === undefined || submissionId === null) {
      throw new Error('submissionId is required');
    }

    const payload: Record<string, unknown> = { project_id: this.projectId };
    if (notes) {
      payload.notes = notes;
    }

    return this.client.post(
      `${API_PREFIX}/ext/intake_forms/${encodeSegment(formKey)}/submissions/${submissionId}/approve`,
      payload
    );
  }

  /**
   * Reject a pending submission.
   */
  async rejectSubmission(
    formKey: string,
    submissionId: string | number,
    notes?: string
  ): Promise<IntakeSubmission> {
    if (!formKey) {
      throw new Error('formKey is required');
    }
    if (submissionId === undefined || submissionId === null) {
      throw new Error('submissionId is required');
    }

    const payload: Record<string, unknown> = { project_id: this.projectId };
    if (notes) {
      payload.notes = notes;
    }

    return this.client.post(
      `${API_PREFIX}/ext/intake_forms/${encodeSegment(formKey)}/submissions/${submissionId}/reject`,
      payload
    );
  }

  /**
   * Get submission statistics for an intake form.
   */
  async stats(formKey: string, period?: string): Promise<IntakeFormStats> {
    if (!formKey) {
      throw new Error('formKey is required');
    }

    const params = buildParams(this.projectId, { period });

    return this.client.get(
      `${API_PREFIX}/ext/intake_forms/${encodeSegment(formKey)}/stats`,
      { params }
    );
  }
}
