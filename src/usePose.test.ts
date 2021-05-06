/**
 * @jest-environment jsdom
 */

import { renderHook, act } from "@testing-library/react-hooks/dom";
import { renderHook as serverRenderHook } from "@testing-library/react-hooks/server";

import { createStore } from "./index";
import { usePose } from "./usePose";

const store = createStore("hook", { initialState: { foo: "bar" } });

it("should return the state", () => {
  const { result } = renderHook(() => usePose(store));

  expect(result.current).toStrictEqual({ foo: "bar" });
});

it("should return the selected state", () => {
  const { result } = renderHook(() =>
    usePose(store, { selector: (s) => s?.foo })
  );

  expect(result.current).toBe("bar");
});

it("should return undefined on first render with SSR support enabled", () => {
  const { result, hydrate } = serverRenderHook(() =>
    usePose(store, { supportSSR: true })
  );

  expect(result.current).toBe(undefined);

  hydrate();

  expect(result.current).toStrictEqual({ foo: "bar" });
});

it("should render with the new state", async () => {
  const { result } = renderHook(() => usePose(store));

  act(() => {
    store.setState({ foo: "baz" });
  });

  expect(result.current).toStrictEqual({ foo: "baz" });
});
