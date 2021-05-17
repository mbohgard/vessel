import w from "./window";

type Callback = () => void;

const queue = new Map<string, Callback>();
let timer: number | undefined = undefined;

export const batch = (key: string, cb: Callback) => {
  queue.set(key, cb);

  if (!timer)
    timer = w?.setTimeout(() => {
      queue.forEach((f) => f());
      queue.clear();

      timer = undefined;
    });
};
