import { StaackCore, type IKeyConsumer, type IKeyProvider, type TStaackCoreValue } from '@dldc/stack';
import type { JsonValue } from './ErreurType';
import { JsonKey, MessageKey, NameKey, StackTraceKey } from './ErreurType';
import { fixStack, isErreur, resolve, resolveAsync, wrap, wrapAsync } from './utils';

export class Erreur extends Error {
  static create(message?: string): Erreur {
    const err = new Error('[Erreur]');
    const stack = fixStack(err, Erreur.create);
    let context = StaackCore.with(null, StackTraceKey.Provider(stack));
    if (message) {
      context = StaackCore.with(context, MessageKey.Provider(message));
    }
    return new Erreur(context);
  }

  static fromError(error: Error): Erreur {
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
  static fromUnknown(error: unknown): Erreur {
    if (error instanceof Error) {
      return Erreur.fromError(error);
    }
    if (typeof error === 'string') {
      return Erreur.create(error);
    }
    return Erreur.create(String(error));
  }

  public readonly context!: TStaackCoreValue;

  public readonly toJSON!: () => JsonValue;

  /**
   * You should not use this constructor directly.
   * Use Erreur.create, Erreur.fromError or Erreur.fromUnknown instead.
   */
  constructor(context: TStaackCoreValue) {
    super(``);
    Object.defineProperty(this, 'context', {
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
    Object.defineProperty(this, 'toJSON', {
      value: () => this.getJson(),
    });

    // restore prototype chain
    Object.setPrototypeOf(this, new.target.prototype);
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
    return StaackCore.has(this.context, consumer);
  }

  get<T, HasDefault extends boolean>(consumer: IKeyConsumer<T, HasDefault>): HasDefault extends true ? T : T | null {
    return StaackCore.get(this.context, consumer);
  }

  getOrFail<T>(consumer: IKeyConsumer<T>): T {
    return StaackCore.getOrFail(this.context, consumer);
  }

  with(...keys: Array<IKeyProvider<any>>): Erreur {
    return new Erreur(StaackCore.with(this.context, ...keys));
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
    const nextCore = StaackCore.merge(this.context, other.context);
    if (nextCore === this.context) {
      return this;
    }
    return new Erreur(nextCore);
  }

  mergeOn(other: Erreur): Erreur {
    return other.merge(this);
  }

  dedupe(): Erreur {
    const nextCore = StaackCore.dedupe(this.context);
    if (nextCore === this.context) {
      return this;
    }
    return new Erreur(nextCore);
  }

  static is = isErreur;
  static resolve = resolve;
  static resolveAsync = resolveAsync;
  static wrap = wrap;
  static wrapAsync = wrapAsync;
}
