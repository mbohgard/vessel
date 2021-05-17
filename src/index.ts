import { storage, hasExpired, isRecord } from "./storage";
import w from "./window";

const DEFAULT_NAMESPACE = "vssl-";
const DEFAULT_TTL = 336; // 2 weeks (hours)

export type State<T, N = null> = null extends N ? T | null : T;
type StateSetter<T, N> = (state: State<T, N>) => State<T, N>;

export interface SetState<T, N> {
  (newState: State<T, N>): void;
  (setter: StateSetter<T, N>): void;
}

export type Callback<C> = (state: C) => void;

export type Store<T extends unknown, N = null> = {
  subscribe: (callback: Callback<State<T, N>>) => () => boolean;
  getState: () => State<T, N>;
  setState: SetState<T, N>;
  clean: () => void;
};

interface CommonOptions<P, T = unknown> {
  /** Opt-out of the persistent storage functionality by setting this to false */
  persistent?: P;
  /** Initial state of the store, also sets the store state type */
  initialState?: T;
}

type PersistentOptions<O, E, P, T = unknown> = {
  /** Overwrite any existing state in local storage with the provided initial state */
  overwriteExisting?: O;
  /** Prefix to use in local storage */
  namespace?: string;
  /** Time in hours before removed from client's local storage */
  ttl?: E;
} & CommonOptions<P, T>;

type Options<M, P, O, E, T = unknown> = P extends false
  ? M extends true
    ? Omit<CommonOptions<P>, "initialState">
    : CommonOptions<P, T>
  : M extends true
  ? Omit<PersistentOptions<O, E, P>, "initialState">
  : PersistentOptions<O, E, P, T>;

export const makeCreateStore = <
  PP extends boolean,
  OO extends boolean,
  EE extends number
>(
  defaultOptions?: Options<true, PP, OO, EE>
) => {
  const o = defaultOptions as PersistentOptions<OO, EE, PP>;
  const defaults = {
    namespace: o?.namespace ?? DEFAULT_NAMESPACE,
    overwriteExisting: o?.overwriteExisting ?? false,
    persistent: o?.persistent ?? true,
    ttl: o?.ttl ?? DEFAULT_TTL,
  };

  return <
    P extends boolean = PP,
    O extends boolean = OO,
    E extends number = EE,
    T = unknown,
    R = P extends false
      ? never
      : O extends true
      ? E extends 0
        ? never
        : null
      : null
  >(
    name: string,
    options?: Options<false, P, O, E, T>
  ) => {
    const { overwriteExisting, namespace, ttl, persistent, initialState } = {
      ...defaults,
      ...options,
    };
    const subscribers = new Set<Callback<State<T, R>>>();
    const key = `${namespace}${name}`;

    const getStateRecord = (storedItem?: string | null) =>
      storage.getItem<T>(key, storedItem);
    const saveStateToStore = (state: State<T>, _ttl = ttl) =>
      persistent ? storage.setItem(key, state, _ttl) : state;

    const existingState = persistent ? getStateRecord() : null;
    let cache =
      (overwriteExisting || !existingState) && initialState !== undefined
        ? saveStateToStore(initialState)
        : existingState;

    const getCachedState = (check = true): State<T, R> => {
      if (check && hasExpired(cache)) cache = storage.removeItem(key);

      return (isRecord(cache) ? cache.state : cache) as State<T, R>;
    };

    const publish = () => {
      const state = getCachedState(false);
      subscribers.forEach((f) => f(state));
    };

    const subscribeToStorage = () => {
      if (!persistent) return () => {};

      const listener = (e: StorageEvent) => {
        if (!e.key?.startsWith(namespace)) return;

        cache = getStateRecord(e.newValue);
        publish();
      };

      w?.addEventListener("storage", listener);

      return () => w?.removeEventListener("storage", listener);
    };

    const setState = (arg: State<T, R> | StateSetter<T, R>, ttl?: number) => {
      const currentState = getCachedState();
      const newState =
        typeof arg === "function"
          ? (arg as StateSetter<T, R>)(currentState)
          : arg;

      if (newState === currentState) return;

      cache = saveStateToStore(newState, ttl);
      publish();
    };

    return {
      subscribe: (cb: Callback<State<T, R>>) => {
        subscribers.add(cb);

        return () => subscribers.delete(cb);
      },
      getState: () => getCachedState(),
      setState,
      clean: subscribeToStorage(),
    };
  };
};

export const createStore = makeCreateStore();
