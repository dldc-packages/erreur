import { expect, test } from 'vitest';
import { Erreur, createErreurType } from '../src/mod';

test('Get message', () => {
  const err = Erreur.create();
  expect(err.message).toBe('[Erreur]');
  expect(err.toString()).toBe('Error: [Erreur]');
});

test('Add data to Erreur', () => {
  const ErrType = createErreurType<number>({ name: 'Key' });
  const err = ErrType.create(42);
  expect(err).toBeInstanceOf(Erreur);
  expect(err.get(ErrType.Consumer)).toBe(42);

  expect(err.has(ErrType.Consumer)).toBe(true);
});

test('Gist', () => {
  // Create a new key
  const StatusCodeKey = createErreurType<number>({ name: 'StatusCode' });

  // Create a new Erreur
  const err = Erreur.create('Something went wrong');

  // Add data to the Erreur
  const errWithStatusCode = StatusCodeKey.extends(err, 500);

  // Get data from the Erreur
  const statusCode = errWithStatusCode.get(StatusCodeKey.Consumer);

  expect(statusCode).toBe(500);
});

test('Erreur.stack', () => {
  const error = Erreur.create();
  const lines = error.stack!.split('\n');
  expect(lines[0]).toEqual('Error: [Erreur]');
  expect(lines[1]).toMatch('erreur/tests/index.test.ts');
});

test('Erreur.stack with more steps', () => {
  function step1() {
    return step2();
  }

  function step2() {
    return step3();
  }

  function step3() {
    return Erreur.create();
  }

  const err = step1();

  const lines = err.stack!.split('\n');
  expect(lines[0]).toEqual('Error: [Erreur]');
  expect(lines[1]).toMatch('at step3');
  expect(lines[2]).toMatch('at step2');
  expect(lines[3]).toMatch('at step1');
});

test('Create with message', () => {
  const err = Erreur.create('Something went wrong');
  expect(err.message).toBe('Something went wrong');
});

test('With message', () => {
  const err = Erreur.create().withMessage('Something went wrong');
  expect(err.message).toBe('Something went wrong');

  const err2 = Erreur.create('Something went wrong').withMessage('Something went wrong 2');
  expect(err2.message).toBe('Something went wrong 2');
});

test('Erreur.wrap', () => {
  const fn = () =>
    Erreur.wrap(() => {
      throw new Error('Something went wrong');
    });

  expect(fn).toThrow('Something went wrong');
  expect(fn).toThrow(Erreur);
});

test('Erreur.resolve', () => {
  const err = Erreur.resolve(() => {
    throw new Error('Something went wrong');
  });

  expect(err).toBeInstanceOf(Erreur);
  expect(err.message).toBe('Something went wrong');
});
