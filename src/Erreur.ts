import { KeyConsumer, KeyProvider, StaackCore, StaackCoreValue } from 'staack';
import { MessageKey } from './keys';
import { fixStack, isErreur, resolve, resolveAsync, wrap, wrapAsync } from './utils';

export class Erreur extends Error {
  public readonly context: StaackCoreValue;

  private constructor(context: StaackCoreValue = null) {
    super(`[Erreur]`);
    this.context = context;
    // dynamic message
    Object.defineProperty(this, 'message', {
      get: () => this.getMessage(),
    });

    // restore prototype chain
    Object.setPrototypeOf(this, new.target.prototype);
    // try to remove contructor from stack trace
    fixStack(this, Erreur.create);
  }

  static create(message?: string): Erreur {
    return new Erreur(message ? StaackCore.with(null, MessageKey.Provider(message)) : null);
  }

  private getMessage(): string {
    return this.get(MessageKey.Consumer);
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
