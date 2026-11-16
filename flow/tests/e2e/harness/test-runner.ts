/**
 * Universal Test Runner Adapter
 * Provides seamless compatibility with both Vitest and Node.js native test runner (node:test).
 */
import * as nodeTest from 'node:test';
import * as assert from 'node:assert/strict';

export const describe = (name: string, fn: () => void | Promise<void>) => {
  return (nodeTest.describe || nodeTest.suite)(name, fn);
};

export const it = (name: string, fn: (t?: any) => void | Promise<void>) => {
  return (nodeTest.it || nodeTest.test)(name, fn);
};

export const test = it;

export const beforeEach = (fn: () => void | Promise<void>) => {
  return nodeTest.beforeEach(fn);
};

export const afterEach = (fn: () => void | Promise<void>) => {
  return nodeTest.afterEach(fn);
};

export const beforeAll = (fn: () => void | Promise<void>) => {
  return (nodeTest.before || (nodeTest as any).beforeAll)(fn);
};

export const afterAll = (fn: () => void | Promise<void>) => {
  return (nodeTest.after || (nodeTest as any).afterAll)(fn);
};

export interface Matchers<T> {
  toBe(expected: any): void;
  toEqual(expected: any): void;
  toBeDefined(): void;
  toBeUndefined(): void;
  toBeNull(): void;
  toBeTruthy(): void;
  toBeFalsy(): void;
  toBeGreaterThan(expected: number): void;
  toBeGreaterThanOrEqual(expected: number): void;
  toBeLessThan(expected: number): void;
  toBeLessThanOrEqual(expected: number): void;
  toContain(item: any): void;
  toMatch(pattern: RegExp | string): void;
  toThrow(expectedError?: string | RegExp | Error): void;
  not: Matchers<T>;
  rejects: {
    toThrow(expectedError?: string | RegExp | Error): Promise<void>;
  };
}

