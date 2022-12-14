const INTERNAL = Symbol('INTERNAL');
const DATA = Symbol('DATA');

export type OnError = (error: unknown) => Erreur;

export type ErreurMap = Record<string, ErreurTypeAny>;

export type ErreurTypeAny = ErreurType<any, any>;

export type ErreurWithKind<Erreurs extends ErreurMap> = {
  [K in keyof Erreurs]: { kind: K; data: Erreurs[K] };
}[keyof Erreurs];

export interface ErreurType<Data, Params extends readonly any[] = [Data]> {
  readonly [DATA]: Data;
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
  static readonly isOneOfObj = isOneOfObj;
  static readonly match = match;
  static readonly matchObj = matchObj;
  static readonly matchObjOrThrow = matchObjOrThrow;

  static readonly createFromTypes = createFromTypes;
  static readonly createWithTransform = createWithTransform;
  static readonly createFromCreators = createFromCreators;

  static create<Data>(name: string): ErreurType<Data> {
    const symbol = Symbol(`[Erreur]: ${name}`);

    return createWithTransform((data: Data) => data);

    function createWithTransform(transform: (...params: any[]) => Data) {
      const type: ErreurType<Data> = {
        [INTERNAL]: symbol,
        [DATA]: null as any,
        name,
        create: (...params: any[]) => new Erreur({ type, data: transform(...params) }),
        is: (error: unknown): error is Erreur => is(error, type),
        match: (error: unknown) => match(error, type),
        withTransform: (subTransform) => createWithTransform(subTransform as any) as any,
      };
      return type;
    }
  }

  private constructor(internal: ErreurInternal<any>) {
    super(`[Erreur]: ${internal.type.name} ${JSON.stringify(internal.data)}`);
    this[INTERNAL] = internal;
    // restore prototype chain
    Object.setPrototypeOf(this, new.target.prototype);
  }

  is(type: ErreurTypeAny): boolean {
    return is(this, type);
  }

  isOneOf(types: ErreurTypeAny[]): boolean {
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
    if (is(e)) {
      throw e;
    }
    throw onError(e);
  }
}

export async function wrapAsync<Res>(fn: () => Promise<Res>, onError: OnError): Promise<Res> {
  try {
    return await fn();
  } catch (error) {
    if (is(error)) {
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

function is(error: unknown, type?: ErreurTypeAny): error is Error {
  if (error instanceof Erreur) {
    if (type) {
      return error[INTERNAL].type[INTERNAL] === type[INTERNAL];
    }
    return true;
  }
  return false;
}

function isOneOf(error: unknown, types: ErreurTypeAny[]): error is Erreur {
  if (error instanceof Erreur) {
    return types.some((type) => error[INTERNAL].type[INTERNAL] === type[INTERNAL]);
  }
  return false;
}

function isOneOfObj(error: unknown, types: TypesBase): error is Erreur {
  if (error instanceof Erreur) {
    return Object.values(types).some((type) => error[INTERNAL].type[INTERNAL] === type[INTERNAL]);
  }
  return false;
}

function match<Data>(error: unknown, type: ErreurType<Data>): Data | null {
  if (error instanceof Erreur) {
    if (error[INTERNAL].type[INTERNAL] === type[INTERNAL]) {
      return error[INTERNAL].data;
    }
  }
  return null;
}

export type TypesBase = Record<string, ErreurTypeAny>;

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
    if (error[INTERNAL].type[INTERNAL] === type[INTERNAL]) {
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

function createWithTransform<Data, Params extends readonly any[]>(
  name: string,
  transform: (...params: Params) => Data
): ErreurType<Data, Params> {
  return Erreur.create<Data>(name).withTransform(transform);
}

export type CreatorsBase = Record<string, (...args: any[]) => any>;

export type ErreursFromCreators<Creators extends CreatorsBase> = {
  [K in keyof Creators]: ErreurType<ReturnType<Creators[K]>, Parameters<Creators[K]>>;
};

function createFromCreators<Creators extends CreatorsBase>(
  creators: Creators
): ErreursFromCreators<Creators> {
  const res: any = {};
  for (const key of Object.keys(creators)) {
    res[key] = Erreur.createWithTransform(key, creators[key]);
  }
  return res;
}

function createFromTypes<Errors extends Record<string, any>>() {
  return <Creators extends { [K in keyof Errors]: (...args: any[]) => Errors[K] }>(
    creators: Creators
  ): ErreursFromCreators<Creators> => {
    return createFromCreators(creators);
  };
}
