const ERREUR_DATA = Symbol("ERREUR_DATA");

/**
 * Readonly version of ErreurStore
 */
export interface TReadonlyErreurStore<Data> {
  [ERREUR_DATA]: Data;
  has(error: unknown): boolean;
  get(error: unknown): Data | undefined;
}

/**
 * ErreurStore created by createErreurStore
 */
export interface TErreurStore<Data> extends TReadonlyErreurStore<Data> {
  /**
   * Readonly version of this store
   */
  asReadonly: TReadonlyErreurStore<Data>;

  /**
   * Mark an error with some data
   * @param error the error to mark
   * @param data the data to associate with the error
   */
  set(error: Error, data: Data): void;

  /**
   * Mark an error with some data and throw it
   * @param error the error to mark, if this is not an instance of Error, it will be converted to an Error
   * @param data
   */
  setAndThrow(error: unknown, data: Data): never;

  /**
   * Mark an error with some data and return it
   * @param error the error to mark, if this is not an instance of Error, it will be converted to an Error
   * @param data
   */
  setAndReturn(error: unknown, data: Data): Error;
}

/**
 * ErreurStore created by createVoidErreurStore
 */
export interface TVoidErreurStore extends TReadonlyErreurStore<true> {
  /**
   * Readonly version of this store
   */
  asReadonly: TReadonlyErreurStore<true>;

  /**
   * Mark an error
   * @param error
   */
  set(error: Error): void;

  /**
   * Mark an error and throw it
   * @param error
   */
  setAndThrow(error: unknown): never;

  /**
   * Mark an error and return it
   * @param error
   */
  setAndReturn(error: unknown): Error;
}

export type TErreurStoreBase = TErreurStore<unknown> | TVoidErreurStore;
export type TReadableErreurStoreBase = TReadonlyErreurStore<unknown>;
export type TReadableErreurStoreRecord = Record<
  string,
  TReadableErreurStoreBase
>;

/**
 * Create a new ErreurStore, this function expects a generic type to be passed, this type will be the type of the data associated with the error
 * @returns a new ErreurStore
 */
export function createErreurStore<Data>(): TErreurStore<Data> {
  return createErreurStoreInternal<Data>(undefined);
}

/**
 * Create a new VoidErreurStore, this store does not have any data associated with the error
 * @returns
 */
export function createVoidErreurStore(): TVoidErreurStore {
  return createErreurStoreInternal<true>(true) as TVoidErreurStore;
}

function createErreurStoreInternal<Data>(
  // deno-lint-ignore no-explicit-any
  defaultValue: any,
): TErreurStore<Data> {
  const storage = new WeakMap<Error, Data>();

  return {
    [ERREUR_DATA]: true as Data,
    set,
    setAndThrow,
    setAndReturn,
    has,
    get,
    asReadonly: {
      [ERREUR_DATA]: true as Data,
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
      throw new Error("Error should be an instance of Error");
    }
    if (storage.has(error)) {
      throw new Error("Error already exists in store");
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

/**
 * Match the first error in the list stores and return the associated data
 * @param error
 * @param stores
 * @returns
 */
export function matchFirstErreur<
  Stores extends readonly TReadableErreurStoreBase[],
>(
  error: unknown,
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

export type TMatchResult<StoresRec extends TReadableErreurStoreRecord> = {
  [K in keyof StoresRec]: StoresRec[K][typeof ERREUR_DATA] | undefined;
};

/**
 * Return an object with the data associated with the error for each store (if any)
 * @param error
 * @param stores
 * @returns
 */
export function matchErreurs<StoresRec extends TReadableErreurStoreRecord>(
  error: Error,
  stores: StoresRec,
): { [K in keyof StoresRec]: StoresRec[K][typeof ERREUR_DATA] | undefined } {
  const result: TMatchResult<StoresRec> = {} as TMatchResult<StoresRec>;
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

/**
 * Convert any value to an Error
 * @param value
 * @returns
 */
export function toError(value: unknown): Error {
  if (value instanceof Error) {
    return value;
  }
  if (typeof value === "string") {
    return new Error(value);
  }
  if (value === null) {
    return new Error("ErrorFromNull");
  }
  if (value === undefined) {
    return new Error("ErrorFromUndefined");
  }
  if (typeof value === "object" && value !== null) {
    // object
    const message = `ErrorFromObject: ${objectToMessage(value)}`;
    const cause = "cause" in value && value.cause instanceof Error
      ? value.cause
      : undefined;
    return new Error(message, { cause });
  }
  const typeCapitalized = (typeof value).charAt(0).toUpperCase() +
    (typeof value).slice(1);
  const message = `ErrorFrom${typeCapitalized}: ${String(value)}`;
  return new Error(message);
}

function objectToMessage(obj: object): string {
  if ("message" in obj && typeof obj.message === "string") {
    return obj.message;
  }
  try {
    return JSON.stringify(obj);
  } catch (_error) {
    return `[object]`;
  }
}
