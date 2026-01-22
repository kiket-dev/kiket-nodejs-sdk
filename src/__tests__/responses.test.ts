import { allow, deny, pending } from '../responses';

describe('Response Helpers', () => {
  describe('allow', () => {
    it('returns a properly formatted allow response', () => {
      const response = allow();
      expect(response.status).toBe('allow');
      expect(response.metadata).toEqual({});
      expect(response.message).toBeUndefined();
    });

    it('includes message when provided', () => {
      const response = allow({ message: 'Success' });
      expect(response.message).toBe('Success');
    });

    it('includes data in metadata', () => {
      const response = allow({
        data: { routeId: 123, email: 'test@example.com' },
      });
      expect(response.metadata.routeId).toBe(123);
      expect(response.metadata.email).toBe('test@example.com');
    });

    it('includes outputFields in metadata', () => {
      const response = allow({
        outputFields: { inbound_email: 'abc@parse.example.com' },
      });
      expect(response.metadata.output_fields).toEqual({
        inbound_email: 'abc@parse.example.com',
      });
    });

    it('combines data and outputFields in metadata', () => {
      const response = allow({
        message: 'Configured successfully',
        data: { routeId: 456 },
        outputFields: { webhook_url: 'https://example.com/hook' },
      });
      expect(response.status).toBe('allow');
      expect(response.message).toBe('Configured successfully');
      expect(response.metadata.routeId).toBe(456);
      expect(response.metadata.output_fields).toEqual({
        webhook_url: 'https://example.com/hook',
      });
    });
  });

  describe('deny', () => {
    it('returns a properly formatted deny response', () => {
      const response = deny('Access denied');
      expect(response.status).toBe('deny');
      expect(response.message).toBe('Access denied');
      expect(response.metadata).toEqual({});
    });

    it('includes data in metadata', () => {
      const response = deny('Invalid credentials', {
        data: { errorCode: 'AUTH_FAILED' },
      });
      expect(response.metadata).toEqual({ errorCode: 'AUTH_FAILED' });
    });
  });

  describe('pending', () => {
    it('returns a properly formatted pending response', () => {
      const response = pending('Awaiting approval');
      expect(response.status).toBe('pending');
      expect(response.message).toBe('Awaiting approval');
      expect(response.metadata).toEqual({});
    });

    it('includes data in metadata', () => {
      const response = pending('Processing', {
        data: { jobId: 'abc123' },
      });
      expect(response.metadata).toEqual({ jobId: 'abc123' });
    });
  });
});
