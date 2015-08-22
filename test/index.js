import sinon from 'sinon';
import { createStore } from 'redux';
import {
  SmartAction,
  smartActionMiddleware,
  applySmartMiddleware
} from 'redux-smart-action';
import { Actions, applyUndoStack } from '../src';

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

const reducerSpy = sinon.spy(reducer);

const reducerWithUndoStack = applyUndoStack(
  reducerSpy,
  createUndoAction,
  'undoStack',
  10
);

const push = value => new SmartAction(dispatch => {
  if (dispatch(Actions.begin('push')).exec()) {
    dispatch({type: 'PUSH', value});
    dispatch(Actions.commit()).exec();
  }
}, false);

const pop = value => new SmartAction((dispatch, getState) => {
  if (dispatch(Actions.begin('pop')).exec()) {
    if (getState().length) {
      dispatch({type: 'POP', value});
      dispatch(Actions.commit()).exec();
    } else {
      dispatch(Actions.abort()).exec();
    }
  }
}, false);

const beginTransaction = () => new SmartAction(dispatch => {
  dispatch(Actions.begin('modifications')).exec();
}, false);

const pushInTransaction = value => new SmartAction(dispatch => {
  dispatch({type: 'PUSH', value});
}, false);

const popInTransaction = () => new SmartAction(dispatch => {
  dispatch({type: 'POP'});
}, false);

const commitTransaction = () => new SmartAction(dispatch => {
  dispatch(Actions.commit()).exec();
}, false);

const passThrough = () => ({
  type: 'PASS_THROUGH'
});

const createStoreWithMiddleware = applySmartMiddleware(
  smartActionMiddleware
)(createStore);

