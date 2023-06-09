import { INTERNAL, PARENT } from './constants.ts';
import { ErreurType, ErreurTypeAny } from './ErreurType.ts';
import { isErreur, match } from './utils.ts';

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
}
