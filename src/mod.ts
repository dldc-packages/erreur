const INTERNAL = Symbol('INTERNAL');

export type OnError = (error: unknown) => Erreur;

export interface ErreurType<Data, Params extends readonly any[] = [Data]> {
  readonly [INTERNAL]: symbol;
  readonly name: string;

  readonly withTransform: <Params extends readonly any[]>(
    transform: (...params: Params) => Data
  ) => ErreurType<Data, Params>;

  readonly create: (...params: Params) => Erreur;
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
  static readonly is = is;
  static readonly isOneOf = isOneOf;
  static readonly match = match;
  static readonly matchObj = matchObj;
  static readonly matchObjOrThrow = matchObjOrThrow;
  static readonly createFromTypes = createFromTypes;

  static create<Data>(name: string): ErreurType<Data> {
    const symbol = Symbol(`[Erreur]: ${name}`);

    return createWithTransform((data: Data) => data);

    function createWithTransform(transform: (...params: any[]) => Data) {
      const type: ErreurType<Data> = {
        [INTERNAL]: symbol,
        name,
        create: (...params: any[]) => new Erreur({ type, data: transform(...params) }),
        is: (error: unknown): error is Erreur => is(error, type),
        match: (error: unknown) => match(error, type),
        withTransform: (subTransform) => createWithTransform(subTransform as any) as any,
      };
      return type;
    }
  }

  static createWithTransform<Data, Params extends readonly any[]>(
    name: string,
    transform: (...params: Params) => Data
  ): ErreurType<Data, Params> {
    return Erreur.create<Data>(name).withTransform(transform);
  }

  private constructor(internal: ErreurInternal<any>) {
    super(`[Erreur]: ${internal.type.name} ${JSON.stringify(internal.data)}`);
    this[INTERNAL] = internal;
    // restore prototype chain
    Object.setPrototypeOf(this, new.target.prototype);
  }

  is(type: ErreurType<any>): boolean {
    return is(this, type);
  }

  isOneOf(types: ErreurType<any>[]): boolean {
    return isOneOf(this, types);
  }
}

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

function is(error: unknown, type?: ErreurType<any>): error is Error {
  if (error instanceof Erreur) {
    if (type) {
      return error[INTERNAL].type === type;
    }
    return true;
  }
  return false;
}

function isOneOf(error: unknown, types: ErreurType<any>[]): error is Erreur {
  if (error instanceof Erreur) {
    return types.some((type) => error[INTERNAL].type === type);
  }
  return false;
}

function match<Data>(error: unknown, type: ErreurType<Data>): Data | null {
  if (error instanceof Erreur) {
    if (error[INTERNAL].type === type) {
      return error[INTERNAL].data;
    }
  }
  return null;
}

export type TypesBase = Record<string, ErreurType<any>>;

export type DataFromTypes<Types extends TypesBase> = {
  [K in keyof Types]: { kind: K; data: Types[K][typeof INTERNAL] };
}[keyof Types];

function matchObj<Types extends TypesBase>(
  error: unknown,
  types: Types
): DataFromTypes<Types> | null {
  if (!(error instanceof Erreur)) {
    return null;
  }
  const keys = Object.keys(types);
  for (const key of keys) {
    const type = types[key];
    if (error[INTERNAL].type === type) {
      return { kind: key, data: error[INTERNAL].data };
    }
  }
  return null;
}

function matchObjOrThrow<Types extends TypesBase>(
  error: unknown,
  types: Types
): DataFromTypes<Types> {
  const res = matchObj(error, types);
  if (res) {
    return res;
  }
  throw error;
}

export type ErreursFromTypes<Errors extends Record<string, any>> = {
  [K in keyof Errors]: ErreurType<Errors[K]>;
};

function createFromTypes<Errors extends Record<string, any>>(
  obj: ErreursFromTypes<Errors>
): ErreursFromTypes<Errors> {
  return obj;
}
