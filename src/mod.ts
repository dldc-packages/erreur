const INTERNAL = Symbol('INTERNAL');

export type OnError = (error: unknown) => Erreur;

/**
 * Make sure the function either returns a value or throws an Erreur
 */
export function wrap<Res>(fn: () => Res, onError: OnError): Res {
  try {
    return fn();
  } catch (e) {
    if (Erreur.is(e)) {
      throw e;
    }
    throw onError(e);
  }
}

export async function wrapAsync<Res>(fn: () => Promise<Res>, onError: OnError): Promise<Res> {
  try {
    return await fn();
  } catch (error) {
    if (Erreur.is(error)) {
      throw error;
    }
    throw onError(error);
  }
}

/**
 * Same as wrap but returns the error instead of throwing it
 */
export function resolve<Res>(fn: () => Res, onError: OnError): Res | Erreur {
  try {
    return wrap(fn, onError);
  } catch (error) {
    return error as any;
  }
}

export async function resolveAsync<Res>(
  fn: () => Promise<Res>,
  onError: OnError
): Promise<Res | Erreur> {
  try {
    return await wrapAsync(fn, onError);
  } catch (error) {
    return error as any;
  }
}

export interface ErreurType<Data> {
  readonly [INTERNAL]: Data;
  readonly name: string;
  readonly create: (data: Data) => Erreur;
  readonly is: (error: unknown) => error is Erreur;
  readonly match: (error: unknown) => Data | null;
}

interface ErreurInternal<Data> {
  readonly type: ErreurType<Data>;
  readonly data: Data;
}

export class Erreur extends Error {
  private [INTERNAL]: ErreurInternal<any>;

  static readonly wrap = wrap;
  static readonly wrapAsync = wrapAsync;
  static readonly resolve = resolve;
  static readonly resolveAsync = resolveAsync;

  static create<Data>(name: string): ErreurType<Data> {
    const type: ErreurType<Data> = {
      [INTERNAL]: {} as any,
      name,
      create: (data: Data) => new Erreur({ type, data }),
      is: (error: unknown): error is Erreur => {
        if (error instanceof Erreur) {
          return error[INTERNAL].type === type;
        }
        return false;
      },
      match: (error: unknown): Data | null => {
        if (error instanceof Erreur) {
          if (error[INTERNAL].type === type) {
            return error[INTERNAL].data;
          }
        }
        return null;
      },
    };
    return type;
  }

  static is(error: unknown, type?: ErreurType<any>): error is Error {
    if (error instanceof Erreur) {
      if (type) {
        return error[INTERNAL].type === type;
      }
      return true;
    }
    return false;
  }

  static isOneOf(error: unknown, types: ErreurType<any>[]): error is Erreur {
    if (error instanceof Erreur) {
      return types.some((type) => error[INTERNAL].type === type);
    }
    return false;
  }

  private constructor(internal: ErreurInternal<any>) {
    super(`[Erreur]: ${internal.type.name} ${JSON.stringify(internal.data)}`);
    this[INTERNAL] = internal;
    // restore prototype chain
    Object.setPrototypeOf(this, new.target.prototype);
  }

  is(type: ErreurType<any>): boolean {
    return this[INTERNAL].type === type;
  }

  isOneOf(types: ErreurType<any>[]): boolean {
    return types.some((type) => this[INTERNAL].type === type);
  }
}
