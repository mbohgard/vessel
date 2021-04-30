const w = typeof window !== "undefined" ? window : undefined;

const NAMESPACE = "_pose-";

const getStateStr = (name: string) =>
  w?.localStorage.getItem(`${NAMESPACE}${name}`) ?? null;

type Defined = number | string | boolean | object;

export type State<T> = T extends Defined ? T : T | null;
type StateString<T> = T extends Defined ? string : string | null;
type FullState<T> = [State<T>, StateString<T>];

const getState = <T>(name: string, stateStr?: string | null) => {
  const str = stateStr === undefined ? getStateStr(name) : stateStr;
  const parsed = JSON.parse(str ?? "null");

  return [parsed, str] as FullState<T>;
};

const state2Str = <T>(state: T) => {
  try {
    return JSON.stringify(state);
  } catch {
    console.error("State must be serializable");
    return "";
  }
};

const saveState = <T>(name: string, state: T) => {
  const currentStateStr = getStateStr(name);
  const str = state2Str(state);

  if (str && currentStateStr !== str) {
    w?.localStorage.setItem(`${NAMESPACE}${name}`, str);
  }

  return [state, str] as FullState<T>;
};

type StateSetter<T> = (previousState: State<T>) => State<T>;

export interface SetState<T> {
  (newState: State<T>): void;
  (setter: StateSetter<T>): void;
}

export type Callback<T> = (...args: FullState<T>) => void;

export type Store<T> = {
  subscribe: (callback: Callback<T>) => () => void;
  getState: () => FullState<T>;
  setState: SetState<T>;
  clean: () => void;
};

export interface Options<T> {
  initialState?: T;
  overwriteExisting?: boolean;
}

export const makeStore = <T = unknown>(
  name: string,
  { initialState, overwriteExisting = false }: Options<T> = {}
): Store<T> => {
  const subscribers = new Set<Callback<T>>();
  const existingState = getState<T>(name);
  const cache =
    (overwriteExisting || existingState === null) && initialState
      ? saveState(name, initialState)
      : existingState;
  let invalidate = true;

  const publish = (newState?: FullState<T>) => {
    const [state, stateStr] = newState ?? getState<T>(name);
    subscribers.forEach((f) => f(state, stateStr));
  };

  const listener = (e: StorageEvent) => {
    if (!e.key?.startsWith(NAMESPACE)) return;

    invalidate = true;

    publish();
  };

  w?.addEventListener("storage", listener);

  const setState: SetState<T> = (arg: State<T> | StateSetter<T>) => {
    const currentStateStr = invalidate ? getStateStr(name) : cache[1];
    const newState =
      typeof arg === "function"
        ? (arg as StateSetter<T>)(
            invalidate ? getState<T>(name, currentStateStr)[0] : cache[0]
          )
        : arg;
    const newStateStr = state2Str(newState) as StateString<T>;

    invalidate = false;

    if (newStateStr !== currentStateStr) {
      saveState(name, newState);
      publish([newState, newStateStr]);
    }
  };

  return {
    subscribe: (cb: Callback<T>) => {
      subscribers.add(cb);

      return () => subscribers.delete(cb);
    },
    getState: () => getState<T>(name),
    setState,
    clean: () => w?.removeEventListener("storage", listener),
  };
};
