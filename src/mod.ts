export type ErreurInfos = { kind: string | number | symbol; message: string };

export class Erreur<T extends ErreurInfos> extends Error {
  public static is(val: unknown): val is Erreur<ErreurInfos> {
    return val instanceof Erreur;
  }

  public readonly infos: T;
  public readonly kind: T['kind'];

  constructor(infos: T) {
    super('[Erreur] ' + infos.message);
    this.infos = infos;
    this.kind = infos.kind;
    // restore prototype chain
    Object.setPrototypeOf(this, Erreur.prototype);
  }
}

export type ErreursMapErrors = Record<
  string,
  (...args: any[]) => { message: string; details?: any }
>;

export type ErreursMapCreate<Errors extends ErreursMapErrors> = {
  [K in keyof Errors]: (
    ...params: Parameters<Errors[K]>
  ) => Erreur<{ kind: K } & ReturnType<Errors[K]>>;
};

export type Expand<T> = T extends unknown ? { [K in keyof T]: T[K] } : never;

export class ErreursMap<Errors extends ErreursMapErrors> {
  public static readonly Base = new ErreursMap({
    UnknownError: (error: Error) => ({ message: error.message, error }),
    Unknown: (error: unknown) => ({ message: String(error), error }),
  });

  public readonly errors: Errors;

  /**
   * This property expose the type of the error.
   * type MyError = typeof MyError.infered
   */
  public readonly infered: Erreur<
    { [K in keyof Errors]: Expand<{ kind: K } & ReturnType<Errors[K]>> }[keyof Errors]
  > = null as any;

  /**
   * Create an instance of Erreur with the given kind.
   * `UserErreurs.create.[ErrorKind](...args)`
   */
  public readonly create: ErreursMapCreate<Errors>;

  constructor(errors: Errors) {
    this.errors = errors;
    this.create = Object.fromEntries(
      Object.entries(errors).map(([key, fn]) => [
        key,
        (...args: any[]) => new Erreur({ kind: key, ...fn(...args) }),
      ])
    ) as any;
  }

  public is(val: unknown): val is this['infered'] {
    if (val instanceof Erreur && val.kind in this.errors) {
      return true;
    }
    return false;
  }

  public wrap<T>(fn: () => T, mapOtherErr: (err: unknown) => this['infered']): T | this['infered'] {
    try {
      const result = fn();
      if (isPromise(result)) {
        console.warn('[Erreur.wrap]: Wrap received a promise, did you mean to use wrapAsync ?');
      }
      return result;
    } catch (error) {
      if (this.is(error)) {
        return error;
      }
      return mapOtherErr(error);
    }
  }

  public async wrapAsync<T>(
    fn: () => Promise<T> | T,
    mapOtherErr: (err: unknown) => this['infered']
  ): Promise<T | this['infered']> {
    try {
      return await fn();
    } catch (error) {
      if (this.is(error)) {
        return error;
      }
      return mapOtherErr(error);
    }
  }
}

function isPromise(val: unknown): val is Promise<any> {
  return Promise.resolve(val) === val;
}
