import { StackCore } from '@dldc/stack';
import { ERREUR_CONTEXT, Erreur } from './Erreur';

export function fixStack(target: Error, fn: Function = target.constructor): string {
  const captureStackTrace = Error.captureStackTrace;
  captureStackTrace && captureStackTrace(target, fn);
  // remove first line (name of the error)
  const stackLines = target.stack!.split('\n');
  return stackLines.slice(1).join('\n');
}

export function isErreur(e: unknown): e is Erreur {
  return e instanceof Erreur;
}

export type TOnError = (error: unknown) => Erreur;

export const DEFAULT_ON_ERROR: TOnError = (error) => Erreur.createFromUnknown(error);

export function wrap<Res>(fn: () => Res, onError: TOnError = DEFAULT_ON_ERROR): Res {
  try {
    return fn();
  } catch (e) {
    if (isErreur(e)) {
      throw e;
    }
    throw onError(e);
  }
}

export async function wrapAsync<Res>(fn: () => Promise<Res>, onError: TOnError = DEFAULT_ON_ERROR): Promise<Res> {
  try {
    return await fn();
  } catch (error) {
    if (isErreur(error)) {
      throw error;
    }
    throw onError(error);
  }
}

export function resolve<Res>(fn: () => Res, onError: TOnError = DEFAULT_ON_ERROR): Res | Erreur {
  try {
    return wrap(fn, onError);
  } catch (error) {
    return error as any;
  }
}

export async function resolveAsync<Res>(
  fn: () => Promise<Res>,
  onError: TOnError = DEFAULT_ON_ERROR,
): Promise<Res | Erreur> {
  try {
    return await wrapAsync(fn, onError);
  } catch (error) {
    return error as any;
  }
}

export function debug(erreur: Erreur) {
  return StackCore.debug(erreur[ERREUR_CONTEXT]);
}