describe('redux-undo-stack', () => {

  let store;
  let action;

  function createStackStore(initialState) {
    return createStoreWithMiddleware(reducerWithUndoStack, initialState);
  }

  beforeEach(() => {
    store = createStackStore();
    reducerSpy.reset();
  });

  afterEach(() => {
    reducerSpy.reset();
  });

  describe('#begin()', () => {

    context('there isn\'t already a transaction', () => {

      beforeEach(() => {
        action = store.dispatch(Actions.begin('transaction'));
      });

      context('#canExec', () => {

        it('should be true', () => {
          action.canExec.should.be.exactly(true);
        });

      });

    });

    context('there already is a transaction', () => {

      beforeEach(() => {
        store.dispatch(Actions.begin('transaction-1')).exec();
        action = store.dispatch(Actions.begin('transaction-2'));
      });

      context('#canExec', () => {

        it('should be false', () => {
          action.canExec.should.be.exactly(false);
        });

      });

    });

  });

  describe('#commit()', () => {

    context('there is a transaction', () => {

      beforeEach(() => {
        store.dispatch(Actions.begin('transaction')).exec();
        action = store.dispatch(Actions.commit());
      });

      context('#canExec', () => {

        it('should be true', () => {
          action.canExec.should.be.exactly(true);
        });

      });

    });

    context('there isn\'t a transaction', () => {

      beforeEach(() => {
        action = store.dispatch(Actions.commit());
      });

      context('#canExec', () => {

        it('should be false', () => {
          action.canExec.should.be.exactly(false);
        });

      });

    });

    context('an action commits', () => {

      context('undo stack position is the head', () => {

        context('undo stack isn\'t capped', () => {

          beforeEach(() => {
            action = store.dispatch(push(1));
            action.exec();
          });

          it('increments the stack\'s position', () => {
            store.getState().undoStack.pos.should.be.exactly(1);
          });

          it('adds an entry to the stack', () => {
            store.getState().undoStack.stack.length.should.be.exactly(1);
          });

        });

        context('undo stack is capped', () => {

          beforeEach(() => {
            for (let i = 0; i < 10; i++) {
              store.dispatch(push(i)).exec();
            }
            action = store.dispatch(push(10));
            action.exec();
          });

          it('doesn\'t increment the stack\'s position', () => {
            store.getState().undoStack.pos.should.be.exactly(10);
          });

          it('adds an entry to the stack', () => {
            store.getState().undoStack.stack[9].redo[0].value
              .should.be.exactly(10);
          });

        });

      });

      context('undo stack position isn\' the head', () => {

        beforeEach(() => {
          store.dispatch(push(1)).exec();
          store.dispatch(push(2)).exec();
          store.dispatch(push(3)).exec();
          store.dispatch(Actions.undo()).exec();
          store.dispatch(Actions.undo()).exec();
          action = store.dispatch(push(4));
          action.exec();
        });

        it('increments the stack\'s position', () => {
          store.getState().undoStack.pos.should.be.exactly(2);
        });

        it('removes entries after the new entry', () => {
          store.getState().undoStack.stack.length.should.be.exactly(2);
        });

      });

    });

  });

  describe('#abort()', () => {

    context('there is a transaction', () => {

      beforeEach(() => {
        store.dispatch(Actions.begin('transaction')).exec();
        action = store.dispatch(Actions.abort());
      });

      context('#canExec', () => {

        it('should be true', () => {
          action.canExec.should.be.exactly(true);
        });

      });

    });

    context('there isn\'t a transaction', () => {

      beforeEach(() => {
        action = store.dispatch(Actions.abort());
      });

      context('#canExec', () => {

        it('should be false', () => {
          action.canExec.should.be.exactly(false);
        });

      });

    });

    context('an action aborts', () => {

      beforeEach(() => {
        action = store.dispatch(pop());
        action.exec();
      });

      it('doesn\'t increment the stack\'s position', () => {
        store.getState().undoStack.pos.should.be.exactly(0);
      });

      it('doesn\'t add an entry', () => {
        store.getState().undoStack.stack.length.should.be.exactly(0);
      });

    });

  });

  context('a single action in a transaction', () => {

    describe('#undo()', () => {

      context('the undo stack is not empty', () => {

        beforeEach(() => {
          store.dispatch(push(1)).exec();
          reducerSpy.reset();
        });

        context('undo stack position is positive', () => {

          beforeEach(() => {
            action = store.dispatch(Actions.undo());
            action.exec();
          });

          it('should invoke the reducer', () => {
            reducerSpy.callCount.should.be.exactly(2);
          });

          it('should invoke the reducer with the opposite action', () => {
            reducerSpy.secondCall.args[1].type.should.be.exactly('POP');
          });

          it('works', () => {
            store.getState().length.should.be.exactly(0);
          });

        });

        context('undo stack position is zero', () => {

          beforeEach(() => {
            store.dispatch(Actions.undo()).exec();
            reducerSpy.reset();
            action = store.dispatch(Actions.undo());
            action.exec();
          });

          it('should not invoke the reducer', () => {
            reducerSpy.called.should.be.exactly(false);
          });

        });

      });

      context('the undo stack is empty', () => {

        beforeEach(() => {
          action = store.dispatch(Actions.undo());
          action.exec();
        });

        it('should not invoke the reducer', () => {
          reducerSpy.called.should.be.exactly(false);
        });

      });

    });

    describe('#redo()', () => {

      context('the undo stack is not empty', () => {

        beforeEach(() => {
          store.dispatch(push(1)).exec();
          reducerSpy.reset();
        });

        context('undo stack position is not the head', () => {

          beforeEach(() => {
            store.dispatch(Actions.undo()).exec();
            reducerSpy.reset();
            action = store.dispatch(Actions.redo());
            action.exec();
          });

          it('should invoke the reducer with the action', () => {
            reducerSpy.secondCall.args[1].type.should.be.exactly('PUSH');
            reducerSpy.secondCall.args[1].value.should.be.exactly(1);
          });

          it('works', () => {
            store.getState().length.should.be.exactly(1);
            store.getState()[0].should.be.exactly(1);
          });

        });

        context('undo stack position the head', () => {

          beforeEach(() => {
            action = store.dispatch(Actions.redo());
            action.exec();
          });

          it('should not invoke the reducer', () => {
            reducerSpy.called.should.be.exactly(false);
          });

        });

      });

      context('the undo stack is empty', () => {

        beforeEach(() => {
          action = store.dispatch(Actions.redo());
          action.exec();
        });

        it('should not invoke the reducer', () => {
          reducerSpy.called.should.be.exactly(false);
        });

      });

    });

  });

  context('mutliple actions in a transaction', () => {

    describe('#undo()', () => {

      beforeEach(() => {
        store.dispatch(beginTransaction()).exec();
        store.dispatch(pushInTransaction(0)).exec();
        store.dispatch(pushInTransaction(1)).exec();
        store.dispatch(pushInTransaction(3)).exec();
        store.dispatch(popInTransaction()).exec();
        store.dispatch(pushInTransaction(2)).exec();
        store.dispatch(commitTransaction()).exec();
        action = store.dispatch(Actions.undo());
        action.exec();
      });

      it('works', () => {
        store.getState().length.should.be.exactly(0);
      });

    });

    describe('#redo()', () => {

      beforeEach(() => {
        store.dispatch(beginTransaction()).exec();
        store.dispatch(pushInTransaction(0)).exec();
        store.dispatch(pushInTransaction(1)).exec();
        store.dispatch(pushInTransaction(3)).exec();
        store.dispatch(popInTransaction()).exec();
        store.dispatch(pushInTransaction(2)).exec();
        store.dispatch(commitTransaction()).exec();
        store.dispatch(Actions.undo()).exec();
        action = store.dispatch(Actions.redo());
        action.exec();
      });

      it('works', () => {
        store.getState().length.should.be.exactly(3);
        store.getState()[0].should.be.exactly(0);
        store.getState()[1].should.be.exactly(1);
        store.getState()[2].should.be.exactly(2);
      });

    });

  });

  context('an action that isn\'t undoable', () => {

    beforeEach(() => {
      store.dispatch(passThrough());
    });

    it('should not increment the position', () => {
      store.getState().undoStack.pos.should.be.exactly(0);
    });

    it('should not add an entry to the stack', () => {
      store.getState().undoStack.stack.length.should.be.exactly(0);
    });

  });

});
