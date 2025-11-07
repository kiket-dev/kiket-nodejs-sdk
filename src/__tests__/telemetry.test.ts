/**
 * Tests for telemetry reporter.
 */
import { TelemetryReporter } from '../telemetry';
import axios from 'axios';

jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('TelemetryReporter', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    delete process.env.KIKET_SDK_TELEMETRY_OPTOUT;
  });

  describe('record', () => {
    it('should not record when disabled', async () => {
      const reporter = new TelemetryReporter(false, undefined, undefined, 'ext-id', '1.0.0');

      await reporter.record('test.event', 'v1', 'ok', 100);

      expect(mockedAxios.create).not.toHaveBeenCalled();
    });

    it('should not record when opted out', async () => {
      process.env.KIKET_SDK_TELEMETRY_OPTOUT = '1';

      const reporter = new TelemetryReporter(true, undefined, undefined, 'ext-id', '1.0.0');

      await reporter.record('test.event', 'v1', 'ok', 100);

      expect(mockedAxios.create).not.toHaveBeenCalled();
    });

    it('should call feedback hook when provided', async () => {
      const feedbackHook = jest.fn();
      const reporter = new TelemetryReporter(
        true,
        undefined,
        feedbackHook,
        'ext-id',
        '1.0.0'
      );

      await reporter.record('test.event', 'v1', 'ok', 100);

      expect(feedbackHook).toHaveBeenCalledWith(
        expect.objectContaining({
          event: 'test.event',
          version: 'v1',
          status: 'ok',
          durationMs: 100,
          extensionId: 'ext-id',
          extensionVersion: '1.0.0',
        })
      );
    });

    it('should send to telemetry URL when provided', async () => {
      const mockAxiosInstance = {
        post: jest.fn().mockResolvedValue({}),
      };
      mockedAxios.create.mockReturnValue(mockAxiosInstance as any);

      const reporter = new TelemetryReporter(
        true,
        'https://telemetry.test.com',
        undefined,
        'ext-id',
        '1.0.0'
      );

      await reporter.record('test.event', 'v1', 'ok', 100);

      expect(mockAxiosInstance.post).toHaveBeenCalledWith(
        '/telemetry',
        expect.objectContaining({
          event: 'test.event',
          version: 'v1',
          status: 'ok',
          durationMs: 100,
        })
      );
    });

    it('should include error message when status is error', async () => {
      const feedbackHook = jest.fn();
      const reporter = new TelemetryReporter(
        true,
        undefined,
        feedbackHook,
        'ext-id',
        '1.0.0'
      );

      await reporter.record('test.event', 'v1', 'error', 100, 'Handler failed');

      expect(feedbackHook).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'error',
          message: 'Handler failed',
        })
      );
    });

    it('should handle feedback hook errors gracefully', async () => {
      const feedbackHook = jest.fn().mockRejectedValue(new Error('Hook failed'));
      const reporter = new TelemetryReporter(
        true,
        undefined,
        feedbackHook,
        'ext-id',
        '1.0.0'
      );

      // Should not throw
      await expect(reporter.record('test.event', 'v1', 'ok', 100)).resolves.toBeUndefined();
    });

    it('should handle telemetry URL errors gracefully', async () => {
      const mockAxiosInstance = {
        post: jest.fn().mockRejectedValue(new Error('Network error')),
      };
      mockedAxios.create.mockReturnValue(mockAxiosInstance as any);

      const reporter = new TelemetryReporter(
        true,
        'https://telemetry.test.com',
        undefined,
        'ext-id',
        '1.0.0'
      );

      // Should not throw
      await expect(reporter.record('test.event', 'v1', 'ok', 100)).resolves.toBeUndefined();
    });
  });
});
