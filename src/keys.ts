import { createKey, Key, KeyConsumer, KeyProvider, KeyProviderFn } from 'staack';
import type { Erreur } from './Erreur';

export const MessageKey = createKey<string>({ name: 'Message' });

export type GetMessage = (self: Erreur) => string | null;

export const DEFAULT_GET_MESSAGE: GetMessage = (context) => {
  return context.get(MessageKey.Consumer) ?? '[Erreur]';
};

export const GetMessageKey = createKey<GetMessage>({ name: 'GetMessage', defaultValue: DEFAULT_GET_MESSAGE });

export { createKey, Key, KeyConsumer, KeyProvider, KeyProviderFn };
