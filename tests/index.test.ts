import { StaackCore } from 'staack';
import { expect, test } from 'vitest';
import { Erreur, ErreurType } from '../src/mod';

test('Gist', () => {
  // Create a new type
  const HttpErrorType = ErreurType.define<number>('StatusCode');

  // Create a new Erreur
  const err = Erreur.create('Something went wrong');

  // Add data to the Erreur
  const errWithStatusCode = HttpErrorType.append(err, 500);

  // Get data from the Erreur
  const statusCode = errWithStatusCode.get(HttpErrorType.Consumer);

  expect(statusCode).toBe(500);
});

test('Get message', () => {
  const err = Erreur.create();
  expect(err.message).toBe('[Erreur]');
  expect(err.toString()).toBe('Error: [Erreur]');
});

test('Add data to Erreur', () => {
  const ErrType = ErreurType.define<number>('Key');
  const err = ErrType.create(42);
  expect(err).toBeInstanceOf(Erreur);
  expect(err.get(ErrType.Consumer)).toBe(42);

  expect(err.has(ErrType.Consumer)).toBe(true);
});

test('HttpError with transforms', () => {
  const HttpErrorType = ErreurType.define<{ status: number }>('HttpError', (err, provider, value) => {
    return err.with(provider).withMessage(`[HttpError] ${value.status}`);
  });

  const NotFoundErrorType = ErreurType.defineEmpty('NotFound', (err, provider) => {
    return HttpErrorType.append(err.with(provider), { status: 404 });
  });

  const err = NotFoundErrorType.create();
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

  expect(Erreur.fromUnknown(err)).toBe(err);

  const strErr = Erreur.fromUnknown('Some text');
  expect(strErr).toBeInstanceOf(Erreur);
  expect(strErr.message).toBe('Some text');

  const anyErr = Erreur.fromUnknown(42);
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

  const HttpErrorType = ErreurType.defineWithTransform(
    'HttpError',
    (code: number = 500, message?: string): IHttpError => {
      const name = HTTP_NAMES[code] || 'Unknown';
      return { name, code, message: message || name };
    },
    (err, provider, data) => {
      return err.with(provider).withMessage(`[HttpError] ${data.code} ${data.name}`);
    }
  );

  const err = HttpErrorType.create(400);
  expect(err.message).toBe('[HttpError] 400 Bad Request');
  expect(err.get(HttpErrorType.Consumer)).toEqual({ name: 'Bad Request', code: 400, message: 'Bad Request' });

  const ForbiddenErrorType = ErreurType.defineEmpty('Forbidden', (err, provider) => {
    return HttpErrorType.append(err, 403).with(provider);
  });

  const err2 = ForbiddenErrorType.create();
  expect(err2.message).toBe('[HttpError] 403 Forbidden');
  expect(err2.has(ForbiddenErrorType.Consumer)).toBe(true);
  expect(err2.get(HttpErrorType.Consumer)).toEqual({ name: 'Forbidden', code: 403, message: 'Forbidden' });

  expect(StaackCore.debug(err2.context)).toMatchObject([
    {
      ctxName: 'Forbidden',
      value: undefined,
    },
    {
      ctxName: 'Message',
      value: '[HttpError] 403 Forbidden',
    },
    {
      ctxName: 'HttpError',
      value: { code: 403, message: 'Forbidden', name: 'Forbidden' },
    },
    {
      ctxName: 'StackTrace',
    },
  ]);
});

test('new Erreur has no stack', () => {
  const err = new Erreur(null);
  expect(err.stack).toBeUndefined();
});

test('Erreur withTransform and data', () => {
  const ErreurDef = ErreurType.defineWithTransform(
    'Erreur',
    (arg1: string, arg2: number) => ({ arg1, arg2 }),
    (err, provider, data) => {
      return err.with(provider).withMessage(`Arg1: ${data.arg1}, Arg2: ${data.arg2}`);
    }
  );

  const err = ErreurDef.create('root', 42);

  expect(err.message).toBe('Arg1: root, Arg2: 42');
});
