const INTERNAL = Symbol('INTERNAL');
const DATA = Symbol('DATA');

export type OnError = (error: unknown) => Erreur;

export type ErreurDeclarationAny = ErreurDeclaration<any, any>;

export type ObjDeclarationsBase = Record<string, ErreurDeclarationAny>;

export type ObjTypesBase = Record<string, any>;

export type GetMessage<Data> = (data: Data, declaration: ErreurDeclaration<Data>) => string;

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
  readonly withMessage: (message: string | GetMessage<Data>) => ErreurDeclaration<Data, Params>;

  readonly create: (...params: Params) => Erreur;
  readonly createWithCause: (cause: Erreur, ...params: Params) => Erreur;
  readonly is: (error: unknown) => error is Erreur;
  readonly match: (error: unknown) => Data | undefined;
  readonly matchExec: <Result>(error: unknown, fn: (data: Data) => Result) => Result | undefined;
}

interface ErreurInternal<Data> {
  readonly declaration: ErreurDeclaration<Data, any>;
  readonly data: Data;
  readonly message: string;
  readonly erreurCause?: Erreur;
}

export class Erreur extends Error {
  private [INTERNAL]: ErreurInternal<any>;

  /**
   * If the data is an object with a message property, it will be used as the error message
   * Otherwise, the error message will be the name of the error and the data as a JSON string
   */
  static readonly DEFAULT_MESSAGE: GetMessage<any> = (data, declaration) => {
    if (data && 'message' in data && typeof data.message === 'string') {
      return data.message;
    }
    return `${declaration.name} ${JSON.stringify(data)}`;
  };

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
   * Returns the matched erreur data or undefined
   */
  static readonly match = match;
  /**
   * Runs the provided function with the matched data if the error is matched
   */
  static readonly matchExec = matchExec;
  /**
   * Either returns the matched erreur data or throw the error
   */
  static readonly matchObj = matchObj;

  static readonly declareWithTransform = declareWithTransform;

  static readonly declareManyFromTypes = declareManyFromTypes;
  static readonly declareMany = declareMany;
  static readonly declareEmpty = declareEmpty;

  public readonly erreurCause?: Erreur;
  public cause?: Error | undefined;

  static declare<Data>(
    name: string,
    message: string | GetMessage<Data> = Erreur.DEFAULT_MESSAGE
  ): ErreurDeclaration<Data> {
    const symbol = Symbol(`[Erreur]: ${name}`);

    return declareInternal((data: Data) => data, message);

    function declareInternal(transform: (...params: any[]) => Data, getMessage: string | GetMessage<Data>) {
      const getMessageResolved = typeof getMessage === 'string' ? () => getMessage : getMessage;
      const type: ErreurDeclaration<Data> = {
        [INTERNAL]: symbol,
        [DATA]: null as any,
        name,
        create: (...params: any[]) => {
          const data = transform(...params);
          return new Erreur({ declaration: type, data, message: getMessageResolved(data, type) });
        },
        createWithCause: (cause: Erreur, ...params: any[]) => {
          const data = transform(...params);
          return new Erreur({ declaration: type, data, erreurCause: cause, message: getMessageResolved(data, type) });
        },
        is: (error: unknown): error is Erreur => is(error, type),
        match: (error: unknown) => match(error, type),
        matchExec: <Result>(error: unknown, fn: (data: Data) => Result) => matchExec(error, type, fn),
        withTransform: (subTransform) => declareInternal(subTransform as any, getMessage) as any,
        withMessage: (subMessage) => declareInternal(transform, subMessage as any) as any,
      };
      return type;
    }
  }

  private constructor(internal: ErreurInternal<any>) {
    super(`[Erreur]: ${internal.message}`);
    this[INTERNAL] = internal;
    this.erreurCause = internal.erreurCause;
    this.cause = internal.erreurCause;
    // restore prototype chain
    Object.setPrototypeOf(this, new.target.prototype);
  }

  is(type: ErreurDeclarationAny): boolean {
    return is(this, type);
  }

  isOneOf(types: ErreurDeclarationAny[]): boolean {
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

export async function resolveAsync<Res>(fn: () => Promise<Res>, onError: OnError): Promise<Res | Erreur> {
  try {
    return await wrapAsync(fn, onError);
  } catch (error) {
    return error as any;
  }
}

function is(error: unknown, type?: ErreurDeclarationAny): error is Erreur {
  if (error instanceof Erreur) {
    if (type) {
      return error[INTERNAL].declaration[INTERNAL] === type[INTERNAL];
    }
    return true;
  }
  return false;
}

function isOneOf(error: unknown, types: ErreurDeclarationAny[]): error is Erreur {
  if (error instanceof Erreur) {
    return types.some((type) => error[INTERNAL].declaration[INTERNAL] === type[INTERNAL]);
  }
  return false;
}

function isOneOfObj(error: unknown, types: ObjDeclarationsBase): error is Erreur {
  if (error instanceof Erreur) {
    return Object.values(types).some((type) => error[INTERNAL].declaration[INTERNAL] === type[INTERNAL]);
  }
  return false;
}

function match<Data>(error: unknown, type: ErreurDeclaration<Data, any>): Data | undefined {
  if (is(error, type)) {
    return error[INTERNAL].data;
  }
  return undefined;
}

function matchExec<Data, Result>(
  error: unknown,
  type: ErreurDeclaration<Data, any>,
  exec: (data: Data) => Result
): Result | undefined {
  if (is(error, type)) {
    return exec(error[INTERNAL].data);
  }
  return undefined;
}

export type DataFromTypes<Types extends ObjTypesBase> = {
  [K in keyof Types]: { kind: K; data: Types[K] };
}[keyof Types];

function matchObj<Declarations extends ObjDeclarationsBase>(
  error: unknown,
  declarations: Declarations
): DataFromTypes<{ [K in keyof Declarations]: Declarations[K][typeof DATA] }> | undefined {
  if (!is(error)) {
    return undefined;
  }
  const keys = Object.keys(declarations);
  for (const key of keys) {
    const type = declarations[key];
    if (error[INTERNAL].declaration[INTERNAL] === type[INTERNAL]) {
      return { kind: key, data: error[INTERNAL].data };
    }
  }
  return undefined;
}

function declareEmpty(name: string, message?: string | GetMessage<never>): ErreurDeclaration<never> {
  return declareWithTransform(name, () => null as never, message);
}

function declareWithTransform<Data, Params extends readonly any[]>(
  name: string,
  transform: (...params: Params) => Data,
  message?: string | GetMessage<Data>
): ErreurDeclaration<Data, Params> {
  return Erreur.declare<Data>(name, message).withTransform(transform);
}

export type CreatorsBase = Record<string, (...args: any[]) => any>;

export type ErreursFromCreators<Creators extends CreatorsBase> = {
  [K in keyof Creators]: ErreurDeclaration<ReturnType<Creators[K]>, Parameters<Creators[K]>>;
};

function declareMany<Creators extends CreatorsBase>(creators: Creators): ErreursFromCreators<Creators> {
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
