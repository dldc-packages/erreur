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

The `withTransform` method of an `ErreurDeclaration` allows you to create a clone of the declaration that take custom parameters and transform them into the data of the error. Note that the original declaration is not modified and both declarations can be used to create errors (they are the same "key").

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

You can also pass a `ErreurDeclaration` as second parameter to check if the `Erreur` contains the declaration data.

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

#### Error `cause` and `erreurCause`

#### `warp` and `wrapAsync`

Wrap a function to make sure it either returns a value or throws an `Erreur` instance.

#### `resolve` and `resolveAsync`

Smae as `wrap` and `wrapAsync` but returns the `Erreur` instance instead of throwing it.
