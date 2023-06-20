import { KeyConsumer, KeyProvider, StaackCore, StaackCoreValue } from 'staack';
import { MessageKey, StackTraceKey } from './ErreurType';
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

  public readonly context: StaackCoreValue;

  /**
   * You should not use this constructor directly.
   * Use Erreur.create, Erreur.fromError or Erreur.fromUnknown instead.
   */
  constructor(context: StaackCoreValue) {
    super(`[Erreur]`);
    this.context = context;
    // dynamic message
    Object.defineProperty(this, 'message', {
      get: () => this.getMessage(),
    });
    Object.defineProperty(this, 'stack', {
      get: () => this.getStack(),
    });

    // restore prototype chain
    Object.setPrototypeOf(this, new.target.prototype);
  }

  private getMessage(): string {
    return this.get(MessageKey.Consumer);
  }

  private getStack(): string | undefined {
    return this.get(StackTraceKey.Consumer) ?? undefined;
  }

  has(consumer: KeyConsumer<any, any>): boolean {
    return StaackCore.has(this.context, consumer);
  }

  get<T, HasDefault extends boolean>(consumer: KeyConsumer<T, HasDefault>): HasDefault extends true ? T : T | null {
    return StaackCore.get(this.context, consumer);
  }

  getOrFail<T>(consumer: KeyConsumer<T>): T {
    return StaackCore.getOrFail(this.context, consumer);
  }

  with(...keys: Array<KeyProvider<any>>): Erreur {
    return new Erreur(StaackCore.with(this.context, ...keys));
  }

  withMessage(message: string): Erreur {
    return this.with(MessageKey.Provider(message));
  }

  static is = isErreur;
  static resolve = resolve;
  static resolveAsync = resolveAsync;
  static wrap = wrap;
  static wrapAsync = wrapAsync;
}
