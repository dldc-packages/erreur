import { INTERNAL, PARENT } from './constants';
import { ErreurType, ErreurTypeAny } from './ErreurType';
import {
  getEntries,
  isErreur,
  isOneOf,
  isOneOfObj,
  match,
  matchExec,
  matchObj,
  resolve,
  resolveAsync,
  wrap,
  wrapAsync,
} from './utils';

export interface ErreurConstructorOptions<Data> {
  readonly type: ErreurType<Data, any>;
  readonly data: Data;
  readonly message: string;
  readonly erreurCause?: Erreur;
}

/**
 * The is the Erreur class. It is the base class for all Erreur instances.
 */
export class Erreur extends Error {
  public readonly [INTERNAL]: ErreurConstructorOptions<any>;
  public readonly [PARENT]: Erreur | null;

  public readonly erreurCause?: Erreur;
  public cause?: Error | undefined;

  constructor(options: ErreurConstructorOptions<any>, parent: Erreur | null = null) {
    super(`[Erreur]: ${options.message}`);
    this[PARENT] = parent;
    this[INTERNAL] = options;
    this.erreurCause = options.erreurCause;
    this.cause = options.erreurCause;
    // restore prototype chain
    Object.setPrototypeOf(this, new.target.prototype);
  }

  extends<Data>(options: ErreurConstructorOptions<Data>): Erreur {
    return new Erreur(options, this);
  }

  /**
   * Binded utils
   */

  public readonly is = (type: ErreurTypeAny) => isErreur(this, type);
  public readonly match = <Data>(type: ErreurType<Data, any>) => match<Data>(this, type);
  public readonly matchExec = <Data, Result>(type: ErreurType<Data>, fn: (data: Data) => Result) =>
    matchExec<Data, Result>(this, type, fn);

  /**
   * Static utils
   */
  static is = isErreur;
  static match = match;
  static matchExec = matchExec;
  static matchObj = matchObj;
  static isOneOf = isOneOf;
  static isOneOfObj = isOneOfObj;
  static resolve = resolve;
  static getEntries = getEntries;
  static resolveAsync = resolveAsync;
  static wrap = wrap;
  static wrapAsync = wrapAsync;
}
