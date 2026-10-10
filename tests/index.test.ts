import { expect, test } from "vite-plus/test";
import {
  createErreurStore,
  createVoidErreurStore,
  matchErreurs,
  matchFirstErreur,
} from "@dldc/erreur";

test("Gist", () => {
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

test("basic matchErreur", () => {
  const store1 = createErreurStore<number>();
  const store2 = createErreurStore<string>();
  const store3 = createVoidErreurStore();

  const err = new Error("test");
  store1.set(err, 1);

  const matched = matchErreurs(err, { store1, store2, store3 });
  expect(matched).toEqual({ store1: 1, store2: undefined, store3: undefined });
});
