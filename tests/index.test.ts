import { describe, expect, test } from 'vitest';
import { createErreurStore, createVoidErreurStore, matchErreurs, matchFirstErreur, toError } from '../src/mod';

test('Gist', () => {
  const store1 = createErreurStore<number>();
  const store2 = createErreurStore<string>();
  const store3 = createVoidErreurStore();

  const err = new Error('test');
  store1.set(err, 1);

  const data = matchFirstErreur(err, [store2, store1]);
  expect(data).toBe(1);

  const matched = matchErreurs(err, { store1, store2, store3 });
  expect(matched).toEqual({ store1: 1, store2: undefined, store3: undefined });
});

describe('toError', () => {
  test('return error as is', () => {
    const error = new Error('Error message');
    const err = toError(error);
    expect(err).toBe(error);
  });

  test('create error from text', () => {
    const error = 'Error message';
    const err = toError(error);
    expect(err).toBeInstanceOf(Error);
    expect(err.message).toBe(error);
  });

  test('create error from object with message property', () => {
    const error = { message: 'Error message' };
    const err = toError(error);
    expect(err).toBeInstanceOf(Error);
    expect(err.message).toBe(`ErrorFromObject: Error message`);
  });

  test('create error from object with message and cause property', () => {
    const error = { message: 'Error message', cause: new Error('Cause') };
    const err = toError(error);
    expect(err).toBeInstanceOf(Error);
    expect(err.message).toBe(`ErrorFromObject: Error message`);
    expect(err.cause).toBe(error.cause);
  });

  test('Error from number', () => {
    const error = 42;
    const err = toError(error);
    expect(err).toBeInstanceOf(Error);
    expect(err.message).toBe(`ErrorFromNumber: 42`);
  });

  test('Error from boolean', () => {
    const error = true;
    const err = toError(error);
    expect(err).toBeInstanceOf(Error);
    expect(err.message).toBe(`ErrorFromBoolean: true`);
  });

  test('Error from null', () => {
    const error = null;
    const err = toError(error);
    expect(err).toBeInstanceOf(Error);
    expect(err.message).toBe(`ErrorFromNull`);
  });

  test('Error from undefined', () => {
    const error = undefined;
    const err = toError(error);
    expect(err).toBeInstanceOf(Error);
    expect(err.message).toBe(`ErrorFromUndefined`);
  });

  test('Error from object', () => {
    const error = { a: 1, b: 'test' };
    const err = toError(error);
    expect(err).toBeInstanceOf(Error);
    expect(err.message).toBe(`ErrorFromObject: {"a":1,"b":"test"}`);
  });

  test('Error from unserializable object', () => {
    const error = {
      toJSON: () => {
        throw new Error('test');
      },
    };
    const err = toError(error);
    expect(err).toBeInstanceOf(Error);
    expect(err.message).toBe(`ErrorFromObject: [object]`);
  });
});

describe('set', () => {
  test('should set the error', () => {
    const store = createErreurStore<number>();
    const err = new Error('test');
    store.set(err, 42);
    expect(store.has(err)).toBe(true);
    expect(store.get(err)).toBe(42);
  });

  test('throw if error already exists', () => {
    const store = createErreurStore<number>();
    const err = new Error('test');
    store.set(err, 42);
    expect(() => store.set(err, 42)).toThrowError('Error already exists in store');
  });

  test('throw if error is not an instance of Error', () => {
    const store = createErreurStore<number>();
    expect(() => store.set('test' as any, 42)).toThrowError('Error should be an instance of Error');
  });
});

describe('setAndThrow', () => {
  const store = createErreurStore<number>();

  test('should set the error and throw it', () => {
    let err: Error;
    expect(() => {
      try {
        store.setAndThrow('test', 42);
      } catch (e) {
        err = e as any;
        throw e;
      }
    }).toThrowError('test');
    expect(store.has(err!)).toBe(true);
    expect(store.get(err!)).toBe(42);
  });
});

describe('matchErreur', () => {
  test('basic matchErreur', () => {
    const store1 = createErreurStore<number>();
    const store2 = createErreurStore<string>();
    const store3 = createVoidErreurStore();

    const err = new Error('test');
    store1.set(err, 1);

    const matched = matchErreurs(err, { store1, store2, store3 });
    expect(matched).toEqual({ store1: 1, store2: undefined, store3: undefined });
  });
});
