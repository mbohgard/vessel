/**
 * @jest-environment jsdom
 */

import { createStore } from "./";
import { createStateRecord } from "./storage";

const initialState = { foo: "bar" };

const store = createStore("foo", {
  initialState,
});

it("store instance has required methods", () => {
  expect(store).toHaveProperty("subscribe");
  expect(store).toHaveProperty("getState");
  expect(store).toHaveProperty("setState");
});

it("subscribe returns cleanup function", () => {
  const unsubscribe = store.subscribe(() => {});
  expect(unsubscribe()).toBe(true);
});

it("getState returns current state", () => {
  expect(store.getState()).toStrictEqual(initialState);

  store.subscribe(() => {});
  const newState = { foo: "111" };

  store.setState(newState);

  expect(store.getState()).toStrictEqual(newState);
});

it("callback is called with new state", () => {
  const cb = jest.fn();
  const newState = { foo: "222" };

  store.subscribe(cb);
  store.setState(newState);

  expect(cb).toHaveBeenCalledWith(newState);
});

it("unsubscribe will remove callback from listeners", () => {
  const cb = jest.fn();

  const unsubscribe = store.subscribe(cb);
  store.setState({ foo: "333" });
  unsubscribe();
  store.setState({ foo: "444" });

  expect(cb).toHaveBeenCalledTimes(1);
});

it("makeStore won't overwrite existing state if present", () => {
  const namespace = String(Date.now());

  window.localStorage.setItem(
    `${namespace}store`,
    JSON.stringify(createStateRecord(0, 1000))
  );
  const s = createStore("store", {
    initialState: 1,
    namespace,
  });

  s.subscribe(() => {});
  expect(s.getState()).toStrictEqual(0);
});

it("fire callback on storage event", (done) => {
  const namespace = String(Date.now());
  const s = createStore("store", {
    initialState: "x",
    namespace,
  });
  const cb = jest.fn();
  const newState = "y";

  const event = new StorageEvent("storage", {
    newValue: JSON.stringify(createStateRecord(newState, 1000)),
    key: `${namespace}x`,
  });

  s.subscribe((...args) => {
    cb(...args);
    expect(cb).toHaveBeenCalledWith(newState);
    done();
  });

  window.dispatchEvent(event);
});

it("use cache and not query local storage unnecessarily", () => {
  const spy = jest.spyOn(Storage.prototype, "getItem");

  store.getState();
  expect(spy).toHaveBeenCalledTimes(0);

  spy.mockRestore();
});
