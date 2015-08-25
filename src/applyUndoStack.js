import clone from 'clone';
import { UNDO, REDO, BEGIN, COMMIT, ABORT } from './ActionTypes';

export default function applyUndoStack(
  reducer,
  createUndoAction,
  propName = 'undoStack',
  cap = 100
) {
  return (state, action) => {
    let undoStack;
    let undoStackUpdated = false;

    if (state && state[propName]) {
      undoStack = state[propName];
    } else {
      undoStack = {pos: 0, stack: []};
      undoStackUpdated = true;
    }

    let retValue;

    switch (action.type) {

    case UNDO:
      if (undoStack.pos < 1) {
        throw new Error('Can\'t UNDO: position is less than one');
      }
      undoStack = clone(undoStack);
      undoStackUpdated = true;
      undoStack.pos--;
      const undo = undoStack.stack[undoStack.pos].undo;
      retValue = state;
      undo.forEach(a => retValue = reducer(retValue, a));
      break;

    case REDO:
      if (undoStack.pos >= undoStack.stack.length) {
        throw new Error('Can\'t REDO: position is greater or equal ' +
                        'to stack length');
      }
      undoStack = clone(undoStack);
      undoStackUpdated = true;
      const redo = undoStack.stack[undoStack.pos].redo;
      undoStack.pos++;
      retValue = state;
      redo.forEach(a => retValue = reducer(retValue, a));
      break;

    case BEGIN:
      if (undoStack.entry) {
        throw new Error('Can\'t BEGIN: a transaction has already began');
      }
      undoStack = clone(undoStack);
      undoStackUpdated = true;
      undoStack.entry = {
        desc: action.desc,
        redo: [],
        undo: []
      };
      retValue = state;
      break;

    case COMMIT:
      if (!undoStack.entry) {
        throw new Error('Can\'t COMMIT: a transaction hasn\'t began');
      }
      undoStack = clone(undoStack);
      undoStackUpdated = true;
      undoStack.stack = [
        ...undoStack.stack.slice(0, undoStack.pos),
        undoStack.entry
      ];
      undoStack.pos++;
      undoStack.entry = null;
      if (undoStack.stack.length > cap) {
        undoStack.stack.shift();
        undoStack.pos--;
      }
      retValue = state;
      break;

    case ABORT:
      if (!undoStack.entry) {
        throw new Error('Can\'t ABORT: a transaction hasn\'t began');
      }
      undoStack = clone(undoStack);
      undoStackUpdated = true;
      const abort = undoStack.entry.undo;
      retValue = state;
      abort.forEach(a => retValue = reducer(retValue, a));
      undoStack.entry = null;
      break;

    default:
      retValue = reducer(state, action);
      if (undoStack.entry) {
        const undoAction = createUndoAction(state, action);
        if (undoAction) {
          undoStack = clone(undoStack);
          undoStackUpdated = true;
          undoStack.entry.redo.push(clone(action));
          undoStack.entry.undo.unshift(clone(undoAction));
        }
      }
    }

    if (retValue && undoStackUpdated) {
      if (retValue === state) {
        retValue = clone(state);
      }
      retValue[propName] = undoStack;
    }

    return retValue;
  };
}
