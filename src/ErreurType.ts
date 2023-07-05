import { IKey, Key, KeyConsumer, KeyProvider, KeyProviderFn } from '@dldc/stack';
import { Erreur } from './Erreur';

export const MessageKey = Key.createWithDefault<string>('Message', '[Erreur]');
export const StackTraceKey = Key.create<string>('StackTrace');

export interface IErreurType<T, HasDefault extends boolean = boolean, Args extends readonly any[] = [T]> {
  readonly Consumer: KeyConsumer<T, HasDefault>;
  readonly Provider: KeyProviderFn<T, HasDefault>;
  readonly create: (...args: Args) => Erreur;
  readonly append: (erreur: Erreur, ...args: Args) => Erreur;
}

export type TransformErreur<T> = (base: Erreur, provider: KeyProvider<T>, value: T) => Erreur;

export type TransformValue<T, Args extends readonly any[]> = (...args: Args) => T;

export const ErreurType = (() => {
  const DEFAULT_TRANSFORM_ERREUR: TransformErreur<any> = (base, provider) => base.with(provider);

  return {
    defineAdvanced,
    define,
    defineWithDefault,
    defineEmpty,
    defineWithTransform,
  };

  function define<T>(
    name: string,
    transformErreur: TransformErreur<T> = DEFAULT_TRANSFORM_ERREUR
  ): IErreurType<T, false, [T]> {
    return defineAdvanced(Key.create<T>(name), (v) => v, transformErreur);
  }

  function defineWithTransform<T, Args extends readonly any[]>(
    name: string,
    transformValue: TransformValue<T, Args>,
    transformErreur: TransformErreur<T> = DEFAULT_TRANSFORM_ERREUR
  ): IErreurType<T, false, Args> {
    return defineAdvanced(Key.create<T>(name), transformValue, transformErreur);
  }

  function defineWithDefault<T>(
    name: string,
    defaultValue: T,
    transformErreur: TransformErreur<T> = DEFAULT_TRANSFORM_ERREUR
  ): IErreurType<T, true, [T]> {
    return defineAdvanced(Key.createWithDefault<T>(name, defaultValue), (v) => v, transformErreur);
  }

  function defineEmpty(
    name: string,
    transformErreur: TransformErreur<undefined> = DEFAULT_TRANSFORM_ERREUR
  ): IErreurType<undefined, false, []> {
    return defineAdvanced(Key.createEmpty(name), () => undefined, transformErreur);
  }

  function defineAdvanced<T, HasDefault extends boolean, Args extends readonly any[]>(
    key: IKey<T, HasDefault>,
    transformValue: TransformValue<T, Args>,
    transformErreur: TransformErreur<T> = DEFAULT_TRANSFORM_ERREUR
  ): IErreurType<T, HasDefault, Args> {
    return {
      Consumer: key.Consumer,
      Provider: key.Provider,
      create,
      append,
    };

    function create(...args: Args): Erreur {
      return append(Erreur.create(), ...args);
    }

    function append(erreur: Erreur, ...args: Args): Erreur {
      const value = transformValue(...args);
      const provider = key.Provider(value as any);
      return transformErreur(erreur, provider, value);
    }
  }
})();
