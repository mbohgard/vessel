import { storage } from "./storage";
import w from "./window";

const DEFAULT_NAMESPACE = "_pose-";
const DEFAULT_TTL = 336; // hours

export type State<T> = T | null;
interface MakeMethodsOptions {
  namespace: string;
  name: string;
  ttl: number;
}

const makeMethods = <T>({ namespace, name, ttl }: MakeMethodsOptions) => {
  const key = `${namespace}${name}`;

  return {
    getStateRecord: (storedItem?: string | null) =>
      storage.getItem<T>(key, storedItem),
    saveStateToStore: (state: State<T>) => storage.setItem(key, state, ttl),
  };
};

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
  const { getStateRecord, saveStateToStore } = makeMethods<T>({
    namespace,
    name,
    ttl,
  });
  const subscribers = new Set<Callback<T>>();
  const existingState = getStateRecord();
  let cache =
    (overwriteExisting || !existingState) && initialState !== undefined
      ? saveStateToStore(initialState)
      : existingState;

  const getCachedState = (): State<T> => cache?.state ?? null;

  const publish = () => subscribers.forEach((f) => f(getCachedState()));

  const listener = (e: StorageEvent) => {
    if (!e.key?.startsWith(namespace)) return;

    const maybeRecord = getStateRecord(e.newValue);

    cache = maybeRecord;
    publish();
  };

  w?.addEventListener("storage", listener);

  const setState: SetState<T> = (arg: State<T> | StateSetter<T>) => {
    const newState =
      typeof arg === "function"
        ? (arg as StateSetter<T>)(getCachedState())
        : arg;

    cache = saveStateToStore(newState);
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
