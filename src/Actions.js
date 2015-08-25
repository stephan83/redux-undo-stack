import { SmartAction } from 'redux-smart-action';
import { UNDO, REDO, BEGIN, COMMIT, ABORT } from './ActionTypes';

function choose(getState, select) {
  return select ? select(getState()) : getState();
}

export const undo = select => new SmartAction((dispatch, getState) => {
  const state = choose(getState, select);

  if (state.undoStack.pos > 0) {
    dispatch({type: UNDO});
  }
}, false);

export const redo = select => new SmartAction((dispatch, getState) => {
  const state = choose(getState, select);

  if (state.undoStack.pos < state.undoStack.stack.length) {
    dispatch({type: REDO});
  }
}, false);

export const begin = (desc, select) => new SmartAction((dispatch, getState) => {
  const state = choose(getState, select);

  if (!state.undoStack.entry) {
    dispatch({type: BEGIN, desc});
  }
}, false);

export const commit = select => new SmartAction((dispatch, getState) => {
  const state = choose(getState, select);

  if (state.undoStack.entry) {
    dispatch({type: COMMIT});
  }
}, false);

export const abort = select => new SmartAction((dispatch, getState) => {
  const state = choose(getState, select);

  if (state.undoStack.entry) {
    dispatch({type: ABORT});
  }
}, false);
