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

var selections = [];
var selTem = '<div style="width: 0; background-color: pink; opacity: 0.5; height: 18px; position: absolute;" >';

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

    var cursorTemplate = `
    <div id="cursor" style="background-color: red; width: 2px; height: 18px; position: absolute;"></div>
    `
    this.$cursor = $(cursorTemplate);
    $('.item-views').append(this.$cursor);

    this.$selection = $('<div id="selection" style="width: 0; background-color: pink; opacity: 0.5; height: 18px; position: absolute;" >')
    $('.item-views').append(this.$selection);

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
    let editor = atom.workspace.getActiveTextEditor();
    this.subscriptions.add(editor.onDidChangeSelectionRange((e) => {
      setTimeout(() => {
        socket.emit('sendChange', {
          oldRange: e.newBufferRange,
          newRange: e.newBufferRange,
          'username': this.username,
          'roomId': this.roomId,
          'changeType': 'range',
        });
      }, 10)
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

    atom.workspace.observeTextEditors((editor) => {
      let buffer = editor.buffer;
      triggerPush = false;
      
      var {left, top} = editor.pixelPositionForScreenPosition({row: data.oldRange.start.row, column: data.oldRange.start.column});
      $('#cursor').css({left: left + 42, top: top});

      if (data['changeType'] === 'deletion') {
        let oldRangeStart = [data.oldRange.start.row, data.oldRange.start.column];
        editor.buffer.delete([[data.oldRange.start.row, data.oldRange.start.column], [data.oldRange.end.row, data.oldRange.end.column]]);
        editor.cursors[0].setBufferPosition(oldRangeStart);
        
        // console.log(editor.pixelPositionForScreenPosition({row: data.oldRange.start.row, column: data.oldRange.start.column}));
      } else {
        let oldRangeStart = [data.oldRange.start.row, data.oldRange.start.column];
        if (data.changeType === 'substitution') {
          editor.buffer.delete([[data.oldRange.start.row, data.oldRange.start.column], [data.oldRange.end.row, data.oldRange.end.column]]);
          editor.setTextInBufferRange([[data.newRange.start.row, data.newRange.start.column],
            [data.newRange.start.row, data.newRange.start.column]], data.newText);
        }
        if (data.changeType === 'insertion') {
          editor.setTextInBufferRange([[data.newRange.start.row, data.newRange.start.column],
            [data.newRange.start.row, data.newRange.start.column]], data.newText);
          // editor.cursors[0].setBufferPosition(oldRangeStart);
        }
        if (data.changeType === 'range') {
          var {left, top} = editor.pixelPositionForScreenPosition({row: data.oldRange.start.row, column: data.oldRange.start.column});
          var tmp = editor.pixelPositionForScreenPosition({row: data.oldRange.end.row, column: data.oldRange.end.column});
          var rightPos = tmp.left, bottom = tmp.top;
          if (left > rightPos) {
            let tmp = left;
            left = rightPos;
            rightPos = tmp;
          }
          if (top > bottom) {
            let tmp = top;
            top = bottom;
            bottom = tmp;
          }
          selections.forEach(el => el.remove());
          selections = [];
          if (top === bottom) {
            $('#selection').css({left: left + 42, top: top, width: rightPos - left});
          } else {
            $('#selection').css({left: left + 42, top: top, width: '100%'});
            for (var i = top + 18; i < bottom; i += 18) {
              selections.push($(selTem).css({left: 42, top: i, width: '100%'}));
            }
            selections.push($(selTem).css({left: 42, top: bottom, width: rightPos}));
            selections.forEach((el) => {
              $('.item-views').append(el);
            });
          }
        }
      }
      triggerPush = true;
    });
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

    var didChange = false

    editor.cursors[0].onDidChangePosition((e) => {
      setTimeout(() => {
        // if (didChange) {
        //   didChange = false
        // }
        var position = e.newBufferPosition;
        socket.emit('sendChange', {
          oldRange: {
            start: e.newBufferPosition,
            end: e.newBufferPosition,
          },
          newRange: {
            start: e.newBufferPosition,
            end: e.newBufferPosition,
          },
          'username': this.username,
          'roomId': this.roomId,
          'changeType': 'move',
        });
      }, 10)
    });

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
      didChange = true
      socket.emit('sendChange', data);
    });
  }

};
