const INTERNAL = Symbol('INTERNAL');
const DATA = Symbol('DATA');

export type OnError = (error: unknown) => Erreur;

export type ErreurMap = Record<string, ErreurTypeAny>;

export type ErreurTypeAny = ErreurDeclaration<any, any>;

export type ErreurMapUnion<Erreurs extends ErreurMap> = {
  [K in keyof Erreurs]: { kind: K; data: Erreurs[K] };
}[keyof Erreurs];

/**
 * This is like a key to instantiate an Erreur and extract its data
 */
export interface ErreurDeclaration<Data, Params extends readonly any[] = [Data]> {
  readonly [DATA]: Data;
  readonly [INTERNAL]: symbol;
  readonly name: string;

  readonly withTransform: <Params extends readonly any[]>(
    transform: (...params: Params) => Data
  ) => ErreurDeclaration<Data, Params>;

  readonly create: (...params: Params) => Erreur;
  readonly createWithCause: (cause: Erreur, ...params: Params) => Erreur;
  readonly is: (error: unknown) => error is Erreur;
  readonly match: (error: unknown) => Data | null;
}

interface ErreurInternal<Data> {
  readonly declaration: ErreurDeclaration<Data>;
  readonly data: Data;
  readonly erreurCause?: Erreur;
}

export class Erreur extends Error {
  private [INTERNAL]: ErreurInternal<any>;

  /**
   * Make sure the function either returns a value or throws an Erreur instance
   */
  static readonly wrap = wrap;
  /**
   * Same as wrap but for async functions
   */
  static readonly wrapAsync = wrapAsync;

  /**
   * Same as wrap but returns the error instead of throwing it
   */
  static readonly resolve = resolve;
  /**
   * Same as resolve but for async functions
   */
  static readonly resolveAsync = resolveAsync;

  /**
   * Returns true if the error is an Erreur instance
   * If a type is provided, it will also check if the error is of the provided type
   */
  static readonly is = is;
  /**
   * Returns true if the error is an Erreur instance and is of one of the provided types
   */
  static readonly isOneOf = isOneOf;
  /**
   * Returns true if the error is an Erreur instance and is of one of the value of the provided object
   */
  static readonly isOneOfObj = isOneOfObj;

  /**
   * Returns the matched erreur data or null
   */
  static readonly match = match;
  /**
   * Either returns the matched erreur data or throw the error
   */
  static readonly matchObj = matchObj;
  /**
   * Either returns the matched erreur data or throw the error
   */
  static readonly matchObjOrThrow = matchObjOrThrow;
  /**
   * Match the error then execute the provided function with the matched data
   */
  static readonly matchObjExec = matchObjExec;
  /**
   * Same as matchObjExec but throw the error if the error is not macthed
   */
  static readonly matchObjExecOrThrow = matchObjExecOrThrow;

  static readonly declareWithTransform = declareWithTransform;

  static readonly declareManyFromTypes = declareManyFromTypes;
  static readonly declareMany = declareMany;

  public readonly erreurCause?: Erreur;
  public cause?: Error | undefined;

  static declare<Data>(name: string): ErreurDeclaration<Data> {
    const symbol = Symbol(`[Erreur]: ${name}`);

    return declareWithTransform((data: Data) => data);

    function declareWithTransform(transform: (...params: any[]) => Data) {
      const type: ErreurDeclaration<Data> = {
        [INTERNAL]: symbol,
        [DATA]: null as any,
        name,
        create: (...params: any[]) => new Erreur({ declaration: type, data: transform(...params) }),
        createWithCause: (cause: Erreur, ...params: any[]) =>
          new Erreur({ declaration: type, data: transform(...params), erreurCause: cause }),
        is: (error: unknown): error is Erreur => is(error, type),
        match: (error: unknown) => match(error, type),
        withTransform: (subTransform) => declareWithTransform(subTransform as any) as any,
      };
      return type;
    }
  }

  private constructor(internal: ErreurInternal<any>) {
    super(`[Erreur]: ${internal.declaration.name} ${JSON.stringify(internal.data)}`);
    this[INTERNAL] = internal;
    this.erreurCause = internal.erreurCause;
    this.cause = internal.erreurCause;
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
      return error[INTERNAL].declaration[INTERNAL] === type[INTERNAL];
    }
    return true;
  }
  return false;
}

function isOneOf(error: unknown, types: ErreurTypeAny[]): error is Erreur {
  if (error instanceof Erreur) {
    return types.some((type) => error[INTERNAL].declaration[INTERNAL] === type[INTERNAL]);
  }
  return false;
}

function isOneOfObj(error: unknown, types: TypesBase): error is Erreur {
  if (error instanceof Erreur) {
    return Object.values(types).some(
      (type) => error[INTERNAL].declaration[INTERNAL] === type[INTERNAL]
    );
  }
  return false;
}

function match<Data>(error: unknown, type: ErreurDeclaration<Data>): Data | null {
  if (error instanceof Erreur) {
    if (error[INTERNAL].declaration[INTERNAL] === type[INTERNAL]) {
      return error[INTERNAL].data;
    }
  }
  return null;
}

export type TypesBase = Record<string, any>;

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
    if (error[INTERNAL].declaration[INTERNAL] === type[INTERNAL]) {
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

function matchObjExec<Types extends TypesBase>(error: unknown, types: Types) {
  return function expect<Result>(execs: {
    [K in keyof Types]: (data: Types[K], type: ErreurDeclaration<Types[K]>) => Result;
  }): Result | null {
    const res = matchObj(error, types);
    if (res) {
      return execs[res.kind](res.data as any, types[res.kind]);
    }
    return null;
  };
}

function matchObjExecOrThrow<Types extends TypesBase>(error: unknown, types: Types) {
  return function expect<Result>(execs: {
    [K in keyof Types]: (data: Types[K], type: ErreurDeclaration<Types[K]>) => Result;
  }): Result {
    const res = matchObj(error, types);
    if (res) {
      return execs[res.kind](res.data as any, types[res.kind]);
    }
    throw error;
  };
}

function declareWithTransform<Data, Params extends readonly any[]>(
  name: string,
  transform: (...params: Params) => Data
): ErreurDeclaration<Data, Params> {
  return Erreur.declare<Data>(name).withTransform(transform);
}

export type CreatorsBase = Record<string, (...args: any[]) => any>;

export type ErreursFromCreators<Creators extends CreatorsBase> = {
  [K in keyof Creators]: ErreurDeclaration<ReturnType<Creators[K]>, Parameters<Creators[K]>>;
};

function declareMany<Creators extends CreatorsBase>(
  creators: Creators
): ErreursFromCreators<Creators> {
  const res: any = {};
  for (const key of Object.keys(creators)) {
    res[key] = declareWithTransform(key, creators[key]);
  }
  return res;
}

function declareManyFromTypes<Errors extends Record<string, any>>() {
  return <Creators extends { [K in keyof Errors]: (...args: any[]) => Errors[K] }>(
    creators: Creators
  ): ErreursFromCreators<Creators> => {
    return declareMany(creators);
  };
}
