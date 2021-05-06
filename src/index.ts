import { storage, hasExpired } from "./storage";
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
  initialState?: T;
  overwriteExisting?: boolean;
  namespace?: string;
  /** Time in hours before removed from client's local storage */
  ttl?: number;
}

export const createStore = <T = unknown>(
  name: string,
  {
    initialState,
    overwriteExisting = false,
    namespace = DEFAULT_NAMESPACE,
    ttl = DEFAULT_TTL,
  }: CreateStoreOptions<T> = {}
): Store<T> => {
  const subscribers = new Set<Callback<T>>();
  const key = `${namespace}${name}`;

  const getStateRecord = (storedItem?: string | null) =>
    storage.getItem<T>(key, storedItem);
  const saveStateToStore = (state: State<T>, _ttl = ttl) =>
    storage.setItem(key, state, _ttl);

  const existingState = getStateRecord();
  let cache =
    (overwriteExisting || !existingState) && initialState !== undefined
      ? saveStateToStore(initialState)
      : existingState;

  const getCachedState = (): State<T> => {
    if (hasExpired(cache)) cache = storage.removeItem(key);

    return cache?.state ?? null;
  };

  const publish = () => subscribers.forEach((f) => f(getCachedState()));

  const listener = (e: StorageEvent) => {
    if (!e.key?.startsWith(namespace)) return;

    cache = getStateRecord(e.newValue);
    publish();
  };

  w?.addEventListener("storage", listener);

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
    clean: () => w?.removeEventListener("storage", listener),
  };
};

export type MakeCreateStoreOptions = Pick<
  CreateStoreOptions,
  "namespace" | "ttl"
>;

export const makeCreateStore = ({
  namespace = DEFAULT_NAMESPACE,
  ttl = DEFAULT_TTL,
}: MakeCreateStoreOptions = {}) => <T>(
  name: string,
  options: CreateStoreOptions<T> = {}
) => createStore(name, { namespace, ttl, ...options });
