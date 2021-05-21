# Vessel

Persistent state manager for VanillaJS and React applications with cross-tab update support.

## Features

- 🔗 Keep your application state between page reloads
- 🤝 Sync state updates between open browser tabs in real time
- ⏱️ Set expire time on states
- 🙅‍♂️ No context providers needed (React)
- 🥔 Minimal API
- 🚅 Performant
- 🔒 Type safe
- ☁️ Tiny and depedency free

1. [Install](#install)
1. [Usage](#usage)
1. [API](#api)

## Install

```bash
$ npm install vessel --save
```

_or_

```bash
$ yarn add vessel
```

## Usage

####Create a store:

```typescript
// store.ts
import { createStore } from "vessel";

export const fooStore = createStore("someName", {
  initialState: { foo: "bar" },
});
```

#### Use it:

```typescript
// app.ts
import { fooStore } from "./store";

const currentState = fooStore.getState(); // { foo: "bar" }

const unsubscribe = fooStore.subscribe((newState) => {
  // Do something with the state update.
  console.log(newState); // { foo: "batman" }
});

fooStore.setState({ foo: "batman" });

/* ... */

// Later on
unsubscribe();
```

#### Use in React

```typescript
// component.tsx
import { useVessel } from "vessel";

import { useFooStore } from "./store";

export const Component = () => {
  const [fooState, setFooState] = useVessel(fooStore);

  return (
    <div>
      <input
        // When using "expires" option (default), state could be "null".
        value={fooState ?? ""}
        onChange={(e) => setFooState({ foo: e.target.value })}
      />
    </div>
  );
};
```

Instead of providing the store to the `useVessel` hook, you can create your own custom hook already bound to a specific store:

```typescript
// hooks.ts
import { makeVesselHook } from "vessel";
import { fooStore } from "./store";

export const useFooStore = makeVesselHook(fooStore);

// component.tsx
import { useFooStore } from "./hooks";

export const Component = () => {
  const [fooState, setFooState] = useFooStore();

  /* ... */
};
```

## Caution

Be careful when persisting personal information. If the user is using a public computer personal information might be saved in local storage for that domain and viewable for all users of the machine.

## API

### createStore

##### Signature

```typescript
createStore(name: string, options?: Options) => Store;
```

`name` together with `namespace` (see below) will create your local storage key so make sure it's unique to the particular store you're creating.

##### Options

Options available as a second parameter to `createStore`. Default values after the type.

```typescript
{
  // Opt-out of the persistent storage functionality by setting this to false.
  persistent?: boolean; // true

  // Initial state of the store, also sets the store state type.
  initialState?: any; // undefined
}
```

If `persistent` is set to `true` | `undefined`, the following properties are also available on the `Options` interface:

```typescript
{
  // Overwrite any existing state in local storage with the provided initial state.
  overwriteExisting?: boolean; // false

  // Prefix to use in local storage.
  namespace?: string; // "vssl-"

  // Time in hours before removed from client's local storage.
  ttl?: number; // 336 (two weeks)
}
```

##### Store

```typescript
// Store interface
{
  // Subscribe to store updates. Takes a callback function that receives the new state.
  // Returns an unsubsribe function that will remove the callback function from the list of
  // subscribers. The unsubscribe function will return true if a callback was found and removed.
  subscribe(callback: (state: State) => void): () => boolean;

  // Returns the current state.
  getState(): State;

  // Provide a new state directly or a function that receives the current state and expects a
  // new state to be returned.
  setState(state: State) => void | (stateSetter: (state: State) => State): void;

  // Remove storage event listeners, clear list of subsribers and mark store as suspended which
  // means it can't be subscribed to and setting state will have no effect.
  // If `erase` is set to true, any state in local storage will be deleted. Local cache of the
  // will remain though.
  end(erase?: boolean, reason?: string): void;

  // Clear list of subscribers and re-activate the possibly suspended store.
  reset(): void;
}
```

### makeCreateStore

##### Signature

```typescript
makeCreateStore(options?: Options) => typeof createStore;
```

Generates an instance of `createStore` with pre-defined defaults. These defaults can be overwritten when invoking the returned `createStore` function.
`Options` is the same as for `createStore` except you can't provide any `initialState`.

### useVessel

Custom hook, only usable with React.

##### Signature

```typescript
useVessel(store: Store, options?: HookOptions) => [State, Store["setState"]];
```

##### HookOptions

```typescript
// Store interface
{
  // Selector, mostly for convenience to read part of the state or derive stuff from it.
  // Will only provide a performance benefit if the result from the selector is a primitive
  // value.
  selector?(state: State) => any;

  // Servers can't read from local storage on the client. To get the server rendered string
  // to match with the client rendering for hydration, initial React state is always set to
  // undefined and the state will be populated in the next tick. This will make your state
  // be a union type of State and undefined.
  supportSSR?: boolean; // false
}
```

### makeVesselHook

Only when using React.

##### Signature

```typescript
makeVesselHook(store: Store, options?: HookOptions) => (options?: HookOptions) => [State, Store["setState"]];
```

Create a custom hook to be used for a specific store with set defaults. This will make it more convenient for usage in components since you only need to import the custom hook, not `useVessel` and the store. See examples.

### prune

##### Signature

```typescript
prune(removeAll?: boolean) => void;
```

Vessel will delete any expired state on store initiation or when reading state through `getState`.
`prune` will make this happen on demand without using any other functionality of Vessel. By default only expired state will be removed. Passing `true` to `prune` will remove any persisted Vessel state available in the client's local storage.
