import { DATA, INTERNAL, PARENT } from './constants';
import { Erreur } from './Erreur';
import { ErreurType, ErreurTypeAny } from './ErreurType';

export type OnError = (error: unknown) => Erreur;

/**
 * Ensure the function will either return a value or throw an Erreur instance
 */
export function wrap<Res>(fn: () => Res, onError: OnError): Res {
  try {
    return fn();
  } catch (e) {
    if (isErreur(e)) {
      throw e;
    }
    throw onError(e);
  }
}

/**
 * Same as wrap but for async functions
 */
export async function wrapAsync<Res>(fn: () => Promise<Res>, onError: OnError): Promise<Res> {
  try {
    return await fn();
  } catch (error) {
    if (isErreur(error)) {
      throw error;
    }
    throw onError(error);
  }
}

/**
 * Same as wrap but will return an Erreur instance instead of throwing it
 */
export function resolve<Res>(fn: () => Res, onError: OnError): Res | Erreur {
  try {
    return wrap(fn, onError);
  } catch (error) {
    return error as any;
  }
}

/**
 * Same as resolve but for async functions
 */
export async function resolveAsync<Res>(fn: () => Promise<Res>, onError: OnError): Promise<Res | Erreur> {
  try {
    return await wrapAsync(fn, onError);
  } catch (error) {
    return error as any;
  }
}

/**
 * Check is error is an Erreur instance
 * If a type is provided, it will also check if the error contains the provided type
 */
export function isErreur(error: unknown, type?: ErreurTypeAny): error is Erreur {
  if (error instanceof Erreur) {
    if (type) {
      for (const [t] of getEntries(error)) {
        if (isSameType(type, t)) {
          return true;
        }
      }
      return false;
    }
    return true;
  }
  return false;
}

export function isOneOf(error: unknown, types: ErreurTypeAny[]): error is Erreur {
  if (error instanceof Erreur) {
    for (const [type] of getEntries(error)) {
      if (types.find((t) => isSameType(t, type))) {
        return true;
      }
    }
    return false;
  }
  return false;
}

export type ObjTypessBase = Record<string, ErreurTypeAny>;

export function isOneOfObj(error: unknown, types: ObjTypessBase): error is Erreur {
  if (error instanceof Erreur) {
    return isOneOf(error, Object.values(types));
  }
  return false;
}

/**
 * If the error contains the given type, return the data associated with it
 */
export function match<Data>(error: Erreur, type: ErreurType<Data, any>): Data | undefined {
  for (const [t, data] of getEntries(error)) {
    if (type === t) {
      return data;
    }
  }
  return undefined;
}

/**
 * Same as match but will execute the given function if the error contains the given type
 */
export function matchExec<Data, Result>(
  error: Erreur,
  type: ErreurType<Data, any>,
  exec: (data: Data) => Result
): Result | undefined {
  for (const [t, data] of getEntries(error)) {
    if (type === t) {
      return exec(data);
    }
  }
  return undefined;
}

export type ObjTypesBase = Record<string, any>;

export type DataFromTypes<Types extends ObjTypesBase> = {
  [K in keyof Types]: { kind: K; data: Types[K] };
}[keyof Types];

export function matchObj<Types extends ObjTypessBase>(
  error: unknown,
  types: Types
): DataFromTypes<{ [K in keyof Types]: Types[K][typeof DATA] }> | undefined {
  if (!isErreur(error)) {
    return undefined;
  }
  const matches = Object.entries(types);
  for (const [t, data] of getEntries(error)) {
    const match = matches.find(([, type]) => isSameType(type, t));
    if (match) {
      return { kind: match[0], data };
    }
  }
  return undefined;
}

export type ErreurTypeTuple<Data> = [type: ErreurType<Data>, data: Data];

/**
 * Get all the types and data from top to bottom (child first, parent last)
 */
export function getEntries(erreur: Erreur): IterableIterator<ErreurTypeTuple<any>> {
  let current: Erreur | null = erreur;
  return {
    next(): IteratorResult<ErreurTypeTuple<any>> {
      if (current) {
        const res: ErreurTypeTuple<any> = [current[INTERNAL].type, current[INTERNAL].data];
        current = current[PARENT];
        return { value: res, done: false };
      }
      return { value: undefined, done: true };
    },
    [Symbol.iterator]() {
      return this;
    },
  };
}

function isSameType(left: ErreurTypeAny, right: ErreurTypeAny): boolean {
  return left[INTERNAL] === right[INTERNAL];
}
