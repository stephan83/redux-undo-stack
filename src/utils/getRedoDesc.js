export default function getRedoName(state) {
  if (state.undoStack.pos < state.undoStack.stack.length) {
    return state.undoStack.stack[state.undoStack.pos].desc;
  }

  return '';
}
