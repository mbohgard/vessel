/**
 * @jest-environment jsdom
 */

import { makeStore } from "./";

const initialState = { foo: "bar" };

const store = makeStore("foo", {
  initialState,
});

test("store instance has required methods", () => {
  expect(store).toHaveProperty("subscribe");
  expect(store).toHaveProperty("getState");
  expect(store).toHaveProperty("setState");
});

test("subscribe returns cleanup function", () => {
  const unsubscribe = store.subscribe(() => {});
  expect(unsubscribe()).toBe(true);
});

test("getState returns current state", () => {
  expect(store.getState()).toStrictEqual([
    initialState,
    JSON.stringify(initialState),
  ]);

  store.subscribe(() => {});
  const newState = { foo: "111" };

  store.setState(newState);

  expect(store.getState()).toStrictEqual([newState, JSON.stringify(newState)]);
});

test("callback is called with new state", () => {
  const cb = jest.fn();
  const newState = { foo: "222" };

  store.subscribe(cb);
  store.setState(newState);

  expect(cb).toHaveBeenCalledWith(newState, JSON.stringify(newState));
});

test("unsubscribe will remove callback from listeners", () => {
  const cb = jest.fn();

  const unsubscribe = store.subscribe(cb);
  store.setState({ foo: "333" });
  unsubscribe();
  store.setState({ foo: "444" });

  expect(cb).toHaveBeenCalledTimes(1);
});

test("makeStore won't overwrite existing state if present", () => {
  window.localStorage.setItem("__s-s", "0");
  const s = makeStore("s", {
    initialState: 1,
    namespace: "__s-",
  });

  s.subscribe(() => {});

  expect(s.getState()).toStrictEqual([0, "0"]);
});

test("fire callback on storage event", (done) => {
  const state = "x";
  const stateStr = JSON.stringify(state);
  const s = makeStore("b", {
    initialState: state,
    namespace: "a",
  });
  const cb = jest.fn();
  const event = new StorageEvent("storage", {
    newValue: stateStr,
    key: "ab",
  });

  s.subscribe((...args) => {
    cb(...args);
    expect(cb).toHaveBeenCalledWith(state, stateStr);
    done();
  });

  window.dispatchEvent(event);
});

test("use cache and not query local storage unnecessarily", () => {
  const spy = jest.spyOn(Storage.prototype, "getItem");

  store.getState();
  expect(spy).toHaveBeenCalledTimes(0);

  spy.mockRestore();
});
