import { expect } from "$std/expect/mod.ts";
import {
  createErreurStore,
  createVoidErreurStore,
  matchErreurs,
  matchFirstErreur,
} from "../mod.ts";

Deno.test("Gist", () => {
  const store1 = createErreurStore<number>();
  const store2 = createErreurStore<string>();
  const store3 = createVoidErreurStore();

  const err = new Error("test");
  store1.set(err, 1);

  const data = matchFirstErreur(err, [store2, store1]);
  expect(data).toBe(1);

  const matched = matchErreurs(err, { store1, store2, store3 });
  expect(matched).toEqual({ store1: 1, store2: undefined, store3: undefined });
});

Deno.test("basic matchErreur", () => {
  const store1 = createErreurStore<number>();
  const store2 = createErreurStore<string>();
  const store3 = createVoidErreurStore();

  const err = new Error("test");
  store1.set(err, 1);

  const matched = matchErreurs(err, { store1, store2, store3 });
  expect(matched).toEqual({ store1: 1, store2: undefined, store3: undefined });
});