export function expect<T = any>(actual: T): Matchers<T> {
  const createMatchers = (isNot: boolean): Matchers<T> => ({
    toBe(expected: any) {
      if (isNot) {
        assert.notStrictEqual(actual, expected, `Expected value not to be strict equal to ${expected}`);
      } else {
        assert.strictEqual(actual, expected, `Expected ${actual} to be ${expected}`);
      }
    },
    toEqual(expected: any) {
      if (isNot) {
        assert.notDeepStrictEqual(actual, expected, `Expected values not to deeply equal`);
      } else {
        assert.deepStrictEqual(actual, expected, `Expected values to deeply equal`);
      }
    },
    toBeDefined() {
      if (isNot) {
        assert.strictEqual(actual, undefined, `Expected value to be undefined`);
      } else {
        assert.notStrictEqual(actual, undefined, `Expected value to be defined`);
      }
    },
    toBeUndefined() {
      if (isNot) {
        assert.notStrictEqual(actual, undefined, `Expected value not to be undefined`);
      } else {
        assert.strictEqual(actual, undefined, `Expected value to be undefined`);
      }
    },
    toBeNull() {
      if (isNot) {
        assert.notStrictEqual(actual, null, `Expected value not to be null`);
      } else {
        assert.strictEqual(actual, null, `Expected value to be null`);
      }
    },
    toBeTruthy() {
      if (isNot) {
        assert.ok(!actual, `Expected value to be falsy`);
      } else {
        assert.ok(actual, `Expected value to be truthy`);
      }
    },
    toBeFalsy() {
      if (isNot) {
        assert.ok(actual, `Expected value to be truthy`);
      } else {
        assert.ok(!actual, `Expected value to be falsy`);
      }
    },
    toBeGreaterThan(expected: number) {
      if (isNot) {
        assert.ok((actual as any) <= expected, `Expected ${(actual as any)} not to be > ${expected}`);
      } else {
        assert.ok((actual as any) > expected, `Expected ${(actual as any)} to be > ${expected}`);
      }
    },
    toBeGreaterThanOrEqual(expected: number) {
      if (isNot) {
        assert.ok((actual as any) < expected, `Expected ${(actual as any)} not to be >= ${expected}`);
      } else {
        assert.ok((actual as any) >= expected, `Expected ${(actual as any)} to be >= ${expected}`);
      }
    },
    toBeLessThan(expected: number) {
      if (isNot) {
        assert.ok((actual as any) >= expected, `Expected ${(actual as any)} not to be < ${expected}`);
      } else {
        assert.ok((actual as any) < expected, `Expected ${(actual as any)} to be < ${expected}`);
      }
    },
    toBeLessThanOrEqual(expected: number) {
      if (isNot) {
        assert.ok((actual as any) > expected, `Expected ${(actual as any)} not to be <= ${expected}`);
      } else {
        assert.ok((actual as any) <= expected, `Expected ${(actual as any)} to be <= ${expected}`);
      }
    },
    toContain(item: any) {
      if (typeof actual === 'string') {
        const contains = actual.includes(String(item));
        if (isNot) {
          assert.ok(!contains, `Expected string not to contain "${item}"`);
        } else {
          assert.ok(contains, `Expected string to contain "${item}"`);
        }
      } else if (Array.isArray(actual)) {
        const contains = (actual as any[]).includes(item);
        if (isNot) {
          assert.ok(!contains, `Expected array not to contain item`);
        } else {
          assert.ok(contains, `Expected array to contain item`);
        }
      } else if (actual instanceof Set) {
        const contains = actual.has(item);
        if (isNot) {
          assert.ok(!contains, `Expected Set not to contain item`);
        } else {
          assert.ok(contains, `Expected Set to contain item`);
        }
      } else {
        throw new Error(`toContain unsupported on type ${typeof actual}`);
      }
    },
    toMatch(pattern: RegExp | string) {
      const reg = typeof pattern === 'string' ? new RegExp(pattern) : pattern;
      const matches = reg.test(String(actual));
      if (isNot) {
        assert.ok(!matches, `Expected "${actual}" not to match regex ${reg}`);
      } else {
        assert.ok(matches, `Expected "${actual}" to match regex ${reg}`);
      }
    },
    toThrow(expectedError?: string | RegExp | Error) {
      if (typeof actual !== 'function') {
        throw new Error(`expect(fn).toThrow requires actual to be a function`);
      }
      let threw = false;
      let err: any;
      try {
        (actual as any)();
      } catch (e) {
        threw = true;
        err = e;
      }

      if (isNot) {
        assert.ok(!threw, `Expected function not to throw, but it threw: ${err}`);
      } else {
        assert.ok(threw, `Expected function to throw`);
        if (expectedError) {
          if (typeof expectedError === 'string') {
            assert.ok(
              String(err).includes(expectedError),
              `Expected error message to include "${expectedError}", got "${err}"`
            );
          } else if (expectedError instanceof RegExp) {
            assert.ok(
              expectedError.test(String(err)),
              `Expected error message to match regex ${expectedError}, got "${err}"`
            );
          }
        }
      }
    },
    get not() {
      return createMatchers(!isNot);
    },
    get rejects() {
      return {
        async toThrow(expectedError?: string | RegExp | Error) {
          if (!actual || typeof (actual as any).then !== 'function') {
            throw new Error(`expect(promise).rejects requires a promise`);
          }
          let threw = false;
          let err: any;
          try {
            await (actual as any);
          } catch (e) {
            threw = true;
            err = e;
          }

          if (isNot) {
            assert.ok(!threw, `Expected promise not to reject, but it rejected: ${err}`);
          } else {
            assert.ok(threw, `Expected promise to reject`);
            if (expectedError) {
              if (typeof expectedError === 'string') {
                assert.ok(
                  String(err).includes(expectedError),
                  `Expected rejected error to include "${expectedError}", got "${err}"`
                );
              } else if (expectedError instanceof RegExp) {
                assert.ok(
                  expectedError.test(String(err)),
                  `Expected rejected error to match regex ${expectedError}, got "${err}"`
                );
              }
            }
          }
        },
      };
    },
  });

  return createMatchers(false);
}
