import { createKey, Key, KeyConsumer, KeyProvider, KeyProviderFn } from 'staack';
import { Erreur } from './Erreur';

export interface ErreurType<T, HasDefault extends boolean = boolean> {
  readonly Consumer: KeyConsumer<T, HasDefault>;
  readonly Provider: KeyProviderFn<T, HasDefault>;
  readonly create: (value: T) => Erreur;
  readonly extends: (erreur: Erreur | null, value: T) => Erreur;
}

export const MessageKey = createKey<string>({ name: 'Message', defaultValue: '[Erreur]' });
export const StackKey = createKey<string>({ name: 'Stack' });

export { createKey, Key, KeyConsumer, KeyProvider, KeyProviderFn };

export function createErreurType<T>(options: { name: string; help?: string; defaultValue: T }): ErreurType<T, true>;
export function createErreurType<T>(options: { name: string; help?: string }): ErreurType<T, false>;
export function createErreurType<T>(options: {
  name: string;
  help?: string;
  defaultValue?: T;
}): ErreurType<T, boolean> {
  const Key = createKey({ name: options.name, defaultValue: options.defaultValue }) as Key<T, boolean>;

  return {
    Consumer: Key.Consumer,
    Provider: Key.Provider,
    create,
    extends: extendsErreur,
  };

  function create(value: T): Erreur {
    return extendsErreur(null, value);
  }

  function extendsErreur(erreur: Erreur | null, value: T): Erreur {
    const parent = erreur || Erreur.create();
    return parent.with(Key.Provider(value));
  }
}
