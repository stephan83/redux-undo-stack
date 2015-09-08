# Redux Undo Stack

An undo stack for redux. It works by storing incremental changes instead of
entire states, which is optimal when working with large data. It works in
combination with
[SmartActions](https://github.com/stephan83/redux-smart-action).

## Install

```
$ npm install redux-smart-action
$ npm install redux-undo-stack
```

## Usage

Given a simple stack reducer:

```js
function reducer(state = [], action) {
  switch (action.type) {
  case 'PUSH':
    return [...state, action.value];
  case 'POP':
    const nextState = state.slice();
    nextState.pop();
    return nextState;
  default:
    return state;
  }
}
```

You must write a function that creates an undo action from a state and an action
about to be executed on that state. If the action isn't undoable, it should
just return `null`. As of `v1.1.0` the function can also take a third
parameter which is the state after the action is executed, which is helpful
in some cases.

For our stack store:

```js
function createUndoAction(state, action) {
  switch (action.type) {
  case 'PUSH':
    return {type: 'POP'};
  case 'POP':
    return {type: 'PUSH', value: state[state.length - 1]};
  default:
    return null;
  }
}
```

Now you can wrap your reducer with `applyUndoStack`:

```js
import {applyUndoStack} from 'redux-undo-stack';

const reducerWithUndoStack = applyUndoStack(
  reducer,
  createUndoAction,
  100
);
```

The third argument is a cap for the size of the undo stack. By default it is
`100`.

Next, you must add the
[SmartActions](https://github.com/stephan83/redux-smart-action) middleware to
your store:

```js
import {
  smartActionMiddleware,
  applySmartMiddleware
} from 'redux-smart-action';

const createStoreWithMiddleware = applySmartMiddleware(
  smartActionMiddleware
)(createStore);

const store = createStoreWithMiddleware(reducerWithUndoStack);
```

Now, you can define your actions using
[SmartActions](https://github.com/stephan83/redux-smart-action):

```js
import { Actions as UndoStackActions } from 'redux-undo-stack';
import { SmartAction } from 'redux-smart-action';

const push = value => new SmartAction(dispatch => {
  if (dispatch(UndoStackActions.begin('push')).exec()) {
    dispatch({type: 'PUSH', value});
    dispatch(UndoStackActions.commit()).exec();
  }
});

const pop = () => new SmartAction((dispatch, getState) => {
  if (dispatch(UndoStackActions.begin('pop')).exec()) {
    if (getState().length) {
      dispatch({type: 'POP', value});
      dispatch(UndoStackActions.commit()).exec();
    } else {
      dispatch(UndoStackActions.abort()).exec();
    }
  }
});
```

As you can see, you begin an undoable command by calling `begin(description)`,
and end the command by calling `commit()`. **Between those two calls, you can
dispatch as many times as you want, it will create a single undoable command!**

We use an `if` statement checking the value of `begin()` to make sure another
command hasn't already started.

If something goes wrong you call `abort()` instead of `commit()`.

Now you're good to go:

```js
store.dispatch(push(1)).exec();
console.log(store.getState()); // [1]

store.dispatch(pop()).exec();
console.log(store.getState()); // []

store.dispatch(UndoStackActions.undo()).exec();
console.log(store.getState()); // [1]

store.dispatch(UndoStackActions.redo()).exec();
console.log(store.getState()); // []

store.dispatch(UndoStackActions.undo()).exec();
console.log(store.getState()); // [1]

// You can also defer execution to see if an action can be executed
let redo = store.dispatch(UndoStackActions.redo());
console.log(redo.canExec); // true
console.log(redo.exec());  // true
console.log(store.getState()); // [1]

redo = store.dispatch(UndoStackActions.redo());
console.log(redo.canExec); // false
console.log(redo.exec());  // false
console.log(store.getState()); // [1]
```

As you can see, you undo commands with `undo()` and redo commands with `redo()`.

### Utils

You can get undo and redo description with `getUndoDesc()` and `getRedoDesc()`:

```js
import { getUndoDesc, getRedoDesc } from 'redux-undo-stack';

console.log(getUndoDesc(store.getState()));
console.log(getRedoDesc(store.getState()));
```

### Advanced usage

You can begin a command in one action, end it in another action, and
execute as many actions as you want in between. It will result in a single
undoable command.

This is useful if, for example, a user is editing a text field. It would be
annoying to have an undoable command everytime the user presses a key.

Instead, you can start the command when the use focuses the text field, execute
actions everytime the text field changes, and finally commit the command when
the text field looses focus. This will create a single entry in the undo stack,
so undoing the command would revert the text field to the value it had before
the user started using it.

Example:

```js
const startEditing = () => new SmartAction(dispatch => {
  dispatch(UndoStackActions.begin('edit')).exec();
});

const edit = value => new SmartAction(dispatch => {
  dispatch({type: 'EDIT', value});
});

const endEditing = () => new SmartAction(dispatch => {
  dispatch(UndoStackActions.commit()).exec();
});
```

You could improve this example by calling `abort()` if the text didn't change.

## License

MIT
