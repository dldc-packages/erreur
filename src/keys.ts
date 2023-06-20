import { createKey, Key, KeyConsumer, KeyProvider, KeyProviderFn } from 'staack';
import type { Erreur } from './Erreur';

export interface ErreurKey<T, HasDefault extends boolean = boolean> extends Key<T, HasDefault> {
  create(value: T): KeyProvider<T, HasDefault>;
  extends(erreur: Erreur, value: T): Erreur;
}

export const MessageKey = createKey<string>({ name: 'Message', defaultValue: '[Erreur]' });

export { createKey, Key, KeyConsumer, KeyProvider, KeyProviderFn };
