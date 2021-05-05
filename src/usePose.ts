import { useEffect, useState } from "react";

import { Store } from "./";

type StateFromStore<S extends Store<any>> = ReturnType<S["getState"]>[0];
type Options<T> = { selector?: (state: T) => any; supportSSR?: boolean };
type Selected<T, O> = O extends { selector: (state: T) => infer R } ? R : T;

export const usePose = <
  S extends Store<any>,
  T extends StateFromStore<S>,
  O extends Options<T>,
  R extends Selected<T, O>
>(
  store: S,
  options?: O
): O["supportSSR"] extends true ? R | undefined : R => {
  const selectState = (s?: any) => {
    const state = s ?? store.getState()[0];

    return options?.selector?.(state) ?? state;
  };

  const [state, setState] = useState(selectState);

  useEffect(() => {
    const unsubscribe = store.subscribe((s: any) => setState(selectState(s)));

    return () => {
      unsubscribe();
    };
  }, []);

  return state;
};
