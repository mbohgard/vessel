import type { State } from "./index";
import w from "./window";

type StateRecord<T = any> = {
  expires: number;
  state: T;
};

const stringify = (data: any) => {
  try {
    return JSON.stringify(data);
  } catch {
    console.error("State can't be a cyclical object or contain a BigInt value");
    return null;
  }
};

const parse = <T>(str?: string | null): StateRecord<T> | null => {
  try {
    return JSON.parse(str ?? "null");
  } catch {
    return null;
  }
};

export const hours2Ms = (h: number) => h * (1000 * 60 * 60);

export const createStateRecord = <T>(
  state: T,
  ttl: number
): StateRecord<T> => ({
  expires: Date.now() + hours2Ms(ttl),
  state,
});

export const isRecord = <T extends unknown>(
  state: State<T> | StateRecord<T>
): state is StateRecord<T> =>
  Boolean(Object(state) === state && "expires" in (state as object));

export const hasExpired = <T>(state: State<T> | StateRecord<T>) =>
  isRecord(state) && Date.now() > state.expires;

const removeItem = (key: string) => w?.localStorage.removeItem(key) || null;

export const storage = {
  getItem<T>(key: string, storedItem?: string | null): StateRecord<T> | null {
    const state = parse<T>(storedItem ?? w?.localStorage.getItem(key));

    return hasExpired(state) ? removeItem(key) : state;
  },
  setItem<T>(key: string, state: State<T>, ttl: number): StateRecord<T> | null {
    if (state === null) return removeItem(key);

    const record = createStateRecord(state, ttl);
    const str = stringify(record);

    if (typeof str === "string") w?.localStorage.setItem(key, str);

    return record;
  },
  removeItem,
};
