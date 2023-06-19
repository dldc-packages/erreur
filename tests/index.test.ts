import { expect, test } from 'vitest';
import { Erreur, createKey } from '../src/mod';

test('Get message', () => {
  const err = Erreur.create();
  expect(err.message).toBe('[Erreur]');
  expect(err.toString()).toBe('Error: [Erreur]');
});

test('Add data to Erreur', () => {
  const Key = createKey<number>({ name: 'Key' });
  const err = Erreur.create().with(Key.Provider(42));
  expect(err).toBeInstanceOf(Erreur);
  expect(err.get(Key.Consumer)).toBe(42);
});

test('Gist', () => {
  // Create a new key
  const StatusCodeKey = createKey<number>({ name: 'StatusCode' });

  // Create a new Erreur
  const err = Erreur.create('Something went wrong');

  // Add data to the Erreur
  const errWithStatusCode = err.with(StatusCodeKey.Provider(500));

  // Get data from the Erreur
  const statusCode = errWithStatusCode.get(StatusCodeKey.Consumer);

  expect(statusCode).toBe(500);
});

test('HttpError with dynamic message', () => {
  const StatusCodeKey = createKey<number>({ name: 'StatusCode', defaultValue: 500 });

  const HttpErreur = Erreur.create().withGetMessage((err) => {
    return `Something went wrong: ${err.get(StatusCodeKey.Consumer)}`;
  });

  const NotFoundErreur = HttpErreur.with(StatusCodeKey.Provider(404));

  expect(NotFoundErreur.message).toBe('Something went wrong: 404');
  expect(HttpErreur.message).toBe('Something went wrong: 500');

  expect(`${NotFoundErreur}`).toEqual('Error: Something went wrong: 404');
});

test('Erreur.stack', () => {
  const error = Erreur.create();
  const lines = error.stack!.split('\n');
  expect(lines[0]).toEqual('Error: [Erreur]');
  expect(lines[1]).toMatch('erreur/tests/index.test.ts');
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
