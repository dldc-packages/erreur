# 🛑 Erreur

> Type safe custom errors

## Type safe custom errors ?

This librairy expose a way to define and manipulate custom errors in a type safe way.

To acheive this, it uses a class called `Erreur` (error in french) that extends the native `Error` class. This class can contain data but in order to ensure type safety, you cannot access this data directly. Instead, you must use a declaration that can be created using the `Erreur.declare` static method.

Here is a simple example:

```ts
import { Erreur } from 'erreur';

// Declare a new error with a type and a name
const MyError = Erreur.declare<{ message: string }>('MyError');

// Use the declaration to create a new error
const error = MyError.create({ message: 'Hello world' });

// Use the declaration to extract the data from the error
const matched = MyError.match(error);
// matched has type { message: string } | null
```

## API

### Declaring errors

#### `Erreur.declare`

The basic way to declare an error is to use the `Erreur.declare` static method. This method takes a type and a name as parameters and returns a declaration.

```ts
const MyError = Erreur.declare<{ message: string }>('MyError');
```

#### Transforms

The `withTransform` method of an `ErreurType` allows you to create a clone of the declaration that take custom parameters and transform them into the data of the error. Note that the original declaration is not modified and both declarations can be used to create errors (they are the same "key").

```ts
const MyError = Erreur.declare<{ message: string }>('MyError');
const MyErrorWithTransform = MyError.withTransform((message: string) => ({ message }));

const err1 = MyError.create({ message: 'Hello world' });
const err2 = MyErrorWithTransform.create('Hello world');

// MyError.match(err1) === MyErrorWithTransform.match(err2) === { message: 'Hello world' }
```

You can also use `Erreur.declareWithTransform` to declare an error and apply a transform at the same time.

```ts
const MyError = Erreur.declareWithTransform<{ message: string }>('MyError', (message: string) => ({
  message,
}));

// TS will infer the type of the transform
const MyError = Erreur.declareWithTransform('MyError', (message: string) => ({ message }));
```

#### Custom message

By default the `Erreur` instance will have a message that is the name of the error followed by the data stringified as JSON.

You can override this behavior by passing a custom message as the second parameter of the `Erreur.declare` method.

```ts
const MyError = Erreur.declare<{ count: number }>('MyError', (data) => `Count is ${data.count}`);
```

You can also use the `withMessage` method of an `ErreurType` to create a clone of the declaration with a custom message.

```ts
const MyError = Erreur.declare<{ count: number }>('MyError');
const MyErrorWithMessage = MyError.withMessage((data) => `Count is ${data.count}`);
```

#### Decalaring multiple errors

The `Erreur.declareMany` let you declare multiple errors at the same time. It takes an object as parameter where the keys are the names of the errors and the values are transform functions.

```ts
const { MyError, MyOtherError } = Erreur.declareMany({
  MyError: (message: string) => ({ message }),
  MyOtherError: (num: number) => ({ num }),
});
```

You can also use the `Erreur.declareManyFromTypes` to declare multiple errors from a single type.

```ts
interface MyErrors {
  NumError: number;
  FatalError: { message: string };
}

// Note that declareManyFromTypes take no parameter and return a `declareMany` function
const { NumError, FatalError } = Erreur.declareManyFromTypes<MyErrors>()({
  NumError: (num: number) => num,
  FatalError: (message: string) => ({ message }),
});
```

#### `is`, `isOneOf` and `isOneOfObj`

The `Erreur.is` static method can be used to check if an value is an `Erreur`.

You can also pass a `ErreurType` as second parameter to check if the `Erreur` contains the declaration data.

```ts
const NumErreur = Erreur.declare<number>('NumErreur');
const BoolErreur = Erreur.declare<boolean>('BoolErreur');

function handleError(err: unknown) {
  if (Erreur.is(err)) {
    // err is an Erreur
  }

  if (Erreur.is(err, NumErreur)) {
    // err is an Erreur and contains the data of NumErreur
  }

  if (Erreur.isOneOf(err, [NumErreur, BoolErreur])) {
    // err is an Erreur and contains the data of either NumErreur or BoolErreur
  }

  if (Erreur.isOneOfObj(err, { NumErreur, BoolErreur })) {
    // err is an Erreur and contains the data of either NumErreur or BoolErreur
  }
}
```

