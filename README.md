# 🛑 Erreur

> Type safe custom errors

## Type safe custom errors ?

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

1. You have to create a new class for each error type, which can be a lot of boilerplate. Also extending the `Error` class requires some tricks to make it work properly.
2. You can't add data to an existing error. For example, you might catch an HttpError and want to add the url of the request that failed to the error. You can't do that with this approach.

To solve these issue, this librairy expose a single custom error class called `Erreur` (error in french) that extends the native `Error` class. This class can contain data but in order to ensure type safety, you cannot access this data directly. Instead, you must use a _key_ that can be created using the `Key.define()` function.

_Note_ Internally, the `Erreur` class uses [`etienne-dldc/staack`](https://github.com/etienne-dldc/staack) to store the data.

Here is a simple example:

```ts
import { ErreurType, Erreur } from '@dldc/erreur';

// Define a key with the type of the datat (`number` in this case)
const StatusCodeKey = ErreurType.define<number>('StatusCode');

// Create a new Erreur with the number value
const err = StatusCodeKey.create(500);
// you can also extends en existing error to add the value
const errBase = Erreur.create();
const err1 = StatusCodeKey.append(errBase, 500);

// err, errBase and err1 are all Erreur instances
expect(err).toBeInstanceOf(Erreur);
expect(errBase).toBeInstanceOf(Erreur);
expect(err1).toBeInstanceOf(Erreur);

// Get data from the Erreur
const statusCode = err.get(StatusCodeKey.Consumer);
expect(statusCode).toBe(500);
```

## API

### `Erreur.create`

Create a new `Erreur` instance. You can optionally pass a message:

```ts
const err1 = Erreur.create();
const err2 = Erreur.create('Something went wrong');
```

_Note_: **Do not** use `new Erreur()` to create an `Erreur` instance, it will not work properly.

### `Erreur.fromError`

Create a new `Erreur` instance from an existing `Error` instance, it will reuse the message of the error:

```ts
const err1 = Erreur.fromError(new Error('Something went wrong'));
```

### `Erreur.fromUnknown`

Create an error from any value, if the value is an `Error` instance it will call `Erreur.fromError`, otherwise it the value is converted to a string and used as the message of the error:

```ts
const err1 = Erreur.fromUnknown(anyValue);
```

### `erreur.with(...providers)`

Use the `with` method to add data to an `Erreur` instance. This method accepts any number of `Provider` declaration and returns a new `Erreur` instance:

```ts
const err1 = Erreur.create().with(MyErrorKey.Provider('Hello'));
```

### `erreur.get(consumer)`

### `erreur.getOrFail(consumer)`

### `erreur.has(consumer)`

### `Erreur.is`

Check if a value is an `Erreur` instance:

```ts
const err = Erreur.create();
const isErr = Erreur.is(err); // true
```

_Note: this is the same as using `instanceof Erreur`_

### `Erreur.wrap` and `Erreur.wrapAsync`

Wrap a function to make sure it either returns a value or throws an `Erreur` instance. Not that this function does not care about what is inside the `Erreur` instance, it only checks that it is an instance of `Erreur`.

### `Erreur.resolve` and `Erreur.resolveAsync`

Same as `Erreur.wrap` and `Erreur.wrapAsync` but returns the `Erreur` instance instead of throwing it.

### Overriding the message

You can override the message of an `Erreur` using the `Erreur.MessageKey` key:

```ts
const err1 = Erreur.create('Something went wrong');
const err2 = err1.with(Erreur.MessageKey.Provider('Something went really wrong'));
// A shortcut is also available
const err3 = err2.withMessage('Something went really wrong');
```

## Recipes

### Using Union types

You can handle many errors with a single key using union types:

```ts
type FetchError =
  | { type: 'NetworkError'; error: any }
  | { type: 'ParseError'; content: string }
  | { type: 'ResponseNotOk'; response: any };

const FetchErrorType = createErrorType<FetchError>({ name: 'FetchError' });
```
