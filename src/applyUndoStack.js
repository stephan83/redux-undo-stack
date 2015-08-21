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

    if (state && state[propName]) {
      undoStack = clone(state[propName]);
    } else {
      undoStack = {pos: 0, stack: []};
    }

    let retValue;

    switch (action.type) {

    case UNDO:
      if (undoStack.pos < 1) {
        return state;
      }
      undoStack.pos--;
      const undo = undoStack.stack[undoStack.pos].undo;
      retValue = state;
      undo.forEach(a => retValue = reducer(retValue, a));
      break;

    case REDO:
      if (undoStack.pos >= undoStack.stack.length) {
        return state;
      }
      const redo = undoStack.stack[undoStack.pos].redo;
      undoStack.pos++;
      retValue = state;
      redo.forEach(a => retValue = reducer(retValue, a));
      break;

    case BEGIN:
      undoStack.entry = {
        desc: action.desc,
        redo: [],
        undo: []
      };
      retValue = clone(state);
      break;

    case COMMIT:
      undoStack.stack = [
        ...undoStack.stack
          .slice(0, undoStack.pos),
        undoStack.entry
      ];
      undoStack.pos++;
      undoStack.entry = null;
      if (undoStack.length > cap) {
        undoStack.shift();
        undoStack.pos--;
      }
      retValue = clone(state);
      break;

    case ABORT:
      const abort = undoStack.entry.undo;
      retValue = state;
      abort.forEach(a => retValue = reducer(retValue, a));
      undoStack.entry = null;
      break;

    default:
      retValue = reducer(state, action);
      const undoAction = createUndoAction(state, action);
      if (undoStack.entry && undoAction) {
        undoStack.entry.redo.push(clone(action));
        undoStack.entry.undo.unshift(clone(undoAction));
      }
    }

    if (retValue) {
      retValue[propName] = undoStack;
    }

    return retValue;
  };
}
