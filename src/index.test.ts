/**
 * @jest-environment jsdom
 */

import { createStore, makeCreateStore } from "./";
import { createStateRecord, storage } from "./storage";

const initialState = { foo: "bar" };

const store = createStore("foo", {
  initialState,
});

const wait = (ms = 1000) => new Promise((res) => setTimeout(res, ms));
const ns = () => String(Date.now());

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

it("createStore WON'T overwrite existing state if present", () => {
  const namespace = ns();

  window.localStorage.setItem(
    `${namespace}store`,
    JSON.stringify(createStateRecord(0, 1000))
  );
  const s = createStore("store", {
    initialState: 1,
    namespace,
  });

  expect(s.getState()).toStrictEqual(0);
});

it("createStore WILL overwrite existing state if present", () => {
  const namespace = ns();

  window.localStorage.setItem(
    `${namespace}store`,
    JSON.stringify(createStateRecord(0, 1000))
  );
  const s = createStore("store", {
    initialState: 1,
    namespace,
    overwriteExisting: true,
  });

  expect(s.getState()).toStrictEqual(1);
});

it("fire callback on storage event", (done) => {
  const namespace = ns();
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

it("remove data from local storage if expired time has passed", async () => {
  const spy = jest.spyOn(Storage.prototype, "removeItem");

  const namespace = ns();
  const s = createStore("store", {
    initialState: "x",
    namespace,
    ttl: 0.0001, // hours = 360ms
  });

  await wait(500);

  const state = s.getState();
  s.getState();

  expect(spy).toHaveBeenCalledTimes(1);
  expect(window.localStorage.getItem(`${namespace}store`)).toBeNull();
  expect(state).toBeNull();

  spy.mockRestore();
});

it("doesn't touch local storage if persistent is set to false", () => {
  const g = jest.spyOn(Storage.prototype, "getItem");
  const s = jest.spyOn(Storage.prototype, "setItem");
  const r = jest.spyOn(Storage.prototype, "removeItem");

  const store = createStore("store", {
    initialState: "x",
    persistent: false,
  });

  store.getState();
  store.setState("y");

  expect(g).toHaveBeenCalledTimes(0);
  expect(s).toHaveBeenCalledTimes(0);
  expect(r).toHaveBeenCalledTimes(0);
  expect(store.getState()).toBeNull();

  g.mockRestore();
  s.mockRestore();
  r.mockRestore();
});

it("makeCreateStore will set correct defaults", async () => {
  const g = jest.spyOn(Storage.prototype, "getItem");
  const r = jest.spyOn(Storage.prototype, "removeItem");

  const createPersistent = makeCreateStore({
    namespace: "persistent",
    ttl: 0.0001,
  });
  const persistentStore = createPersistent("store", { initialState: "x" });

  const createLocal = makeCreateStore({ persistent: false });
  const localStore = createLocal("store", { initialState: "x" });

  localStore.setState("y");

  expect(persistentStore.getState()).toBe("x");
  expect(storage.getItem("persistentstore")?.state).toBe("x");
  expect(localStore.getState()).toBe("y");

  await wait(500);

  expect(persistentStore.getState()).toBeNull();

  expect(g).toHaveBeenCalledTimes(2);
  expect(r).toHaveBeenCalledTimes(1);

  g.mockRestore();
  r.mockRestore();
});

it("doesn't reset state and notify subscribers if the state is strict equal to current state", () => {
  const cb = jest.fn();
  const store = createStore("store", {
    namespace: ns(),
    initialState: { foo: "bar" },
  });

  store.subscribe(cb);

  store.setState(store.getState());

  const newState = { foo: "baz" };

  store.setState(newState);
  store.setState(newState);

  expect(cb).toHaveBeenCalledTimes(1);
});
