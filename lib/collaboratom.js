'use babel';

import ChatView from './chat-view';
import SessionIdView from './sessionId-view';
import UsernameView from './username-view';
import $ from 'jquery';
import { CompositeDisposable } from 'atom';

// let socket = require('socket.io-client')('http://chattttt.mybluemix.net');
let socket = require('socket.io-client')('http://localhost:3000');
let number = 0;
var triggerPush = true;

export default {

  activate(state) {
    var usernameView = this.usernameView = new UsernameView();
    this.usernamePanel = atom.workspace.addModalPanel({
      item: usernameView.getElement()[0],
      visible: false
    });

    var sessionIdView = this.sessionIdView = new SessionIdView();
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
    this.chatView.destroy();
  },

  handleEvents() {
    $('body').on('keydown', (e) => {
      if (e.keyCode == 27) { // ESC
        this.sessionIdPanel.hide();
        this.usernamePanel.hide();
      }
    });
    $('body').on('keydown', '.session-id-box', (e) => {
      if (e.keyCode == 13) { // ENTER
        let sessionId = $('.session-id-box')[0].getModel().getText();
        this.sessionId = sessionId;
        this.sessionIdPanel.hide();

        // socket.on('connect', () => {
          let data = {'session': sessionId, 'username': this.username};
          socket.emit('join', data, (roomId) => {
            this.roomId = roomId;
            console.log(`roomId is ${roomId}`);
          })
          this.handleClientNumber();
          socket.on('receiveChange', this.changeBuffer);
        // });
      }
    });
    $('body').on('keydown', '.username-box', (e) => {
      if (e.keyCode == 13) { // ENTER
        var username = $('.username-box')[0].getModel().getText();
        this.usernamePanel.hide();
        this.username = username;
      }
    });
  },

  // serialize() {
    // return {
      // collaboratomViewState: this.chatView.serialize()
    // };
  // },

  toggle() {
    console.log('Collaboratom was toggled!');
    if (!this.username) {
      this.usernamePanel.show();
    } else {
      if (!this.chatPanel) {
        var chatView = this.chatView = new ChatView(this.username, socket);
        this.chatPanel = atom.workspace.addRightPanel({
          item: chatView.getChatElement()[0],
          visible: true
        });
      } else {
        this.chatPanel.isVisible() ? this.chatPanel.hide() : this.chatPanel.show();
      }
    }
  },

  newsession() {
    if (!this.username) {
      this.usernamePanel.show();
      return;
    }
    if (number > 0) {
      return;
    }
    const randomstring = require('randomstring');
    let sessionId = randomstring.generate(32);
    atom.notifications.addInfo(`Your session ID is ${sessionId}`);
    console.log(sessionId);
    // socket.on('connect', () => {
      let editor = atom.workspace.getActiveTextEditor();
      let data = {'session': sessionId, 'username': this.username, 'text': editor.getText()};
      socket.emit('session', data, (roomId) => {
        this.roomId = roomId;
        console.log(`roomId is ${roomId}`);
      });

      this.handleClientNumber();
      socket.on('receiveChange', this.changeBuffer);
    // });
  },

  disconnection() {
    socket.emit('disconnection', sessionId, (stat) => {
      console.log(stat);
      number = 0;
    });
  },

  connection() {
    if (!this.username) {
      this.usernamePanel.show();
      return;
    }
    this.sessionIdPanel.show();
    // $('.session-id-box').focus();
  },

  changeBuffer(data) {
    // apply change
    if (data.username === this.username) {
      return;
    }

    let editor = atom.workspace.getActiveTextEditor();
    let buffer = editor.buffer;
    triggerPush = false;
      if (data['changeType'] === 'deletion') {
        let oldRangeStart = [data.oldRange.start.row, data.oldRange.start.column];
        editor.buffer.delete(new Range([data.oldRange.start.row, data.oldRange.start.column], [data.oldRange.end.row, data.oldRange.end.column]));
        editor.cursors[0].setBufferPosition(oldRangeStart);
      } else {
        let oldRangeStart = [data.oldRange.start.row, data.oldRange.start.column];
        if (data.changeType === 'substitution') {
          editor.buffer.delete(new Range([data.oldRange.start.row, data.oldRange.start.column], [data.oldRange.end.row, data.oldRange.end.column]));
        }
        editor.setTextInBufferRange(new Range([data.newRange.start.row, data.newRange.start.column], [data.newRange.end.row, data.newRange.end.column]), data.newText);
        editor.cursors[0].setBufferPosition(oldRangeStart);
      }
    triggerPush = true;

  },

  isEqual(oldRange, newRange) {
    return (oldRange.start.row === newRange.start.row)
    && (oldRange.start.column === newRange.start.column)
    && (oldRange.end.column === newRange.end.column)
    && (oldRange.end.row === newRange.end.row);
  },

  generateJSONData(eventObj, changeType) {
    return {
      'username': this.username,
      'roomId': this.roomId,
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
    socket.on('clientNumber', (numberAndText) => {
      let n = numberAndText.number;
      let text = numberAndText.text;
      // FIXME
      let editor = atom.workspace.getActiveTextEditor();
      console.log(text);
      editor.setText(text);
    });
    this.setCursorListener();
  },

  setCursorListener() {
    let editor = atom.workspace.getActiveTextEditor();
    // $('.editor.is-focused').on('keydown', ())

    editor.buffer.onDidChange((event) => {
      if (!triggerPush) {
        return;
      }
      let data;
      if ((event.newText === event.oldText) && this.isEqual(event.oldRange, event.newRange)) {
        return;
      }
      if (!(event.newText === '\n') && (event.newText.length === 0)) {
        data = this.generateJSONData(event, 'deletion');
      } else if (event.oldRange.containsRange(event.newRange) || event.newRange.containsRange(event.oldRange)) {
        data = this.generateJSONData(event, 'substitution');
      } else {
        data = this.generateJSONData(event, 'insertion');
      }
      socket.emit('sendChange', data);
    });
  }

};
