import { storage, hasExpired, isRecord } from "./storage";
import w from "./window";

const DEFAULT_NAMESPACE = "_pose-";
const DEFAULT_TTL = 336; // 2 weeks (hours)

export type State<T> = T | null;

type StateSetter<T> = (state: State<T>) => State<T>;

export interface SetState<T> {
  (newState: State<T>): void;
  (setter: StateSetter<T>): void;
}

export type Callback<T> = (state: State<T>) => void;

export type Store<T> = {
  subscribe: (callback: Callback<T>) => () => boolean;
  getState: () => State<T>;
  setState: SetState<T>;
  clean: () => void;
};

export interface CreateStoreOptions<T = unknown> {
  /** Initial state if none is found in local storage */
  initialState?: T;
  /** Overwrite any existing state in local storage with the provided initial state */
  overwriteExisting?: boolean;
  /** Prefix to use in local storage */
  namespace?: string;
  /** Time in hours before removed from client's local storage */
  ttl?: number;
  /** Opt-out of the persistent storage functionality by setting this to false */
  persistent?: boolean;
}

export const createStore = <T = unknown>(
  name: string,
  {
    initialState,
    overwriteExisting = false,
    namespace = DEFAULT_NAMESPACE,
    ttl = DEFAULT_TTL,
    persistent = true,
  }: CreateStoreOptions<T> = {}
): Store<T> => {
  const subscribers = new Set<Callback<T>>();
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

  const getCachedState = (check = true): State<T> => {
    if (check && hasExpired(cache)) cache = storage.removeItem(key);

    return isRecord(cache) ? cache.state : cache;
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

  const setState: SetState<T> = (
    arg: State<T> | StateSetter<T>,
    ttl?: number
  ) => {
    const currentState = getCachedState();
    const newState =
      typeof arg === "function" ? (arg as StateSetter<T>)(currentState) : arg;

    if (newState === currentState) return;

    cache = saveStateToStore(newState, ttl);
    publish();
  };

  return {
    subscribe: (cb: Callback<T>) => {
      subscribers.add(cb);

      return () => subscribers.delete(cb);
    },
    getState: () => getCachedState(),
    setState,
    clean: subscribeToStorage(),
  };
};

export type MakeCreateStoreOptions = Pick<
  CreateStoreOptions,
  "namespace" | "ttl" | "persistent"
>;

export const makeCreateStore = ({
  namespace = DEFAULT_NAMESPACE,
  ttl = DEFAULT_TTL,
  persistent = true,
}: MakeCreateStoreOptions = {}) => <T>(
  name: string,
  options: CreateStoreOptions<T> = {}
) => createStore(name, { namespace, ttl, persistent, ...options });
