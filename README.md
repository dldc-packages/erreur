# 🛑 Erreur

> Type safe custom errors

## Usage

This library allows you to create custom errors with type safety. It's composed of two classes:

- `Erreur`: The custom error class.
- `ErreursMap`: A class to help you create a set of custom errors.

### `Erreur`

The `Erreur` class extends the base `Error` class and adds the following properties:

- `kind`: A string that represents the kind of error.
- `infos`: An object that contains the `kind`, `message` and any additional information about the error

```typescript
type MyErreurInfos = {
  kind: 'MyErreur';
  message: string;
  num: number;
};

const err = new Erreur<MyErreurInfos>({
  kind: 'MyErreur',
  message: 'Something went wrong',
  num: 42,
});

expect(err.kind).toBe('MyErreur');
expect(err.infos).toEqual({
  kind: 'MyErreur',
  message: 'Something went wrong',
  num: 42,
});
```

### `ErreursMap`

The `ErreursMap` class allow you to define and manipulate a set of `Erreur`s.

To create an `ErreursMap`, create a new instance with an object as parameter. Each property of the object should be a function that take any number of arguments and return an object with `message` and any additional information about the error.

```typescript
const UserErreurs = new ErreursMap({
  UnknownError: (error: Error) => ({ message: error.message, error }),
  UserNotFound: (userId: string) => ({ message: 'User not found', userId }),
  UserAlreadyExists: (username: string) => ({ message: 'User already exists', username }),
});
```

Once the `ErreursMap` created you can use it to create `Erreur` instances with `UserErreurs.create.[ErrorKind](...args)`:

```typescript
const err = UserErreurs.create.UserAlreadyExists('paul-bocuse');

// err is an instance of Erreur
```

<!-- TODO: UserErreurs.is, UserErreurs.wrap, UserErreurs.wrapAsync -->
