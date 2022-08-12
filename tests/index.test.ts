import { Erreur, ErreursMap } from '../src/mod';

test('Create Erreur', () => {
  type MyErreurInfos = {
    kind: 'MyErreur';
    message: string;
    num: number;
  };

  const err = new Erreur<MyErreurInfos>({
    kind: 'MyErreur',
    message: 'Something went wrong',
    num: 42,
  });

  expect(err.kind).toBe('MyErreur');
  expect(err.infos).toEqual({
    kind: 'MyErreur',
    message: 'Something went wrong',
    num: 42,
  });
});

test('Basic usage', () => {
  type ISomeErreur =
    | { kind: 'Unknown'; message: string; error: unknown }
    | { kind: 'StuffGoneWrong'; message: string; count: number };

  const SomeErreur = ErreursMap.fromType<ISomeErreur>({
    Unknown: (error: unknown) => ({ message: `Unknow error`, error }),
    StuffGoneWrong: (count: number) => ({ message: `Stuff went wrong ${count} times`, count }),
  });

  SomeErreur.infered;

  expect(Object.keys(SomeErreur.create)).toEqual(['UnknownError', 'Unknown', 'StuffGoneWrong']);

  const err = SomeErreur.create.StuffGoneWrong(3);

  expect(err).toBeInstanceOf(Erreur);

  expect(err.kind).toBe('StuffGoneWrong');

  expect(err.infos).toEqual({
    kind: 'StuffGoneWrong',
    message: 'Stuff went wrong 3 times',
    count: 3,
  });

  expect(err.message).toBe('[Erreur] Stuff went wrong 3 times');

  expect(SomeErreur.is(err)).toBe(true);

  expect(Erreur.is(err)).toBe(true);
});

describe('Wrap', () => {
  const MyError = new ErreursMap({
    ...ErreursMap.Base.errors,
    InvalidNumber: (number: number) => ({ message: `Invalid number`, number }),
  });

  const mapOtherError = (err: unknown) =>
    err instanceof Error ? MyError.create.UnknownError(err) : MyError.create.Unknown(err);

  test('Return result when no error', () => {
    const result = MyError.wrap(() => 42, mapOtherError);

    expect(result).toBe(42);
  });

  test('Return error when error is MyError', () => {
    const result = MyError.wrap(() => {
      throw MyError.create.InvalidNumber(-4);
    }, mapOtherError);

    expect(result).toBeInstanceOf(Erreur);
    expect(result.kind).toBe('InvalidNumber');
  });

  test('Return mapOtherErr result when error is not MyError', () => {
    const result = MyError.wrap(() => {
      throw new Error('oops');
    }, mapOtherError);

    expect(result).toBeInstanceOf(Erreur);
    expect(result.kind).toBe('UnknownError');

    const result2 = MyError.wrap(() => {
      throw 'Yolo';
    }, mapOtherError);

    expect(result2).toBeInstanceOf(Erreur);
    expect(result2.kind).toBe('Unknown');
  });
});

describe('WrapAsync', () => {
  const MyError = new ErreursMap({
    ...ErreursMap.Base.errors,
    InvalidNumber: (number: number) => ({ message: `Invalid number`, number }),
  });

  const mapOtherError = (err: unknown) =>
    err instanceof Error ? MyError.create.UnknownError(err) : MyError.create.Unknown(err);

  test('Return result when no error', async () => {
    const result = await MyError.wrapAsync(() => Promise.resolve(42), mapOtherError);

    expect(result).toBe(42);
  });

  test('Return error when error is MyError', async () => {
    const result = await MyError.wrapAsync(async () => {
      throw MyError.create.InvalidNumber(-4);
    }, mapOtherError);

    expect(result).toBeInstanceOf(Erreur);
    expect(result.kind).toBe('InvalidNumber');
  });

  test('Return mapOtherErr result when error is not MyError', async () => {
    const result = await MyError.wrapAsync(async () => {
      throw new Error('oops');
    }, mapOtherError);

    expect(result).toBeInstanceOf(Erreur);
    expect(result.kind).toBe('UnknownError');

    const result2 = await MyError.wrapAsync(async () => {
      throw 'Yolo';
    }, mapOtherError);

    expect(result2).toBeInstanceOf(Erreur);
    expect(result2.kind).toBe('Unknown');
  });
});
