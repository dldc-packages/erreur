import { ErreurType, GetMessage } from './ErreurType.ts';

/**
 * If the data is an object with a message property, it will be used as the error message
 * Otherwise, the error message will be the name of the error and the data as a JSON string
 */
export const DEFAULT_MESSAGE: GetMessage<any> = (data, name) => {
  if (data && 'message' in data && typeof data.message === 'string') {
    return data.message;
  }
  if (data === undefined) {
    return name;
  }
  return `${name} ${JSON.stringify(data)}`;
};

/**
 * Create
 */

export function createType<Data>(
  name: string,
  message: string | GetMessage<Data> = ErreurType.DEFAULT_MESSAGE
): ErreurType<Data> {
  const getMessageResolved = typeof message === 'string' ? () => message : message;
  return new ErreurType<Data>(null, name, (data: Data) => data, getMessageResolved);
}

export function createEmptyType(name: string, message?: string | GetMessage<undefined>): ErreurType<undefined, []> {
  return createTypeWithTransform(name, () => undefined, message);
}

export function createTypeWithTransform<Data, Params extends readonly any[]>(
  name: string,
  transform: (...params: Params) => Data,
  message?: string | GetMessage<Data>
): ErreurType<Data, Params> {
  return ErreurType.create<Data>(name, message).withTransform(transform);
}

export type CreatorsBase = Record<string, (...args: any[]) => any>;

export type ErreursFromCreators<Creators extends CreatorsBase> = {
  [K in keyof Creators]: ErreurType<ReturnType<Creators[K]>, Parameters<Creators[K]>>;
};

export function createManyTypes<Creators extends CreatorsBase>(creators: Creators): ErreursFromCreators<Creators> {
  const res: any = {};
  for (const key of Object.keys(creators)) {
    res[key] = createTypeWithTransform(key, creators[key]);
  }
  return res;
}

export function createManyTypesFromData<Errors extends Record<string, any>>() {
  return <Creators extends { [K in keyof Errors]: (...args: any[]) => Errors[K] }>(
    creators: Creators
  ): ErreursFromCreators<Creators> => {
    return createManyTypes(creators);
  };
}
