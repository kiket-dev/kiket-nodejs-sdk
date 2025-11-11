import { KiketClient, SlaEventsClient, SlaEventsListOptions, SlaEventsListResponse } from './types';

const SLA_PATH = '/api/v1/ext/sla/events';

const buildParams = (
  projectId: string,
  options: SlaEventsListOptions = {}
): Record<string, string> => {
  const params: Record<string, string> = { project_id: projectId };
  if (options.issueId !== undefined && options.issueId !== null) {
    params.issue_id = String(options.issueId);
  }
  if (options.state) {
    params.state = options.state;
  }
  if (options.limit !== undefined && options.limit !== null) {
    params.limit = String(options.limit);
  }
  return params;
};

export class KiketSlaEventsClient implements SlaEventsClient {
  private readonly projectId: string;

  constructor(private client: KiketClient, projectId: string | number) {
    if (projectId === undefined || projectId === null || String(projectId).trim() === '') {
      throw new Error('projectId is required for SLA events');
    }

    this.projectId = String(projectId);
  }

  async list(options: SlaEventsListOptions = {}): Promise<SlaEventsListResponse> {
    return this.client.get(SLA_PATH, {
      params: buildParams(this.projectId, options),
    });
  }
}
