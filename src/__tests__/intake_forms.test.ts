import { KiketIntakeFormsClient } from '../intake_forms';
import { KiketClient, IntakeForm } from '../types';

describe('KiketIntakeFormsClient', () => {
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

  describe('constructor', () => {
    it('throws error when projectId is empty', () => {
      expect(() => new KiketIntakeFormsClient(mockClient, '')).toThrow(
        'project_id is required'
      );
    });

    it('throws error when projectId is null', () => {
      expect(() => new KiketIntakeFormsClient(mockClient, null as unknown as string)).toThrow(
        'project_id is required'
      );
    });
  });

  describe('list', () => {
    it('lists forms with project_id param', async () => {
      mockClient.get.mockResolvedValue({ data: [] });

      const client = new KiketIntakeFormsClient(mockClient, 42);
      await client.list();

      expect(mockClient.get).toHaveBeenCalledWith('/api/v1/ext/intake_forms', {
        params: { project_id: '42' },
      });
    });

    it('includes optional filters', async () => {
      mockClient.get.mockResolvedValue({ data: [] });

      const client = new KiketIntakeFormsClient(mockClient, 42);
      await client.list({ active: true, publicOnly: true, limit: 10 });

      expect(mockClient.get).toHaveBeenCalledWith('/api/v1/ext/intake_forms', {
        params: {
          project_id: '42',
          active: 'true',
          public: 'true',
          limit: '10',
        },
      });
    });
  });

  describe('get', () => {
    it('gets form by key', async () => {
      const mockForm = { id: 1, key: 'feedback', name: 'Feedback Form' };
      mockClient.get.mockResolvedValue(mockForm);

      const client = new KiketIntakeFormsClient(mockClient, 42);
      const result = await client.get('feedback');

      expect(mockClient.get).toHaveBeenCalledWith(
        '/api/v1/ext/intake_forms/feedback',
        { params: { project_id: '42' } }
      );
      expect(result).toEqual(mockForm);
    });

    it('throws error when formKey is empty', async () => {
      const client = new KiketIntakeFormsClient(mockClient, 42);
      await expect(client.get('')).rejects.toThrow('formKey is required');
    });
  });

  describe('publicUrl', () => {
    it('returns URL for public form', () => {
      const client = new KiketIntakeFormsClient(mockClient, 42);
      const form: IntakeForm = {
        id: 1,
        key: 'feedback',
        name: 'Feedback',
        active: true,
        public: true,
        fields: [],
        formUrl: 'https://app.kiket.dev/forms/feedback',
        embedAllowed: true,
        submissionsCount: 0,
        createdAt: '2025-01-01',
        updatedAt: '2025-01-01',
      };

      expect(client.publicUrl(form)).toBe('https://app.kiket.dev/forms/feedback');
    });

    it('returns null for private form', () => {
      const client = new KiketIntakeFormsClient(mockClient, 42);
      const form: IntakeForm = {
        id: 1,
        key: 'internal',
        name: 'Internal',
        active: true,
        public: false,
        fields: [],
        embedAllowed: false,
        submissionsCount: 0,
        createdAt: '2025-01-01',
        updatedAt: '2025-01-01',
      };

      expect(client.publicUrl(form)).toBeNull();
    });
  });

  describe('listSubmissions', () => {
    it('lists submissions for a form', async () => {
      mockClient.get.mockResolvedValue({ data: [] });

      const client = new KiketIntakeFormsClient(mockClient, 42);
      await client.listSubmissions('feedback', { status: 'pending', limit: 25 });

      expect(mockClient.get).toHaveBeenCalledWith(
        '/api/v1/ext/intake_forms/feedback/submissions',
        {
          params: {
            project_id: '42',
            status: 'pending',
            limit: '25',
          },
        }
      );
    });

    it('handles Date object for since parameter', async () => {
      mockClient.get.mockResolvedValue({ data: [] });

      const client = new KiketIntakeFormsClient(mockClient, 42);
      const sinceDate = new Date('2025-01-01T12:00:00Z');
      await client.listSubmissions('feedback', { since: sinceDate });

      expect(mockClient.get).toHaveBeenCalledWith(
        '/api/v1/ext/intake_forms/feedback/submissions',
        {
          params: expect.objectContaining({
            since: sinceDate.toISOString(),
          }),
        }
      );
    });

    it('throws error when formKey is empty', async () => {
      const client = new KiketIntakeFormsClient(mockClient, 42);
      await expect(client.listSubmissions('')).rejects.toThrow('formKey is required');
    });
  });

  describe('getSubmission', () => {
    it('gets submission by ID', async () => {
      const mockSubmission = { id: 1, status: 'pending' };
      mockClient.get.mockResolvedValue(mockSubmission);

      const client = new KiketIntakeFormsClient(mockClient, 42);
      const result = await client.getSubmission('feedback', 1);

      expect(mockClient.get).toHaveBeenCalledWith(
        '/api/v1/ext/intake_forms/feedback/submissions/1',
        { params: { project_id: '42' } }
      );
      expect(result).toEqual(mockSubmission);
    });
  });

  describe('createSubmission', () => {
    it('creates submission with data', async () => {
      const mockSubmission = { id: 1, status: 'pending' };
      mockClient.post.mockResolvedValue(mockSubmission);

      const client = new KiketIntakeFormsClient(mockClient, 42);
      await client.createSubmission('feedback', { email: 'test@example.com' });

      expect(mockClient.post).toHaveBeenCalledWith(
        '/api/v1/ext/intake_forms/feedback/submissions',
        {
          project_id: 42,
          data: { email: 'test@example.com' },
        }
      );
    });

    it('includes metadata when provided', async () => {
      mockClient.post.mockResolvedValue({ id: 1 });

      const client = new KiketIntakeFormsClient(mockClient, 42);
      await client.createSubmission(
        'feedback',
        { email: 'test@example.com' },
        { metadata: { source: 'api' } }
      );

      expect(mockClient.post).toHaveBeenCalledWith(
        '/api/v1/ext/intake_forms/feedback/submissions',
        {
          project_id: 42,
          data: { email: 'test@example.com' },
          metadata: { source: 'api' },
        }
      );
    });
  });

  describe('approveSubmission', () => {
    it('approves submission', async () => {
      const mockSubmission = { id: 1, status: 'approved' };
      mockClient.post.mockResolvedValue(mockSubmission);

      const client = new KiketIntakeFormsClient(mockClient, 42);
      const result = await client.approveSubmission('feedback', 1, 'Looks good!');

      expect(mockClient.post).toHaveBeenCalledWith(
        '/api/v1/ext/intake_forms/feedback/submissions/1/approve',
        {
          project_id: 42,
          notes: 'Looks good!',
        }
      );
      expect(result.status).toBe('approved');
    });
  });

  describe('rejectSubmission', () => {
    it('rejects submission', async () => {
      const mockSubmission = { id: 1, status: 'rejected' };
      mockClient.post.mockResolvedValue(mockSubmission);

      const client = new KiketIntakeFormsClient(mockClient, 42);
      const result = await client.rejectSubmission('feedback', 1, 'Invalid data');

      expect(mockClient.post).toHaveBeenCalledWith(
        '/api/v1/ext/intake_forms/feedback/submissions/1/reject',
        {
          project_id: 42,
          notes: 'Invalid data',
        }
      );
      expect(result.status).toBe('rejected');
    });
  });

  describe('stats', () => {
    it('gets form statistics', async () => {
      const mockStats = {
        totalSubmissions: 100,
        pending: 10,
        approved: 80,
        rejected: 5,
        converted: 5,
      };
      mockClient.get.mockResolvedValue(mockStats);

      const client = new KiketIntakeFormsClient(mockClient, 42);
      const result = await client.stats('feedback', 'month');

      expect(mockClient.get).toHaveBeenCalledWith(
        '/api/v1/ext/intake_forms/feedback/stats',
        {
          params: {
            project_id: '42',
            period: 'month',
          },
        }
      );
      expect(result.totalSubmissions).toBe(100);
    });
  });
});
