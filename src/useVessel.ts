import { useEffect, useState } from "react";

import { Store } from ".";

type PossibleStores = Store<any, null> | Store<any, never>;
type StateFromStore<S extends PossibleStores> = ReturnType<S["getState"]>;
type Options<T> = { selector?: (state: T) => any; supportSSR?: boolean };
type Selected<T, O> = O extends { selector: (state: T) => infer R } ? R : T;

export const useVessel = <
  S extends PossibleStores,
  T extends StateFromStore<S>,
  O extends Options<T>,
  R extends Selected<T, O>
>(
  store: S,
  options?: O
): [O["supportSSR"] extends true ? R | undefined : R, S["setState"]] => {
  const { selector, supportSSR } = options ?? {};

  const selectState = (s?: T | null) => {
    const state = s ?? store.getState();

    return selector?.(state) ?? state;
  };

  const [state, setState] = useState(supportSSR ? undefined : selectState);

  useEffect(() => {
    if (supportSSR) setState(selectState);
  }, []);

  useEffect(() => {
    const unsubscribe = store.subscribe((s) => setState(selectState(s)));

    return () => {
      unsubscribe();
    };
  }, []);

  return [state, store.setState];
};

export const makeVesselHook = <S extends PossibleStores>(store: S) => <
  T extends StateFromStore<S>,
  O extends Options<T>
>(
  options?: O
) => useVessel(store, options);
