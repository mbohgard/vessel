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

export const createStateRecord = <T>(
  state: T,
  ttl: number
): StateRecord<T> => ({
  expires: Date.now() + ttl,
  state,
});

const hasExpired = <T>(maybeRecord: StateRecord<T> | null) =>
  maybeRecord ? Date.now() > maybeRecord.expires : true;

export const storage = {
  getItem<T>(key: string, storedItem?: string | null): StateRecord<T> | null {
    const maybeRecord = parse<T>(storedItem ?? w?.localStorage.getItem(key));

    if (hasExpired(maybeRecord)) {
      w?.localStorage.removeItem(key);

      return null;
    }

    return maybeRecord;
  },
  setItem<T>(key: string, state: State<T>, ttl: number): StateRecord<T> | null {
    if (state === null) {
      w?.localStorage.removeItem(key);
      return null;
    }

    const record = createStateRecord(state, ttl);
    const str = stringify(record);

    if (typeof str === "string") w?.localStorage.setItem(key, str);

    return record;
  },
};
