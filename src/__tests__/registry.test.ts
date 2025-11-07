/**
 * Tests for handler registry.
 */
import { KiketHandlerRegistry } from '../registry';

describe('KiketHandlerRegistry', () => {
  let registry: KiketHandlerRegistry;

  beforeEach(() => {
    registry = new KiketHandlerRegistry();
  });

  describe('register', () => {
    it('should register a handler', () => {
      const handler = jest.fn();
      registry.register('test.event', handler, 'v1');

      const metadata = registry.get('test.event', 'v1');
      expect(metadata).toBeDefined();
      expect(metadata?.event).toBe('test.event');
      expect(metadata?.version).toBe('v1');
      expect(metadata?.handler).toBe(handler);
    });

    it('should allow multiple versions of same event', () => {
      const handlerV1 = jest.fn();
      const handlerV2 = jest.fn();

      registry.register('test.event', handlerV1, 'v1');
      registry.register('test.event', handlerV2, 'v2');

      expect(registry.get('test.event', 'v1')?.handler).toBe(handlerV1);
      expect(registry.get('test.event', 'v2')?.handler).toBe(handlerV2);
    });

    it('should overwrite handler for same event and version', () => {
      const handler1 = jest.fn();
      const handler2 = jest.fn();

      registry.register('test.event', handler1, 'v1');
      registry.register('test.event', handler2, 'v1');

      expect(registry.get('test.event', 'v1')?.handler).toBe(handler2);
    });
  });

  describe('get', () => {
    it('should return null for unregistered handler', () => {
      expect(registry.get('unknown.event', 'v1')).toBeNull();
    });

    it('should return handler metadata', () => {
      const handler = jest.fn();
      registry.register('test.event', handler, 'v1');

      const metadata = registry.get('test.event', 'v1');
      expect(metadata?.event).toBe('test.event');
      expect(metadata?.version).toBe('v1');
      expect(metadata?.handler).toBe(handler);
    });
  });

  describe('eventNames', () => {
    it('should return empty array when no handlers', () => {
      expect(registry.eventNames()).toEqual([]);
    });

    it('should return unique event names', () => {
      registry.register('event1', jest.fn(), 'v1');
      registry.register('event1', jest.fn(), 'v2');
      registry.register('event2', jest.fn(), 'v1');

      const names = registry.eventNames();
      expect(names).toHaveLength(2);
      expect(names).toContain('event1');
      expect(names).toContain('event2');
    });
  });

  describe('all', () => {
    it('should return all handlers', () => {
      registry.register('event1', jest.fn(), 'v1');
      registry.register('event2', jest.fn(), 'v1');

      const all = registry.all();
      expect(all).toHaveLength(2);
    });

    it('should return empty array when no handlers', () => {
      expect(registry.all()).toEqual([]);
    });
  });
});
