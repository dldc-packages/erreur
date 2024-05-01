const ERREUR_DATA = Symbol('ERREUR_DATA');

export interface TReadonlyErreurStore<Data> {
  [ERREUR_DATA]: Data;
  has(error: any): boolean;
  get(error: any): Data | undefined;
}

export interface TErreurStore<Data> extends TReadonlyErreurStore<Data> {
  asReadonly: TReadonlyErreurStore<Data>;
  set(error: Error, data: Data): void;
  setAndThrow(error: unknown, data: Data): never;
  setAndReturn(error: unknown, data: Data): Error;
}

export interface TVoidErreurStore extends TReadonlyErreurStore<true> {
  asReadonly: TReadonlyErreurStore<true>;
  set(error: Error): void;
  setAndThrow(error: unknown): never;
  setAndReturn(error: unknown): Error;
}

export type TErreurStoreBase = TErreurStore<any> | TVoidErreurStore;
export type TReadableErreurStoreBase = TReadonlyErreurStore<any>;
export type TReadableErreurStoreRecord = Record<string, TReadableErreurStoreBase>;

export function createErreurStore<Data>(): TErreurStore<Data> {
  return createErreurStoreInternal<Data>(undefined);
}

export function createVoidErreurStore(): TVoidErreurStore {
  return createErreurStoreInternal<true>(true) as TVoidErreurStore;
}

function createErreurStoreInternal<Data>(defaultValue: any): TErreurStore<Data> {
  const storage = new WeakMap<Error, Data>();

  return {
    [ERREUR_DATA]: true as any,
    set,
    setAndThrow,
    setAndReturn,
    has,
    get,
    asReadonly: {
      [ERREUR_DATA]: true as any,
      has,
      get,
    },
  };

  function has(error: Error) {
    return storage.has(error);
  }
  function get(error: Error) {
    return storage.get(error);
  }

  function set(error: Error, data: Data = defaultValue) {
    if (!(error instanceof Error)) {
      throw new Error('Error should be an instance of Error');
    }
    if (storage.has(error)) {
      throw new Error('Error already exists in store');
    }
    storage.set(error, data);
  }

  function setAndThrow(error: unknown, data: Data = defaultValue): never {
    const err = toError(error);
    set(err, data);
    throw err;
  }

  function setAndReturn(error: unknown, data: Data = defaultValue): Error {
    const err = toError(error);
    set(err, data);
    return err;
  }
}

export function matchFirstErreur<Stores extends readonly TReadableErreurStoreBase[]>(
  error: any,
  stores: Stores,
): Stores[number][typeof ERREUR_DATA] | undefined {
  if (!(error instanceof Error)) {
    return undefined;
  }
  for (const store of stores) {
    if (store.has(error)) {
      return store.get(error) as Stores[number][typeof ERREUR_DATA];
    }
  }
  return undefined;
}

export function matchErreurs<StoresRec extends TReadableErreurStoreRecord>(
  error: Error,
  stores: StoresRec,
): { [K in keyof StoresRec]: StoresRec[K][typeof ERREUR_DATA] | undefined } {
  const result: any = {};
  if (!(error instanceof Error)) {
    for (const key in stores) {
      result[key] = undefined;
    }
    return result;
  }
  for (const key in stores) {
    result[key] = stores[key].get(error);
  }
  return result;
}

export function toError(value: unknown): Error {
  if (value instanceof Error) {
    return value;
  }
  if (typeof value === 'string') {
    return new Error(value);
  }
  if (value === null) {
    return new Error('ErrorFromNull');
  }
  if (value === undefined) {
    return new Error('ErrorFromUndefined');
  }
  if (typeof value === 'object' && value !== null) {
    // object
    const message = `ErrorFromObject: ${objectToMessage(value)}`;
    const cause = 'cause' in value && value.cause instanceof Error ? value.cause : undefined;
    return new Error(message, { cause });
  }
  const typeCapitalized = (typeof value).charAt(0).toUpperCase() + (typeof value).slice(1);
  const message = `ErrorFrom${typeCapitalized}: ${String(value)}`;
  return new Error(message);
}

function objectToMessage(obj: object): string {
  if ('message' in obj && typeof obj.message === 'string') {
    return obj.message;
  }
  try {
    return JSON.stringify(obj);
  } catch (error) {
    return `[object]`;
  }
}
