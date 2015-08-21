import { SmartAction } from 'redux-smart-action';
import { UNDO, REDO, BEGIN, COMMIT, ABORT } from './ActionTypes';

export const undo = () => new SmartAction((dispatch, getState) => {
  if (getState().undoStack.pos > 0) {
    dispatch({type: UNDO});
  }
});

export const redo = () => new SmartAction((dispatch, getState) => {
  const state = getState();
  if (state.undoStack.pos < state.undoStack.stack.length) {
    dispatch({type: REDO});
  }
});

export const begin = desc => new SmartAction((dispatch, getState) => {
  if (!getState().undoStack.entry) {
    dispatch({type: BEGIN, desc});
  }
});

export const commit = () => new SmartAction((dispatch, getState) => {
  if (getState().undoStack.entry) {
    dispatch({type: COMMIT});
  }
});

export const abort = () => new SmartAction((dispatch, getState) => {
  if (getState().undoStack.entry) {
    dispatch({type: ABORT});
  }
});
