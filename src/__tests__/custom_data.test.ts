import { KiketCustomDataClient } from '../custom_data';
import { KiketClient } from '../types';

describe('KiketCustomDataClient', () => {
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

  it('lists records with project params and filters', async () => {
    mockClient.get.mockResolvedValue({ data: [] });

    const client = new KiketCustomDataClient(mockClient, 42);
    await client.list('com.example.crm.contacts', 'records', {
      limit: 10,
      filters: { status: 'active' },
    });

    expect(mockClient.get).toHaveBeenCalledWith(
      '/api/v1/ext/custom_data/com.example.crm.contacts/records',
      {
        params: expect.objectContaining({
          project_id: '42',
          limit: '10',
          filters: JSON.stringify({ status: 'active' }),
        }),
      }
    );
  });

  it('creates records with record payload', async () => {
    mockClient.post.mockResolvedValue({ data: { id: 1 } });

    const client = new KiketCustomDataClient(mockClient, 'proj-1');
    await client.create('com.example.crm.contacts', 'records', { email: 'lead@example.com' });

    expect(mockClient.post).toHaveBeenCalledWith(
      '/api/v1/ext/custom_data/com.example.crm.contacts/records',
      { record: { email: 'lead@example.com' } },
      {
        params: { project_id: 'proj-1' },
      }
    );
  });
});
