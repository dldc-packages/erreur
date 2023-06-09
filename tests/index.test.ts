import { describe, expect, test, vi } from 'vitest';
import { DataFromTypes, Erreur, ErreurType, matchExec, matchObj, wrap } from '../src/mod';

test('Basic erreur', () => {
  const MyErreur = ErreurType.create<{ num: number }>('MyErreur');
  const err = MyErreur.instantiate({ num: 42 });
  expect(err.message).toBe('[Erreur]: MyErreur {"num":42}');
});

test('Create withTransform', () => {
  const MyErreur = ErreurType.create<{ num: number }>('MyErreur').withTransform((num: number) => ({ num }));
  const err = MyErreur.instantiate(42);
  expect(err.message).toBe('[Erreur]: MyErreur {"num":42}');
});

test('createFromTypes', () => {
  interface IErreurs {
    MyErreur: { num: number };
    MyOtherErreur: { str: string };
  }

  type IErreur = DataFromTypes<IErreurs>;
  const err: IErreur = { kind: 'MyErreur', data: { num: 42 } };
  expect(err).toBeDefined();

  const Erreurs = ErreurType.createManyFromData<IErreurs>()({
    MyErreur: (num: number) => ({ num }),
    MyOtherErreur: (str: string) => ({ str }),
  });

  const err1 = Erreurs.MyErreur.instantiate(42);
  const err2 = Erreurs.MyOtherErreur.instantiate('hello');

  expect(err1).toBeInstanceOf(Erreur);
  expect(err2).toBeInstanceOf(Erreur);
});

test('Erreur.createMany', () => {
  const Erreurs = ErreurType.createMany({
    MyErreur: (num: number) => ({ num }),
    MyOtherErreur: (str: string) => ({ str }),
  });

  Erreurs.MyErreur.instantiate(42);
});

test('Create Erreur.createWithTransform', () => {
  const MyErreur = ErreurType.createWithTransform('MyErreur', (num: number) => ({
    num,
  }));

  const err = MyErreur.instantiate(42);

  expect(err.message).toBe('[Erreur]: MyErreur {"num":42}');
});

test('Basic usage', () => {
  const StuffGoneWrongErreur = ErreurType.create<{ count: number }>('StuffGoneWrong');

  const err = StuffGoneWrongErreur.instantiate({ count: 42 });

  expect(err).toBeInstanceOf(Erreur);
  expect(StuffGoneWrongErreur.is(err)).toBe(true);
});

describe('Wrap', () => {
  const InvalidNumberErreur = ErreurType.create<{ num: number }>('InvalidNumber');
  const Unknown = ErreurType.create<{ error: unknown }>('Unknown');

  test('Return result when no error', () => {
    const result = wrap(
      () => 42,
      (error) => Unknown.instantiate({ error })
    );

    expect(result).toBe(42);
  });

  test('throw error when error is MyError', () => {
    const run = () =>
      wrap(
        () => {
          throw InvalidNumberErreur.instantiate({ num: -4 });
        },
        (error) => Unknown.instantiate({ error })
      );

    expect(run).toThrowError();
  });
});

describe('Cause', () => {
  test('Cause is undefined by default', () => {
    const MyErreur = ErreurType.create<{ num: number }>('MyErreur');
    const err = MyErreur.instantiate({ num: 42 });
    expect(err.cause).toBeUndefined();
  });

  test('createWithCause', () => {
    const MyErreur = ErreurType.create<{ num: number }>('MyErreur');
    const cause = MyErreur.instantiate({ num: 0 });
    const err = MyErreur.instantiateWithCause(cause, { num: 42 });
    expect(err.cause).toBe(cause);
    expect(err.erreurCause).toBe(cause);
  });
});

describe('Match', () => {
  test('matchObj', () => {
    const Erreurs = ErreurType.createMany({
      ErrA: (num: number) => ({ num }),
      ErrB: (str: string) => ({ str }),
      ErrC: (bool: boolean) => ({ bool }),
    });

    const err = Erreurs.ErrA.instantiate(42);

    const res = matchObj(err, Erreurs);

    expect(res?.kind).toBe('ErrA');
  });

  test('macthExec', () => {
    const Erreurs = ErreurType.createMany({
      ErrA: (num: number) => ({ num }),
      ErrB: (str: string) => ({ str }),
      ErrC: (bool: boolean) => ({ bool }),
    });

    const err = Erreurs.ErrA.instantiate(42);

    const res = matchExec(err, Erreurs.ErrA, (err) => err.num);

    expect(res).toBe(42);
  });
});

describe('Message', () => {
  test('default message is name and data as JSON', () => {
    const MyErreur = ErreurType.create<{ num: number }>('MyErreur');
    const err = MyErreur.instantiate({ num: 42 });
    expect(err.message).toBe('[Erreur]: MyErreur {"num":42}');
  });

  test('message can be overriden', () => {
    const MyErreur = ErreurType.create<{ num: number }>('MyErreur', `MyErreur custom message`);
    const err = MyErreur.instantiate({ num: 42 });
    expect(err.message).toBe('[Erreur]: MyErreur custom message');
  });

  test('message can be overriden with a function to use data and type', () => {
    const MyErreur = ErreurType.create<{ num: number }>('MyErreur', (data, name) => {
      return `${name} -> ${data.num}`;
    });
    const err = MyErreur.instantiate({ num: 42 });
    expect(err.message).toBe('[Erreur]: MyErreur -> 42');
  });

  test('Override message using withMessage', () => {
    const MyErreur = ErreurType.create<{ num: number }>('MyErreur');
    const MyErreurWithMessage = MyErreur.withMessage(`MyErreur custom message`);
    const err1 = MyErreur.instantiate({ num: 42 });
    const err2 = MyErreurWithMessage.instantiate({ num: 42 });

    expect(err1.message).toBe('[Erreur]: MyErreur {"num":42}');
    expect(err2.message).toBe('[Erreur]: MyErreur custom message');

    expect(MyErreur.is(err1)).toBe(true);
    expect(MyErreurWithMessage.is(err1)).toBe(true);
    expect(MyErreur.is(err2)).toBe(true);
    expect(MyErreurWithMessage.is(err2)).toBe(true);
  });
});

describe('ErreurType methods', () => {
  test('ErreurType.is', () => {
    const MyErreur = ErreurType.create<{ num: number }>('MyErreur');
    const err = MyErreur.instantiate({ num: 42 });
    expect(MyErreur.is(err)).toBe(true);
  });

  test('ErreurType.match', () => {
    const MyErreur = ErreurType.create<{ num: number }>('MyErreur');
    const err = MyErreur.instantiate({ num: 42 });
    expect(MyErreur.match(err)).toEqual({ num: 42 });
  });

  test('ErreurType.matchExec', () => {
    const fn = vi.fn();
    const MyErreur = ErreurType.create<{ num: number }>('MyErreur');
    const err = MyErreur.instantiate({ num: 42 });
    matchExec(err, MyErreur, fn);
    expect(fn).toBeCalledWith({ num: 42 });
  });
});

describe('Extends', () => {
  test('Manually extends instance', () => {
    const ErrA = ErreurType.create<{ num: number }>('ErrA');
    const ErrB = ErreurType.create<{ str: string }>('ErrB');

    const err = ErrA.instantiate({ num: 42 });
    const err2 = err.extends(ErrB.prepare({ str: 'hey' }));

    expect(err2.is(ErrA)).toBe(true);
    expect(err2.is(ErrB)).toBe(true);

    expect(err2.match(ErrA)).toEqual({ num: 42 });
    expect(err2.match(ErrB)).toEqual({ str: 'hey' });
  });
});
