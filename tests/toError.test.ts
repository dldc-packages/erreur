import { expect, test } from "vite-plus/test";
import { toError } from "@dldc/erreur";

test("return error as is", () => {
  const error = new Error("Error message");
  const err = toError(error);
  expect(err).toBe(error);
});

test("create error from text", () => {
  const error = "Error message";
  const err = toError(error);
  expect(err).toBeInstanceOf(Error);
  expect(err.message).toBe(error);
});

test("create error from object with message property", () => {
  const error = { message: "Error message" };
  const err = toError(error);
  expect(err).toBeInstanceOf(Error);
  expect(err.message).toBe(`ErrorFromObject: Error message`);
});

test("create error from object with message and cause property", () => {
  const error = { message: "Error message", cause: new Error("Cause") };
  const err = toError(error);
  expect(err).toBeInstanceOf(Error);
  expect(err.message).toBe(`ErrorFromObject: Error message`);
  expect(err.cause).toBe(error.cause);
});

test("Error from number", () => {
  const error = 42;
  const err = toError(error);
  expect(err).toBeInstanceOf(Error);
  expect(err.message).toBe(`ErrorFromNumber: 42`);
});

test("Error from boolean", () => {
  const error = true;
  const err = toError(error);
  expect(err).toBeInstanceOf(Error);
  expect(err.message).toBe(`ErrorFromBoolean: true`);
});

test("Error from null", () => {
  const error = null;
  const err = toError(error);
  expect(err).toBeInstanceOf(Error);
  expect(err.message).toBe(`ErrorFromNull`);
});

test("Error from undefined", () => {
  const error = undefined;
  const err = toError(error);
  expect(err).toBeInstanceOf(Error);
  expect(err.message).toBe(`ErrorFromUndefined`);
});

test("Error from object", () => {
  const error = { a: 1, b: "test" };
  const err = toError(error);
  expect(err).toBeInstanceOf(Error);
  expect(err.message).toBe(`ErrorFromObject: {"a":1,"b":"test"}`);
});

test("Error from unserializable object", () => {
  const error = {
    toJSON: () => {
      throw new Error("test");
    },
  };
  const err = toError(error);
  expect(err).toBeInstanceOf(Error);
  expect(err.message).toBe(`ErrorFromObject: [object]`);
});
