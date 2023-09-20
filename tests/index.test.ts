import { expect, test } from 'vitest';
import { Erreur, Key, StackCore } from '../src/mod';

test('Gist', () => {
  // Create a key with the type of the data (`number` in this case)
  const StatusCodeKey = Key.create<number>('StatusCode');

  // Create a new Erreur with the number value
  const err = Erreur.createWith(StatusCodeKey, 500);
  // you can also extends en existing error to add the value
  const errBase = Erreur.create();
  const err1 = errBase.with(StatusCodeKey.Provider(500));

  // err, errBase and err1 are all Erreur instances
  expect(err).toBeInstanceOf(Erreur);
  expect(errBase).toBeInstanceOf(Erreur);
  expect(err1).toBeInstanceOf(Erreur);

  // Get data from the Erreur
  const statusCode = err.get(StatusCodeKey.Consumer);
  expect(statusCode).toBe(500);
});

test('Get message', () => {
  const err = Erreur.create();
  expect(err.message).toBe('[Erreur]');
  expect(err.toString()).toBe('Erreur: [Erreur]');
});

test('Add data to Erreur', () => {
  const ErrType = Key.create<number>('Key');
  const err = Erreur.create().with(ErrType.Provider(42));
  expect(err).toBeInstanceOf(Erreur);
  expect(err.get(ErrType.Consumer)).toBe(42);

  expect(err.has(ErrType.Consumer)).toBe(true);
});

test('HttpError with transforms', () => {
  const HttpErrorType = Key.create<{ status: number }>('HttpError');
  const createHttpError = (status: number) =>
    Erreur.create().with(HttpErrorType.Provider({ status })).withMessage(`[HttpError] ${status}`);

  const NotFoundErrorType = Key.createEmpty('NotFound');
  const createNotFoundError = () => createHttpError(404).with(NotFoundErrorType.Provider());

  const err = createNotFoundError();
  expect(err.message).toBe('[HttpError] 404');
  expect(err.get(HttpErrorType.Consumer)).toEqual({ status: 404 });
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

  const HttpErrorType = Key.create<IHttpError>('HttpError');
  const createHttpError = (code: number = 500, message?: string) => {
    const name = HTTP_NAMES[code] || 'Unknown';
    return Erreur.create()
      .with(HttpErrorType.Provider({ name, code, message: message || name }))
      .withName('HttpError')
      .withMessage(`${code} ${name}`);
  };

  const err = createHttpError(400);
  expect(err.message).toBe('400 Bad Request');
  expect(err.name).toBe('HttpError');
  expect(err.get(HttpErrorType.Consumer)).toEqual({ name: 'Bad Request', code: 400, message: 'Bad Request' });

  const ForbiddenErrorType = Key.createEmpty('Forbidden');
  const createForbiddenError = () => createHttpError(403).with(ForbiddenErrorType.Provider());

  const err2 = createForbiddenError();
  expect(err2.message).toBe('403 Forbidden');
  expect(err.name).toBe('HttpError');
  expect(err2.has(ForbiddenErrorType.Consumer)).toBe(true);
  expect(err2.get(HttpErrorType.Consumer)).toEqual({ name: 'Forbidden', code: 403, message: 'Forbidden' });

  expect(StackCore.debug(err2.context)).toMatchObject([
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
  const Err1 = Key.create<{ arg1: string }>('Err1');
  const createErr1 = (arg1: string) => Erreur.create().with(Err1.Provider({ arg1 }));
  const Err2 = Key.create<{ arg2: string }>('Err2');
  const createErr2 = (arg2: string) => createErr1('okok').with(Err2.Provider({ arg2 }));

  const err = createErr2('root');
  expect(err.name).toBe('Erreur');
  expect(err.toString()).toBe('Erreur: [Erreur]');
});

test('Erreur.withName', () => {
  const Err1 = Key.create<{ arg1: string }>('Err1');
  const createErr1 = (arg1: string) =>
    Erreur.create().with(Err1.Provider({ arg1 })).withName('Err1').withMessage(`Oops`);

  const err = createErr1('root');
  expect(err.name).toBe('Err1');
  expect(err.toString()).toBe('Err1: Oops');
});

test('JSON.stringify Erreur', () => {
  const Err1 = Key.create<{ arg1: string }>('Err1');
  const createErr1 = (arg1: string) =>
    Erreur.create().with(Err1.Provider({ arg1 })).withName('Err1').withMessage(`Oops`);

  const err = createErr1('root');

  expect(JSON.stringify(err)).toBe('{"name":"Err1","message":"Oops"}');
});

test('Custom json', () => {
  const Err1 = Key.create<{ arg1: string }>('Err1');
  const createErr1 = (arg1: string) => {
    return Erreur.create()
      .with(Err1.Provider({ arg1 }))
      .withName('Err1')
      .withMessage(`Oops`)
      .withJson({ type: 'Err1', arg1 });
  };

  const err = createErr1('root');

  expect(err.toJSON()).toEqual({ type: 'Err1', arg1: 'root' });
  expect(JSON.stringify(err)).toBe('{"type":"Err1","arg1":"root"}');
});
