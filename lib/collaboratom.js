'use babel';

import ChatView from './chat-view';
import SessionIdView from './sessionId-view';
import $ from 'jquery';
import { CompositeDisposable } from 'atom';

let socket = require('socket.io-client')('http://localhost:3000');
let number = 0;

export default {

  collaboratomView: null,
  modalPanel: null,
  subscriptions: null,
  sessionId: null,

  activate(state) {
    this.collaboratomView = new ChatView(state.collaboratomViewState);
    this.chatPanel = atom.workspace.addRightPanel({
      item: this.collaboratomView.getChatElement()[0],
      visible: false
    });

    var sessionIdView = new SessionIdView();
    this.sessionIdPanel = atom.workspace.addModalPanel({
      item: sessionIdView.getElement()[0],
      visible: false
    });

    // Events subscribed to in atom's system can be easily cleaned up with a CompositeDisposable
    this.subscriptions = new CompositeDisposable();

    // Register command that toggles this view
    this.subscriptions.add(atom.commands.add('atom-workspace', {
      'collaboratom:toggle': () => this.toggle()
    }));
    this.subscriptions.add(atom.commands.add('atom-workspace', {
      'collaboratom:newsession': () => this.newsession()
    }));
    this.subscriptions.add(atom.commands.add('atom-workspace', {
      'collaboratom:connection': () => this.connection()
    }));
    this.subscriptions.add(atom.commands.add('atom-workspace', {
      'collaboratom:disconnection': () => this.disconnection()
    }));

    this.handleEvents();
  },

  deactivate() {
    this.chatPanel.destroy();
    this.sessionIdPanel.destroy();
    this.subscriptions.dispose();
    this.collaboratomView.destroy();
  },

  handleEvents() {
    $('body').on('keydown', (e) => {
      if (e.keyCode == 27) { // ESC
        this.sessionIdPanel.hide();
      }
    });
    $('body').on('keydown', '.session-id-box', (e) => {
      if (e.keyCode == 13) { // ENTER
        let sessionId = $('.session-id-box')[0].getModel().getText();
        this.sessionIdPanel.hide();
        handleClientNumber();
        socket.on('receiveChange', changeBuffer);
        this.sessionId = sessionId;
      }
    });
  },

  serialize() {
    return {
      collaboratomViewState: this.collaboratomView.serialize()
    };
  },

  toggle() {
    console.log('Collaboratom was toggled!');
    return (
      this.chatPanel.isVisible() ?
      this.chatPanel.hide() :
      this.chatPanel.show()
    );
  },

  newsession() {
    if (number > 0) {
      return;
    }
    const randomstring = require('randomstring');
    let sessionId = randomstring.generate(32);
    socket.emit('session', sessionId, (stat) => {
      console.log(stat);
    });
    handleClientNumber();
    socket.on('receiveChange', changeBuffer);
  },

  disconnection() {
    socket.emit('cancel', sessionId, (stat) => {
      console.log(stat);
      number = 0;
    });
  },

  connection() {
    this.sessionIdPanel.show();
    // $('.session-id-box').focus();
  },

  changeBuffer(data) {
    // apply change
    let editor = atom.workspace.getActiveTextEditor();
    let buffer = editor.buffer;
    if (data['changeType'] === 'deletion') {
      let oldRangeStart = [data.oldRange.start.row, data.oldRange.start.column];
      buffer.delete(new Range([data.oldRange.start.row, data.oldRange.start.column], [data.oldRange.end.row, data.oldRange.end.column]));
      editor.setBufferPosition(oldRangeStart);
    } else {
      let oldRangeStart = [data.oldRange.start.row, data.oldRange.start.column];
      if (data.changeType === 'subscription') {
        buffer.delete(new Range([data.oldRange.start.row, data.oldRange.start.column], [data.oldRange.end.row, data.oldRange.end.column]));
      }
      editor.setTextInBufferRange(new Range([data.newRange.start.row, data.newRange.start.column], [data.newRange.end.row, data.newRange.end.column]), data.newText);
      editor.setBufferPosition(oldRangeStart);
    }
  },

  isEqual(oldRange, newRange) {
    return (oldRange.start.row === newRange.start.row)
    && (oldRange.start.column === newRange.start.column)
    && (oldRange.end.column === newRange.end.column)
    && (oldRange.end.row === newRange.end.row);
  },

  generateJSONData(eventObj, changeType) {
    return {
      'changeType': changeType,
      'oldRange': {
        'start': {
          'row': eventObj.oldRange.start.row,
          'column': eventObj.oldRange.start.column,
        },
        'end': {
          'row': eventObj.oldRange.end.row,
          'column': eventObj.oldRange.end.column,
        }
      },
      'newRange': {
        'start': {
          'row': eventObj.newRange.start.row,
          'column': eventObj.newRange.start.column,
        },
        'end': {
          'row': eventObj.newRange.end.row,
          'column': eventObj.newRange.end.column,
        }
      },
      'oldText': eventObj.oldText,
      'newText': eventObj.newText
    }
  },

  handleClientNumber() {
    socket.on('clientNumber', (n) => {
      if (n > 1 && number == 0) {
        number = n;
        let editor = atom.workspace.getActiveTextEditor();
        editor.buffer.onDidChange((event) => {
          let data;
          if ((event.newText === event.oldText) && isEqual(event.oldRange, event.newRange)) {
            return;
          }
          if (!(event.newText === '\n') && (event.newText.length === 0)) {
            data = generateJSONData(event, 'deletion');
          } else if (event.oldRange.containsRange(event.newRange) || event.newRange.containsRange(event.oldRange)) {
            data = generateJSONData(event, 'substitution');
          } else {
            data = generateJSONData(event, 'insertion');
          }
          socket.emit('sendChange', data, (stat) => {
            console.log(stat);
          });
        });
      }
    });
  }

};
