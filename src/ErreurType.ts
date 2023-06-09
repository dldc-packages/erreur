import { DATA, INTERNAL } from './constants';
import {
  createEmptyType,
  createManyTypes,
  createManyTypesFromData,
  createType,
  createTypeWithTransform,
  DEFAULT_MESSAGE,
} from './create';
import { Erreur, ErreurConstructorOptions } from './Erreur';
import { isErreur, match, matchExec } from './utils';

export type ErreurTypeAny = ErreurType<any, any>;

export type GetMessage<Data> = (data: Data, name: string) => string;

export type CreateParent<Data> = (data: Data) => Erreur;

export class ErreurType<Data, Params extends readonly any[] = readonly [Data]> {
  readonly [INTERNAL]: symbol;
  readonly [DATA]: Data = null as any; // used for type only

  public constructor(
    public readonly key: symbol | null,
    public readonly name: string,
    private readonly transform: (...params: Params) => Data,
    private readonly getMessage: GetMessage<Data>,
    private readonly createParent?: CreateParent<Data>
  ) {
    this[INTERNAL] = key ?? Symbol(`[Erreur]: ${name}`);
  }

  static readonly DEFAULT_MESSAGE = DEFAULT_MESSAGE;

  /**
   * Create
   */

  static readonly create = createType;
  static readonly createEmpty = createEmptyType;
  static readonly createMany = createManyTypes;
  static readonly createManyFromData = createManyTypesFromData;
  static readonly createWithTransform = createTypeWithTransform;

  /**
   * Transform (keep the same [INTERNAL] key)
   */

  public readonly withTransform = <Params extends readonly any[]>(
    transform: (...params: Params) => Data
  ): ErreurType<Data, Params> => {
    return new ErreurType<Data, Params>(this[INTERNAL], this.name, transform, this.getMessage);
  };

  public readonly withMessage = (message: string | GetMessage<Data>): ErreurType<Data, Params> => {
    const getMessageResolved = typeof message === 'string' ? () => message : message;
    return new ErreurType<Data, Params>(this[INTERNAL], this.name, this.transform, getMessageResolved);
  };

  public readonly withParent = (createParent: CreateParent<Data>): ErreurType<Data, Params> => {
    return new ErreurType<Data, Params>(this[INTERNAL], this.name, this.transform, this.getMessage, createParent);
  };

  /**
   * Instantiate
   */

  public readonly prepare = (...params: Params): ErreurConstructorOptions<Data> => {
    const data = this.transform(...params);
    const message = this.getMessage(data, this.name);
    return { type: this, data, message };
  };

  public readonly prepareWithCause = (cause: Erreur, ...params: Params): ErreurConstructorOptions<Data> => {
    return { ...this.prepare(...params), erreurCause: cause };
  };

  public readonly instantiate = (...params: Params): Erreur => {
    const prepared = this.prepare(...params);
    return new Erreur(this.prepare(...params), this.createParent?.(prepared.data));
  };

  public readonly instantiateWithCause = (cause: Erreur, ...params: Params): Erreur => {
    const prepared = this.prepare(...params);
    return new Erreur(this.prepareWithCause(cause, ...params), this.createParent?.(prepared.data));
  };

  /**
   * Binded utils
   */

  public readonly is = (error: unknown): error is Erreur => isErreur(error, this);
  public readonly match = (error: unknown) => match<Data>(error, this);
  public readonly matchExec = <Result>(error: unknown, fn: (data: Data) => Result) => matchExec(error, this, fn);
}