#### `match`, `matchObj` and `matchObjOrThrow`

This function is similar to `is` but instead of returning a boolean, it returns the data of the error if it matches the declaration.

Note that `matchObj` return an object with `{ kind: string, data: T }` where `kind` is the key of the declaration and `data` is the data of the error.

```ts
const NumErreur = Erreur.declare<number>('NumErreur');
const BoolErreur = Erreur.declare<boolean>('BoolErreur');

function handleError(err: unknown) {
  const matched = Erreur.match(err, NumErreur);
  // matched has type number | null

  const matchedObj = Erreur.matchObj(err, { NumErreur, BoolErreur });
  // matchedObj has type { kind: 'NumErreur', data: number } | { kind: 'BoolErreur', data: boolean } | null
}
```

#### Erreur `cause` and `erreurCause`

Erreur supports the cause property of the native `Error` class. This property can be used to store the original error that caused the current error.
With Erreur this `cause` must be an `Erreur` instance, you can access the `erreurCause` property to get the correct typing.

To set the cause of an Erreur, use the `createWithCause` method of the declaration.

```ts
const SubErreur = Erreur.declare<{ message: string }>('SubErreur');

const MyErreur = Erreur.declare<{ message: string }>('MyErreur');

const subError = SubErreur.create({ message: 'Hello world' });
const error = MyErreur.createWithCause({ message: 'Hello world' }, subError);

// error.cause === subError
// error.erreurCause === subError
```

#### `warp` and `wrapAsync`

Wrap a function to make sure it either returns a value or throws an `Erreur` instance. Not that this function does not care about what is inside the `Erreur` instance, it only checks that it is an instance of `Erreur`.

#### `resolve` and `resolveAsync`

Same as `wrap` and `wrapAsync` but returns the `Erreur` instance instead of throwing it.

## Exposing Erreurs

One of the main goal of Erreur is to allow you to expose your errors to the outside world without creating one `Error` class for each error.

Say you want to build a wrapper around [`fetch`](https://developer.mozilla.org/fr/docs/Web/API/Fetch_API). You want to do some custom validation on the response and throw an error if the response is not valid. Rather than throwing random `Errors` or creating a new `Error` class for each error, you can use Erreur to create collections of Erreurs your wrapper can throw.

```ts
export const BetterFetchErreurs = Erreur.declareMany({
  ResponseNotOK: (response: Response) => ({ response }),
  InvalidBody: () => null,
});

export async function betterFetch() {
  // ...
  if (!response.ok) {
    throw BetterFetchErreurs.ResponseNotOK.create(response);
  }
}
```

Now when someone uses your wrapper, they can catch the error and extract the data from it.

```ts
import { betterFetch, BetterFetchErreurs } from './better-fetch';

try {
  await betterFetch();
} catch (err) {
  if (Erreur.is(err, BetterFetchErreurs.ResponseNotOK)) {
    // response is not ok
  }
}
```

In fact we probably want to hanlde all the possible errors our wrapper can throw, so we can use `Erreur.matchObj` to check if the error is one of the errors in our collection.

```ts
import { betterFetch, BetterFetchErreurs } from './better-fetch';

try {
  await betterFetch();
} catch (err) {
  const matched = Erreur.matchObj(err, BetterFetchErreurs);
  if (matched) {
    // { kind: 'ResponseNotOK', data: { response: Response } } | { kind: 'InvalidBody', data: null }
  }
}
```

You can also "combine" multiple collections of errors into a single one, for example you might have a `validator` function that expose its own errors:

```ts
try {
  const data = await betterFetch();
  return validator(data);
} catch (err) {
  const matched = Erreur.matchObj(err, {
    ...BetterFetchErreurs,
    ...ValidatorErreurs,
  });
  if (matched) {
    // Here we can hendle the error depending on the kind
    // { kind: 'ResponseNotOK', data: { response: Response } } | { kind: 'InvalidBody', data: null } | { kind: 'InvalidEmail', data: string }
  }
  // Error not handled
  throw err;
}
```
