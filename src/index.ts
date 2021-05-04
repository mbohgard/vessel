const w = typeof window !== "undefined" ? window : undefined;

const DEFAULT_NAMESPACE = "_pose-";

export type State<T> = T extends {} ? T : T | null;
type StateString<T> = T extends {} ? string : string | null;
type FullState<T> = readonly [State<T>, StateString<T>];

const state2Str = <T>(state: T) => {
  try {
    return JSON.stringify(state);
  } catch {
    console.error("State must be serializable");
    return null;
  }
};

const str2State = (str: string | null) => {
  try {
    return JSON.parse(str ?? "null");
  } catch {
    return null;
  }
};

const makeMethods = <T>(namespace: string, name: string) => {
  const key = `${namespace}${name}`;
  const getStateStr = () => w?.localStorage.getItem(key) ?? null;
  const toFullState = (...arr: any[]) => ([...arr] as unknown) as FullState<T>;

  return {
    getState: (stateStr?: string | null) => {
      const str = stateStr === undefined ? getStateStr() : stateStr;
      const parsed = str2State(str);

      return toFullState(parsed, str);
    },
    saveState: (state: T, stateStr?: string | null) => {
      const currentStateStr = getStateStr();
      const str = stateStr ?? state2Str(state);

      if (str === null) w?.localStorage.removeItem(key);
      else if (currentStateStr !== str) w?.localStorage.setItem(key, str);

      return toFullState(state, str);
    },
  };
};

type StateSetter<T> = (state: State<T>, stateStr: StateString<T>) => State<T>;

export interface SetState<T> {
  (newState: State<T>): void;
  (setter: StateSetter<T>): void;
}

export type Callback<T> = (...args: FullState<T>) => void;

export type Store<T> = {
  subscribe: (callback: Callback<T>) => () => boolean;
  getState: () => FullState<T>;
  setState: SetState<T>;
  clean: () => void;
};

export interface Options<T> {
  initialState?: T;
  overwriteExisting?: boolean;
  namespace?: string;
}

export const makeStore = <T = unknown>(
  name: string,
  {
    initialState,
    overwriteExisting = false,
    namespace = DEFAULT_NAMESPACE,
  }: Options<T> = {}
): Store<T> => {
  const { getState, saveState } = makeMethods<T>(namespace, name);
  const subscribers = new Set<Callback<T>>();
  const existingState = getState();
  let cache =
    (overwriteExisting || existingState[0] === null) &&
    initialState !== undefined
      ? saveState(initialState)
      : existingState;

  const publish = () => subscribers.forEach((f) => f(...cache));

  const listener = (e: StorageEvent) => {
    if (!e.key?.startsWith(namespace)) return;

    cache = getState(e.newValue);
    publish();
  };

  w?.addEventListener("storage", listener);

  const setState: SetState<T> = (arg: State<T> | StateSetter<T>) => {
    const [currentState, currentStateStr] = cache;
    const newState =
      typeof arg === "function"
        ? (arg as StateSetter<T>)(currentState, currentStateStr)
        : arg;
    const newStateStr = state2Str(newState);

    if (newStateStr !== currentStateStr) {
      cache = saveState(newState as T, newStateStr);
      publish();
    }
  };

  return {
    subscribe: (cb: Callback<T>) => {
      subscribers.add(cb);

      return () => subscribers.delete(cb);
    },
    getState: () => cache,
    setState,
    clean: () => w?.removeEventListener("storage", listener),
  };
};
