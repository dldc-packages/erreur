import { expect, test } from 'vitest';
import { ERREUR_CONTEXT } from '../src/Erreur';
import { Erreur, Key, StackCore } from '../src/mod';

test('Gist', () => {
  // Define a key with the type of the data (`number` in this case) and a function to "instantiate" the Erreur
  const StatusCodeKey = Key.create<number>('StatusCode');

  function createStatusCodeError(status: number) {
    return Erreur.create().with(StatusCodeKey.Provider(status));
  }

  // Create a new Erreur with the number value
  const err = createStatusCodeError(500);
  // you can also extends en existing error to add the value
  const errBase = Erreur.create();
  const err1 = errBase.with(StatusCodeKey.Provider(500));

  // err, errBase and err1 are all Erreur instances
  expect(err).toBeInstanceOf(Erreur);
  expect(errBase).toBeInstanceOf(Erreur);
  expect(err1).toBeInstanceOf(Erreur);

  // Get data from the Erreur
  const statusCode = err.get(StatusCodeKey.Consumer);
  expect(statusCode).toBe(500); // statusCode is typed as number
});

test('Get message', () => {
  const err = Erreur.create();
  expect(err.message).toBe('[Erreur]');
});

test('Add data to Erreur', () => {
  const Err = Key.create<number>('Key');
  const err = Erreur.create().with(Err.Provider(42));
  expect(err).toBeInstanceOf(Erreur);
  expect(err.get(Err.Consumer)).toBe(42);

  expect(err.has(Err.Consumer)).toBe(true);
});

test('HttpError with message', () => {
  const HttpErrorKey = Key.create<{ status: number }>('HttpError');

  function createHttpError(status: number) {
    return Erreur.createWith(HttpErrorKey, { status }).withMessage(`[HttpError] ${status}`);
  }

  const NotFoundError = Key.createEmpty('NotFound');

  function createNotFoundError() {
    return createHttpError(404).with(NotFoundError.Provider());
  }

  const err = createNotFoundError();
  expect(err.message).toBe('[HttpError] 404');
  expect(err.get(HttpErrorKey.Consumer)).toEqual({ status: 404 });
});

test('Erreur.stack', () => {
  const error = Erreur.create();
  const lines = error.stack!.split('\n');
  expect(lines[0]).toMatch('erreur/tests/index.test.ts');
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
  expect(lines[0]).toMatch('at step3');
  expect(lines[1]).toMatch('at step2');
  expect(lines[2]).toMatch('at step1');
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

  const err2 = Erreur.resolve(() => {
    throw err;
  });

  expect(err2).toBeInstanceOf(Erreur);
  expect(err2).toBe(err);
});

test('Erreur.from', () => {
  const err = Erreur.create();

  expect(Erreur.createFromUnknown(err)).toBe(err);

  const strErr = Erreur.createFromUnknown('Some text');
  expect(strErr).toBeInstanceOf(Erreur);
  expect(strErr.message).toBe('Some text');

  const anyErr = Erreur.createFromUnknown(42);
  expect(anyErr).toBeInstanceOf(Erreur);
  expect(anyErr.message).toBe('42');
});

test('HttpError', () => {
  interface IHttpError {
    name: string;
    code: number;
    message: string;
  }

  const HTTP_NAMES: Record<string, string> = {
    400: 'Bad Request',
    401: 'Unauthorized',
    403: 'Forbidden',
  };

  const HttpErrorKey = Key.create<IHttpError>('HttpError');

  function createHttpError(code: number, message?: string) {
    const name = HTTP_NAMES[code] || 'Unknown';
    return Erreur.create()
      .with(HttpErrorKey.Provider({ name, code, message: message || name }))
      .withName('HttpError')
      .withMessage(`${code} ${name}`);
  }

  const err = createHttpError(400);
  expect(err.message).toBe('400 Bad Request');
  expect(err.name).toBe('HttpError');
  expect(err.get(HttpErrorKey.Consumer)).toEqual({ name: 'Bad Request', code: 400, message: 'Bad Request' });

  const ForbiddenErrorKey = Key.createEmpty('Forbidden');

  function createForbiddenError() {
    return createHttpError(403).with(ForbiddenErrorKey.Provider());
  }

  const err2 = createForbiddenError();
  expect(err2.message).toBe('403 Forbidden');
  expect(err.name).toBe('HttpError');
  expect(err2.has(ForbiddenErrorKey.Consumer)).toBe(true);
  expect(err2.get(HttpErrorKey.Consumer)).toEqual({ name: 'Forbidden', code: 403, message: 'Forbidden' });

  expect(StackCore.debug(err2[ERREUR_CONTEXT])).toMatchObject([
    { ctxName: 'Forbidden', value: undefined },
    { ctxName: 'Message', value: '403 Forbidden' },
    { ctxName: 'Name', value: 'HttpError' },
    { ctxName: 'HttpError', value: { code: 403, message: 'Forbidden', name: 'Forbidden' } },
    { ctxName: 'StackTrace' },
  ]);
  expect(Erreur.debug(err2)).toMatchObject([
    { ctxName: 'Forbidden', value: undefined },
    { ctxName: 'Message', value: '403 Forbidden' },
    { ctxName: 'Name', value: 'HttpError' },
    { ctxName: 'HttpError', value: { code: 403, message: 'Forbidden', name: 'Forbidden' } },
    { ctxName: 'StackTrace' },
  ]);
});

test('new Erreur has no stack', () => {
  const err = new Erreur(null);
  expect(err.stack).toBeUndefined();
});

test('Erreur.toString', () => {
  const Err1Key = Key.create<{ arg1: string }>('Err1');
  function createErr1(arg1: string) {
    return Erreur.create().with(Err1Key.Provider({ arg1 }));
  }

  const Err2Key = Key.create<{ arg2: string }>('Err2');

  function createErr2(arg2: string) {
    return createErr1('okok').with(Err2Key.Provider({ arg2 }));
  }

  const err = createErr2('root');
  expect(err.name).toBe('Erreur');
  expect(err.toString().split('\n')[0]).toBe('Erreur: [Erreur]');
});

test('Erreur.withName', () => {
  const Err1Key = Key.create<{ arg1: string }>('Err1');
  function createErr1(arg1: string) {
    return Erreur.create().with(Err1Key.Provider({ arg1 })).withName('Err1').withMessage(`Oops`);
  }

  const err = createErr1('root');
  expect(err.name).toBe('Err1');
  expect(err.toString().split('\n')[0]).toBe('Err1: Oops');
});

test('JSON.stringify Erreur', () => {
  const Err1Key = Key.create<{ arg1: string }>('Err1');
  function createErr1(arg1: string) {
    return Erreur.create().with(Err1Key.Provider({ arg1 })).withName('Err1').withMessage(`Oops`);
  }

  const err = createErr1('root');

  expect(JSON.stringify(err)).toBe('{"name":"Err1","message":"Oops"}');
});

test('Custom json', () => {
  const Err1Key = Key.create<{ arg1: string }>('Err1');
  function createErr1(arg1: string) {
    return Erreur.create()
      .with(Err1Key.Provider({ arg1 }))
      .withName('Err1')
      .withMessage(`Oops`)
      .withJson({ type: 'Err1', arg1 });
  }

  const err = createErr1('root');

  expect(err.toJSON()).toEqual({ type: 'Err1', arg1: 'root' });
  expect(JSON.stringify(err)).toBe('{"type":"Err1","arg1":"root"}');
});
