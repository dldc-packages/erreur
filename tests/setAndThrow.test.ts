import { expect } from "$std/expect/expect.ts";
import { createErreurStore } from "../mod.ts";

const store = createErreurStore<number>();

Deno.test("should set the error and throw it", () => {
  let err: Error;
  expect(() => {
    try {
      store.setAndThrow("test", 42);
    } catch (e) {
      // deno-lint-ignore no-explicit-any
      err = e as any;
      throw e;
    }
  }).toThrow("test");
  expect(store.has(err!)).toBe(true);
  expect(store.get(err!)).toBe(42);
});
