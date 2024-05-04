import { expect } from "$std/expect/expect.ts";
import { toError } from "../mod.ts";

Deno.test("return error as is", () => {
  const error = new Error("Error message");
  const err = toError(error);
  expect(err).toBe(error);
});

Deno.test("create error from text", () => {
  const error = "Error message";
  const err = toError(error);
  expect(err).toBeInstanceOf(Error);
  expect(err.message).toBe(error);
});

Deno.test("create error from object with message property", () => {
  const error = { message: "Error message" };
  const err = toError(error);
  expect(err).toBeInstanceOf(Error);
  expect(err.message).toBe(`ErrorFromObject: Error message`);
});

Deno.test("create error from object with message and cause property", () => {
  const error = { message: "Error message", cause: new Error("Cause") };
  const err = toError(error);
  expect(err).toBeInstanceOf(Error);
  expect(err.message).toBe(`ErrorFromObject: Error message`);
  expect(err.cause).toBe(error.cause);
});

Deno.test("Error from number", () => {
  const error = 42;
  const err = toError(error);
  expect(err).toBeInstanceOf(Error);
  expect(err.message).toBe(`ErrorFromNumber: 42`);
});

Deno.test("Error from boolean", () => {
  const error = true;
  const err = toError(error);
  expect(err).toBeInstanceOf(Error);
  expect(err.message).toBe(`ErrorFromBoolean: true`);
});

Deno.test("Error from null", () => {
  const error = null;
  const err = toError(error);
  expect(err).toBeInstanceOf(Error);
  expect(err.message).toBe(`ErrorFromNull`);
});

Deno.test("Error from undefined", () => {
  const error = undefined;
  const err = toError(error);
  expect(err).toBeInstanceOf(Error);
  expect(err.message).toBe(`ErrorFromUndefined`);
});

Deno.test("Error from object", () => {
  const error = { a: 1, b: "test" };
  const err = toError(error);
  expect(err).toBeInstanceOf(Error);
  expect(err.message).toBe(`ErrorFromObject: {"a":1,"b":"test"}`);
});

Deno.test("Error from unserializable object", () => {
  const error = {
    toJSON: () => {
      throw new Error("test");
    },
  };
  const err = toError(error);
  expect(err).toBeInstanceOf(Error);
  expect(err.message).toBe(`ErrorFromObject: [object]`);
});
