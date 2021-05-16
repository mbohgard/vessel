# Vessel

Persistent state manager for VanillaJS and React applications with cross-tab update support.

## Features

- 🔗 Keep your application state between page reloads
- 🤝 Sync state updates between open browser tabs in real time
- ⏱️ Set expire timestamps on stores
- 🙅‍♂️ No context providers needed (React)
- 🥔 Minimal API
- 🚅 Performant
- 🔒 Type safe

1. [Install](#install)
1. [Usage](#usage)
   1. [Basic usage](#basic-usage)
   1. [More advanced usage](#more-advanced-usage)
   1. [Unfocused mode](#unfocused-mode)
   1. [Custom transform](#custom-transform)
1. [Tips](#tips)
1. [API](#api)
   1. [useSwiper](#useswiper)
   1. [Swiper component](#swiper-component)
   1. [makeEase](#makeease)

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
  // do something with the state update
  console.log(newState); // { foo: "batman" }
});

fooStore.setState({ foo: "batman" });
```

#### Use in React

```typescript
// component.tsx
import { useVessel } from "vessel";

import { fooStore } from "./store";

export const Component = () => {
  const [fooState, setFooState] = useVessel(fooStore);

  return (
    <div>
      <input
        // when using "expires" option (default), state could be "null"
        value={fooState ?? ""}
        onChange={(e) => setFooState({ foo: e.target.value })}
      />
    </div>
  );
};
```
