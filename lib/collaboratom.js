'use babel';

import CollaboratomView from './collaboratom-view';
import { CompositeDisposable } from 'atom';

export default {

  collaboratomView: null,
  modalPanel: null,
  subscriptions: null,

  activate(state) {
    this.collaboratomView = new CollaboratomView(state.collaboratomViewState);
    this.chatPanel = atom.workspace.addRightPanel({
      item: this.collaboratomView.getChatElement(),
      visible: false
    });

    // Events subscribed to in atom's system can be easily cleaned up with a CompositeDisposable
    this.subscriptions = new CompositeDisposable();

    // Register command that toggles this view
    this.subscriptions.add(atom.commands.add('atom-workspace', {
      'collaboratom:toggle': () => this.toggle()
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
  }

};
