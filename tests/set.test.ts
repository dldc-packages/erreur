import { expect } from "$std/expect/expect.ts";
import { createErreurStore } from "../mod.ts";

Deno.test("should set the error", () => {
  const store = createErreurStore<number>();
  const err = new Error("test");
  store.set(err, 42);
  expect(store.has(err)).toBe(true);
  expect(store.get(err)).toBe(42);
});

Deno.test("throw if error already exists", () => {
  const store = createErreurStore<number>();
  const err = new Error("test");
  store.set(err, 42);
  expect(() => store.set(err, 42)).toThrow("Error already exists in store");
});

Deno.test("throw if error is not an instance of Error", () => {
  const store = createErreurStore<number>();
  // deno-lint-ignore no-explicit-any
  expect(() => store.set("test" as any, 42)).toThrow(
    "Error should be an instance of Error",
  );
});
