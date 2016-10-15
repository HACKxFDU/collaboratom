'use babel';

import ChatView from './chat-view';
import { CompositeDisposable } from 'atom';

let socket = require('socket.io-client')('http://chattttt.mybluemix.net:3000');
let number = 0;

export default {

  collaboratomView: null,
  modalPanel: null,
  subscriptions: null,

  activate(state) {
    this.collaboratomView = new ChatView(state.collaboratomViewState);
    this.chatPanel = atom.workspace.addRightPanel({
      item: this.collaboratomView.getChatElement()[0],
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

  },
  deactivate() {
    this.modalPanel.destroy();
    this.subscriptions.dispose();
    this.collaboratomView.destroy();
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
    const randomstring = require('randomstring');
    let session = randomstring.generate(32);
    socket.on('connect', () => {
      socket.emit('session', session, (stat) => {
        console.log(stat);
      });
      socket.on('clientNumber', (n) => {
        if (n > 1 && number == 0) {
          number = n;
          let editor = atom.workspace.getActiveTextEditor();
          editor.buffer.onDidChange((event) => {
            socket.emit('sendChange', data, (stat) => {
              // send change
              console.log(stat);
            });
          });
        }
      });
      socket.on('receiveChange', (data) => {
        // apply change
      });
    });
  },

  disconnection() {
    socket.emit('cancel', session, (stat) => {
      console.log(stat);
      number = 0;
    });
  },

  connection() {

  }

};
