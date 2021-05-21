import type { State } from "./index";
import { VESSEL_TYPE } from "./index";
import w from "./window";
import { batch } from "./batch";

export type StateRecord<T = any> = {
  type: typeof VESSEL_TYPE;
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

export const parse = <T>(str?: string | null): StateRecord<T> | null => {
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
  type: VESSEL_TYPE,
  expires: ttl ? Date.now() + hours2Ms(ttl) : 0,
  state,
});

export const isRecord = <T extends unknown>(
  state: State<T> | StateRecord<T> | null
): state is StateRecord<T> =>
  Boolean(Object(state) === state && "expires" in (state as object));

export const hasExpired = <T>(state: State<T> | StateRecord<T>) =>
  isRecord(state) && state.expires !== 0 && Date.now() > state.expires;

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

    if (typeof str === "string")
      batch(key, () => w?.localStorage.setItem(key, str));

    return record;
  },
  removeItem,
};

export const prune = (removeAll = false) =>
  w &&
  Object.entries(w.localStorage).forEach(([key, value]) => {
    const isVesselState =
      typeof value === "string" &&
      value.includes(`\"type\":\"${VESSEL_TYPE}\"`);

    if (isVesselState && (removeAll || hasExpired(parse(value))))
      removeItem(key);
  });
