# 🛑 Erreur

> Type safe custom errors

## Type safe custom errors ?

This librairy expose a way to define and manipulate custom errors in a type safe way.

To acheive this, it uses a class called `Erreur` (error in french) that extends the native `Error` class. This class can contain data but in order to ensure type safety, you cannot access this data directly. Instead, you must use a declaration that can be created using the `createKey`.

Internally, the `Erreur` class uses [`etienne-dldc/staack`](https://github.com/etienne-dldc/staack) to store the data.

Here is a simple example:

```ts
import { createKey, Erreur } from 'erreur';

// Create a new key
const StatusCodeKey = createKey<number>({ name: 'StatusCode' });

// Create a new Erreur
const err = Erreur.create('Something went wrong');

// Add data to the Erreur
const errWithStatusCode = err.with(StatusCodeKey.Provider(500));

// Get data from the Erreur
const statusCode = errWithStatusCode.get(StatusCodeKey.Consumer);
```

## API

### `Erreur.create`

Create a new `Erreur` instance. You can optionally pass a message:

```ts
const err1 = Erreur.create();
const err2 = Erreur.create('Something went wrong');
```

### `erreur.with(...providers)`

Use the `with` method to add data to an `Erreur` instance. This method accepts any number of `Provider` declaration and returns a new `Erreur` instance:

```ts
const MyKey = createKey<string>({ name: 'MyKey' });

const err1 = Erreur.create().with(MyKey.Provider('Hello'));
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

### Dynamic message

For a more advanced usage, you can use the `Erreur.GetMessageKey` (or `erreur.withGetMessage`) key to provide a function that will be called when the message is accessed, this function will receive the `Erreur` instance as an argument:

```ts
const StatusCodeKey = createKey<number>({ name: 'StatusCode', defaultValue: 500 });

const HttpErreur = Erreur.create().withGetMessage((err) => {
  return `Something went wrong: ${err.get(StatusCodeKey.Consumer)}`;
});

const NotFoundErreur = HttpErreur.with(StatusCodeKey.Provider(404));

console.log(NotFoundErreur.message); // Something went wrong: 404
```

## Recipes

### Using Union types

You can handle many errors with a single key using union types:

```ts
type FetchError =
  | { type: 'NetworkError'; error: any }
  | { type: 'ParseError'; content: string }
  | { type: 'ResponseNotOk'; response: any };

const FetchErrorKey = createKey<FetchError>({ name: 'FetchError' });
```
