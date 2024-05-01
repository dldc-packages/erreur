# 🛑 Erreur

> Type safe errors metadata

## Type safe errors ?

In JavaScript and TypeScript you can throw anything so when you catch something you don't know what it is which make it hard to properly handle errors.

One way to fix this is to create custom classes that extends the Error class

```ts
class HttpError extends Error {
  // ...
}

try {
  // ...
} catch (error) {
  if (error instanceof HttpError) {
    // ...
  }
}
```

This works but it has a few drawbacks:

1. You have to create a new class for each error type, which can be a lot of boilerplate. Also extending the `Error` class requires some tricks to make it work properly (`Object.setPrototypeOf(this, new.target.prototype);`)
2. You can't add data to an existing error. For example, you might catch an HttpError and want to add the url of the request that failed to the error. You can't do that with this approach (at least not in a type-safe way).

To solve these issue, this librairy expose an `ErreurStore` (`erreur` is the french word for error) that let you link any data to an error (using a `WeakMap` internally) as well as some utility functions to create and handle errors.

## Simple example

```ts
import { createErreurStore } from '@dldc/erreur'

const PermissionErrorStore = createErreurStore<{ userId: string }>()
const DeleteErrorStore = createErreurStore<{ postId: string }>()

function detelePost(userId: string, postId: string) {
  try {
    if (userId !== 'admin') {
      return PermissionErrorStore.setAndThrow(new Error('Permission denied'), { userId });
    }
  }
  if (postId === '1') {
    return DeleteErrorStore.setAndThrow('Cannot delete post', { postId })
  }
}
```

## Library example

If you are building a library, you can export an `ErreurStore` instance to let users of your library handle your errors.

```ts
import { doStuff, StuffErreurStore } from 'my-library';

function main() {
  try {
    doStuff();
  } catch (error) {
    if (StuffErreurStore.has(error)) {
      console.log('Stuff error:', stuff);
    } else {
      console.error('Unknown error:', error);
    }
  }
}
```

## Exposing readonly stores

If you want to expose an `ErreurStore` instance to users of your library but you don't want them to be able to set errors, you can expose a readonly version of the store.

```ts
import { createErreurStore } from '@dldc/erreur';

// This store can be used to set errors
const PermissionErrorStore = createErreurStore<{ userId: string }>();

// This store can only be used to read errors
export const ReadonlyPermissionErrorStore = PermissionErrorStore.asReadonly;
```

## Using union types

Instead of creating multiple stores, you can use union types to match multiple errors at once.

```ts
import { createErreurStore } from '@dldc/erreur';

export type TDemoErreurData =
  | { kind: 'FirstErrorKind'; someData: string }
  | { kind: 'SecondErrorKind'; someOtherData: number };

const DemoErreurInternal = createErreurStore<TDemoErreurData>();

// only expose a readonly version of the store
export const DemoErreur = DemoErreurInternal.asReadonly;

// exposing functions to create errors

export function createFirstError(someData: string) {
  return DemoErreurInternal.setAndReturn(new Error('First error'), { kind: 'FirstErrorKind', someData });
}

export function createSecondError(someOtherData: number) {
  return DemoErreurInternal.setAndReturn(new Error('Second error'), { kind: 'SecondErrorKind', someOtherData });
}
```

**Note**: Keep in mind that you can `set` only once per error / store. If you need to set multiple errors you will need to create multiple stores.

## Matching multiple stores at once

If you have multiple stores and you want to match any of them, you can use `if else` statements but we provide 2 utility functions to make it easier.

### `matchFirstErreur`

```ts
import { matchFirstErreur } from '@dldc/erreur';

function handleError(error: Error) {
  // This will return the data of the first store that has the error
  const result = matchFirstErreur(error, [PermissionErrorStore, InternalErrorStore, NotFoundErrorStore]);
}
```

### `matchErreurs`

```ts
function handleError(error: Error) {
  const result = matchFirstErreur(matchErreurs, {
    first: PermissionErrorStore,
    second: InternalErrorStore,
    third: NotFoundErrorStore,
  });
  // result is an object with the same keys and the matched data if any
  if (result.first) {
    // ...
  } else if (result.second) {
    // ...
  } else if (result.third) {
    // ...
  }
}
```

## Creating a store with no data

If you don't need to store any data with your errors, you can use the `createVoidErreurStore` function.

```ts
import { createVoidErreurStore } from '@dldc/erreur';

const NotFoundErrorStore = createVoidErreurStore();
```

It works the same way as the regular `ErreurStore` but you don't need to pass any data when setting an error and the `get` method will return `true` if the error is set.
