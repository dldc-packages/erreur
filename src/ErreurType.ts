import { IKey, Key, KeyConsumer, KeyProvider, KeyProviderFn } from 'staack';
import { Erreur } from './Erreur';

export const MessageKey = Key.createWithDefault<string>('Message', '[Erreur]');
export const StackTraceKey = Key.create<string>('StackTrace');

export { IKey, KeyConsumer, KeyProvider, KeyProviderFn };

export interface IErreurType<T, HasDefault extends boolean = boolean> {
  readonly Consumer: KeyConsumer<T, HasDefault>;
  readonly Provider: KeyProviderFn<T, HasDefault>;
  readonly create: (...args: undefined extends T ? [] : [value: T]) => Erreur;
  readonly extends: (erreur: Erreur | null, ...args: undefined extends T ? [] : [value: T]) => Erreur;
}

export type Transform<T> = (current: Erreur, value: T) => Erreur;

export const ErreurType = (() => {
  return {
    define,
    defineWithDefault,
    defineEmpty,
  };

  function define<T>(name: string, transform?: Transform<T>): IErreurType<T, false> {
    return defineInternal(Key.create<T>(name), transform);
  }

  function defineWithDefault<T>(name: string, defaultValue: T, transform?: Transform<T>): IErreurType<T, true> {
    return defineInternal(Key.createWithDefault<T>(name, defaultValue), transform);
  }

  function defineEmpty(name: string, transform?: Transform<undefined>): IErreurType<undefined, false> {
    return defineInternal(Key.createEmpty(name), transform);
  }

  function defineInternal<T, HasDefault extends boolean>(
    key: IKey<T, HasDefault>,
    transform: Transform<T> | undefined
  ): IErreurType<T, HasDefault> {
    return {
      Consumer: key.Consumer,
      Provider: key.Provider,
      create,
      extends: extendsErreur,
    };

    function create(...args: undefined extends T ? [] : [value: T]): Erreur {
      return extendsErreur(null, ...args);
    }

    function extendsErreur(erreur: Erreur | null, ...args: undefined extends T ? [] : [value: T]): Erreur {
      const parent = erreur || Erreur.create();
      const transformed = transform ? transform(parent, args[0] as T) : parent;
      return transformed.with(key.Provider(...args));
    }
  }
})();
