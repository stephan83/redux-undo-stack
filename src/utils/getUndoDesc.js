export default function getUndoName(state) {
  if (state.undoStack.pos > 0) {
    return state.undoStack.stack[state.undoStack.pos - 1].desc;
  }

  return '';
}
