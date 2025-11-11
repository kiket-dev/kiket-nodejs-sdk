import { KiketSlaEventsClient } from '../sla';
import { KiketClient } from '../types';

describe('KiketSlaEventsClient', () => {
  let mockClient: jest.Mocked<KiketClient>;

  beforeEach(() => {
    mockClient = {
      get: jest.fn(),
      post: jest.fn(),
      put: jest.fn(),
      patch: jest.fn(),
      delete: jest.fn(),
      close: jest.fn(),
    } as unknown as jest.Mocked<KiketClient>;
  });

  it('lists events with filters', async () => {
    mockClient.get.mockResolvedValue({ data: [] });

    const client = new KiketSlaEventsClient(mockClient, 42);
    await client.list({ state: 'breached', issueId: '77', limit: 5 });

    expect(mockClient.get).toHaveBeenCalledWith('/api/v1/ext/sla/events', {
      params: expect.objectContaining({
        project_id: '42',
        state: 'breached',
        issue_id: '77',
        limit: '5',
      }),
    });
  });
});
