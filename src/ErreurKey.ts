import type { IKeyBase, IKeyConsumer, TArgsBase, TKeyProviderFn } from '@dldc/stack';
import { Key } from '@dldc/stack';
import type { Erreur } from './Erreur';

export interface IErreurKeyBase<
  T,
  HasDefault extends boolean,
  ProviderArgs extends TArgsBase,
  CreateArgs extends TArgsBase,
> {
  Consumer: IKeyConsumer<T, HasDefault>;
  Provider: TKeyProviderFn<T, HasDefault, ProviderArgs>;
  create: (...args: CreateArgs) => Erreur;
}

export type TErreurKey<T, HasDefault extends boolean, CreateArgs extends TArgsBase> = IErreurKeyBase<
  T,
  HasDefault,
  [value: T],
  CreateArgs
>;

export type TVoidErreurKey<HasDefault extends boolean, CreateArgs extends TArgsBase> = IErreurKeyBase<
  undefined,
  HasDefault,
  [],
  CreateArgs
>;

export type TCreate<T, ProviderArgs extends TArgsBase, CreateArgs extends TArgsBase> = (
  provider: TKeyProviderFn<T, boolean, ProviderArgs>,
  ...args: CreateArgs
) => Erreur;

export type TDefine<T, HasDefault extends boolean, ProviderArgs extends TArgsBase> = <CreateArgs extends TArgsBase>(
  create: TCreate<T, ProviderArgs, CreateArgs>,
) => IErreurKeyBase<T, HasDefault, ProviderArgs, CreateArgs>;

export const ErreurKey = (() => {
  return {
    define,
    defineWithDefault,
    defineEmpty,
  };

  function define<T>(name: string): TDefine<T, false, [value: T]> {
    return defineInternal(Key.create(name));
  }

  function defineWithDefault<T>(name: string, defaultValue: T): TDefine<T, true, [value: T]> {
    return defineInternal(Key.createWithDefault(name, defaultValue));
  }

  function defineEmpty(name: string): TDefine<undefined, false, []> {
    return defineInternal(Key.createEmpty(name));
  }

  function defineInternal<T, HasDefault extends boolean, ProviderArgs extends TArgsBase>(
    key: IKeyBase<T, HasDefault, ProviderArgs>,
  ): TDefine<T, HasDefault, ProviderArgs> {
    return <CreateArgs extends TArgsBase>(create: TCreate<T, ProviderArgs, CreateArgs>) => {
      return {
        Consumer: key.Consumer,
        Provider: key.Provider as any,
        create: ((...args: CreateArgs) => create(key.Provider as any, ...args)) as any,
      };
    };
  }
})();
