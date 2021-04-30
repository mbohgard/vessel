import { useEffect, useState } from "react";

import { Store, State } from "./";

export interface UsePose {
  <T extends Store<any>, U>(store: T, selector: (state: State<T>) => U): U;
  <T extends Store<any>>(store: T): State<T>;
}

export const usePose: UsePose = <
  T extends Store<any>,
  U,
  S extends (state: State<T>) => U
>(
  store: T,
  selector?: S
) => {
  const selectState = (s?: State<T>) => {
    const state = s ?? store.getState()[0];

    return selector ? selector(state) : state;
  };

  const [state, setState] = useState(selectState);

  useEffect(() => {
    const unsubscribe = store.subscribe((s) => setState(selectState(s)));

    return () => unsubscribe();
  }, []);

  return state;
};
