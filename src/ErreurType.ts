import { Key, type IKey, type IKeyConsumer, type IKeyProvider, type TKeyProviderFn } from '@dldc/stack';
import { Erreur } from './Erreur';

export const NameKey = Key.createWithDefault<string>('Name', 'Erreur');
export const MessageKey = Key.createWithDefault<string>('Message', '[Erreur]');
export const StackTraceKey = Key.create<string>('StackTrace');

export interface IErreurType<T, HasDefault extends boolean = boolean, Args extends readonly any[] = [T]> {
  readonly Consumer: IKeyConsumer<T, HasDefault>;
  readonly Provider: TKeyProviderFn<T, HasDefault>;
  readonly create: (...args: Args) => Erreur;
  readonly append: (erreur: Erreur, ...args: Args) => Erreur;
}

export type TTransformErreur<T> = (base: Erreur, provider: IKeyProvider<T>, value: T) => Erreur;

export type TTransformValue<T, Args extends readonly any[]> = (...args: Args) => T;

export const ErreurType = (() => {
  const DEFAULT_TRANSFORM_ERREUR: TTransformErreur<any> = (base, provider) => base.with(provider);

  return {
    defineAdvanced,
    define,
    defineWithDefault,
    defineEmpty,
    defineWithTransform,
  };

  function define<T>(
    name: string,
    transformErreur: TTransformErreur<T> = DEFAULT_TRANSFORM_ERREUR,
  ): IErreurType<T, false, [T]> {
    return defineAdvanced(Key.create<T>(name), (v) => v, transformErreur);
  }

  function defineWithTransform<T, Args extends readonly any[]>(
    name: string,
    transformValue: TTransformValue<T, Args>,
    transformErreur: TTransformErreur<T> = DEFAULT_TRANSFORM_ERREUR,
  ): IErreurType<T, false, Args> {
    return defineAdvanced(Key.create<T>(name), transformValue, transformErreur);
  }

  function defineWithDefault<T>(
    name: string,
    defaultValue: T,
    transformErreur: TTransformErreur<T> = DEFAULT_TRANSFORM_ERREUR,
  ): IErreurType<T, true, [T]> {
    return defineAdvanced(Key.createWithDefault<T>(name, defaultValue), (v) => v, transformErreur);
  }

  function defineEmpty(
    name: string,
    transformErreur: TTransformErreur<undefined> = DEFAULT_TRANSFORM_ERREUR,
  ): IErreurType<undefined, false, []> {
    return defineAdvanced(Key.createEmpty(name), () => undefined, transformErreur);
  }

  function defineAdvanced<T, HasDefault extends boolean, Args extends readonly any[]>(
    key: IKey<T, HasDefault>,
    transformValue: TTransformValue<T, Args>,
    transformErreur: TTransformErreur<T> = DEFAULT_TRANSFORM_ERREUR,
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
