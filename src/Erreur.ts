import type { IKeyBase, IKeyConsumer, IKeyProvider, TArgsBase, TStackCoreValue } from '@dldc/stack';
import { Key, StackCore } from '@dldc/stack';
import { debug, fixStack, isErreur, resolve, resolveAsync, wrap, wrapAsync } from './utils';

export type JsonValue = string | number | boolean | null | JsonValue[] | { [key: string]: JsonValue };

export const NameKey = Key.createWithDefault<string>('Name', 'Erreur');
export const MessageKey = Key.createWithDefault<string>('Message', '[Erreur]');
export const JsonKey = Key.create<JsonValue>('Json');
export const StackTraceKey = Key.create<string>('StackTrace');

export const ERREUR_CONTEXT = Symbol.for('dldc.erreur.context');

const NODE_INSPECT = Symbol.for('nodejs.util.inspect.custom');

export class Erreur extends Error {
  static create(message?: string): Erreur {
    const err = new Error('[Erreur]');
    const stack = fixStack(err, Erreur.create);
    let context = StackCore.with(null, StackTraceKey.Provider(stack));
    if (message) {
      context = StackCore.with(context, MessageKey.Provider(message));
    }
    return new Erreur(context);
  }

  static createWith<T, HasDefault extends boolean, Args extends TArgsBase>(
    key: IKeyBase<T, HasDefault, Args>,
    ...args: Args
  ): Erreur {
    return Erreur.create().with(key.Provider(...args));
  }

  static createFromError(error: Error): Erreur {
    if (isErreur(error)) {
      return error;
    }
    return Erreur.create(error.message);
  }

  /**
   * Create an Erreur from an unknown value.
   * If the value is an Erreur, it will be returned as is.
   * If the value is an Error, it will be wrapped in an Erreur using error.message.
   * Otherwise, the value will be converted to a string and used as the message.
   */
  static createFromUnknown(error: unknown): Erreur {
    if (error instanceof Error) {
      return Erreur.createFromError(error);
    }
    if (typeof error === 'string') {
      return Erreur.create(error);
    }
    return Erreur.create(String(error));
  }

  public readonly [ERREUR_CONTEXT]!: TStackCoreValue;

  /**
   * You should not use this constructor directly.
   * Use Erreur.create, Erreur.fromError or Erreur.fromUnknown instead.
   */
  constructor(context: TStackCoreValue) {
    super(``);
    Object.defineProperty(this, ERREUR_CONTEXT, {
      value: context,
      enumerable: false,
      writable: false,
    });
    Object.defineProperty(this, 'name', {
      get: () => this.getName(),
    });
    Object.defineProperty(this, 'message', {
      get: () => this.getMessage(),
    });
    Object.defineProperty(this, 'stack', {
      get: () => this.getStack(),
    });
    Object.defineProperty(this, NODE_INSPECT, {
      value: () => this.toString(),
    });

    // restore prototype chain
    Object.setPrototypeOf(this, new.target.prototype);
  }

  toJSON(): JsonValue {
    return this.getJson();
  }

  private getName(): string {
    return this.get(NameKey.Consumer);
  }

  private getMessage(): string {
    return this.get(MessageKey.Consumer);
  }

  private getStack(): string | undefined {
    return this.get(StackTraceKey.Consumer) ?? undefined;
  }

  private getJson(): JsonValue {
    return this.get(JsonKey.Consumer) ?? { name: this.getName(), message: this.getMessage() };
  }

  has(consumer: IKeyConsumer<any, any>): boolean {
    return StackCore.has(this[ERREUR_CONTEXT], consumer);
  }

  get<T, HasDefault extends boolean>(consumer: IKeyConsumer<T, HasDefault>): HasDefault extends true ? T : T | null {
    return StackCore.get(this[ERREUR_CONTEXT], consumer);
  }

  getOrFail<T>(consumer: IKeyConsumer<T>): T {
    return StackCore.getOrFail(this[ERREUR_CONTEXT], consumer);
  }

  with(...keys: Array<IKeyProvider<any>>): Erreur {
    return new Erreur(StackCore.with(this[ERREUR_CONTEXT], ...keys));
  }

  withMessage(message: string): Erreur {
    return this.with(MessageKey.Provider(message));
  }

  withName(name: string): Erreur {
    return this.with(NameKey.Provider(name));
  }

  withJson(value: JsonValue): Erreur {
    return this.with(JsonKey.Provider(value));
  }

  merge(other: Erreur): Erreur {
    if (other === this) {
      return this;
    }
    const nextCore = StackCore.merge(this[ERREUR_CONTEXT], other[ERREUR_CONTEXT]);
    if (nextCore === this[ERREUR_CONTEXT]) {
      return this;
    }
    return new Erreur(nextCore);
  }

  mergeOn(other: Erreur): Erreur {
    return other.merge(this);
  }

  dedupe(): Erreur {
    const nextCore = StackCore.dedupe(this[ERREUR_CONTEXT]);
    if (nextCore === this[ERREUR_CONTEXT]) {
      return this;
    }
    return new Erreur(nextCore);
  }

  toString() {
    return `${this.getName()}: ${this.getMessage()}\n${this.stack}`;
  }

  static readonly is = isErreur;

  /**
   * Ensure the function will either return a value or throw an Erreur instance
   */
  static readonly wrap = wrap;

  /**
   * Ensure the function will either return a value or throw an Erreur instance
   */
  static readonly wrapAsync = wrapAsync;

  /**
   * Either resturn the result or an Erreur instance
   */
  static readonly resolve = resolve;

  /**
   * Either resturn the result or an Erreur instance
   */
  static readonly resolveAsync = resolveAsync;

  /**
   * Extract all stack data
   */
  static readonly debug = debug;
}
