/**
 * @jest-environment jsdom
 */

import { renderHook, act } from "@testing-library/react-hooks/dom";
import { renderHook as serverRenderHook } from "@testing-library/react-hooks/server";

import { createStore } from "./index";
import { useVessel } from "./useVessel";

const store = createStore("hook", { initialState: { foo: "bar" } });

it("should return the state", () => {
  const { result } = renderHook(() => useVessel(store));

  expect(result.current[0]).toStrictEqual({ foo: "bar" });
});

it("should return the selected state", () => {
  const { result } = renderHook(() =>
    useVessel(store, { selector: (s) => s?.foo })
  );

  expect(result.current[0]).toBe("bar");
});

it("should return undefined on first render with SSR support enabled", () => {
  const { result, hydrate } = serverRenderHook(() =>
    useVessel(store, { supportSSR: true })
  );
  expect(result.current[0]).toBe(undefined);

  hydrate();

  expect(result.current[0]).toStrictEqual({ foo: "bar" });
});

it("should render with the new state", () => {
  const { result } = renderHook(() => useVessel(store));
  const [, setState] = result.current;

  act(() => {
    setState({ foo: "baz" });
  });

  expect(result.current[0]).toStrictEqual({ foo: "baz" });

  act(() => {
    setState((s) => (s ? { ...s, foo: "qux" } : s));
  });

  expect(result.current[0]).toStrictEqual({ foo: "qux" });
});
