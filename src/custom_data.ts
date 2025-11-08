import { KiketClient, CustomDataClient, CustomDataListOptions, CustomDataListResponse, CustomDataRecordResponse } from './types';

const encodeSegment = (value: string) => encodeURIComponent(value);

function buildPath(moduleKey: string, table: string, recordId?: string | number): string {
  const base = `/ext/custom_data/${encodeSegment(moduleKey)}/${encodeSegment(table)}`;
  return recordId !== undefined ? `${base}/${recordId}` : base;
}

function buildParams(projectId: number | string, limit?: number, filters?: Record<string, unknown>) {
  const params: Record<string, string> = { project_id: String(projectId) };
  if (limit !== undefined) {
    params.limit = String(limit);
  }
  if (filters) {
    params.filters = JSON.stringify(filters);
  }
  return params;
}

export class KiketCustomDataClient implements CustomDataClient {
  constructor(private client: KiketClient, private projectId: number | string) {
    if (projectId === undefined || projectId === null || projectId === '') {
      throw new Error('project_id is required for custom data operations');
    }
  }

  async list(
    moduleKey: string,
    table: string,
    options: CustomDataListOptions = {}
  ): Promise<CustomDataListResponse> {
    return this.client.get(buildPath(moduleKey, table), {
      params: buildParams(this.projectId, options.limit, options.filters),
    });
  }

  async get(
    moduleKey: string,
    table: string,
    recordId: string | number
  ): Promise<CustomDataRecordResponse> {
    return this.client.get(buildPath(moduleKey, table, recordId), {
      params: buildParams(this.projectId),
    });
  }

  async create(
    moduleKey: string,
    table: string,
    record: Record<string, unknown>
  ): Promise<CustomDataRecordResponse> {
    return this.client.post(
      buildPath(moduleKey, table),
      { record },
      { params: buildParams(this.projectId) }
    );
  }

  async update(
    moduleKey: string,
    table: string,
    recordId: string | number,
    record: Record<string, unknown>
  ): Promise<CustomDataRecordResponse> {
    return this.client.patch(
      buildPath(moduleKey, table, recordId),
      { record },
      { params: buildParams(this.projectId) }
    );
  }

  async delete(moduleKey: string, table: string, recordId: string | number): Promise<void> {
    await this.client.delete(buildPath(moduleKey, table, recordId), {
      params: buildParams(this.projectId),
    });
  }
}
