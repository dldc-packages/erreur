import type { Erreur } from './Erreur';

export function fixStack(target: Error, fn: Function = target.constructor) {
  const captureStackTrace: Function = (Error as any).captureStackTrace;
  captureStackTrace && captureStackTrace(target, fn);
}

export function isErreur(e: unknown): e is Erreur {
  return e instanceof Error;
}

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
