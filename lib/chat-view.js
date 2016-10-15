'use babel';

import $ from 'jquery';
import {CompositeDisposable} from 'atom';

export default class ChatView {

  constructor(username, socket) {
    // Create chatMessage element
    this.socket = socket;
    var chatTemplate = `
    <div class="chat-view">
        <div class="chat-box">
            <ul class="chat-list">
            </ul>
        </div>
        <div class="input-view">
            <!--<input class="message-box native-key-bindings" /> <!--this sucks-->
            <atom-text-editor class="message-box editor mini" tabindex="-1" data-grammar="text plain null-grammar" mini="" data-encoding="utf8"></atom-text-editor>
        </div>
    </div>
    `;
    var $chatMessage = this.$chatElement = $(chatTemplate);
    console.log(username);
    this.subscriptions = new CompositeDisposable();
    this.username = username;
    this.handleSockets();
    this.handleEvents();
  }

  handleSockets() {
      console.log("handle chat Sockets");
      this.socket.on('connect', () => {
          this.socket.emit('atom:user', this.username, (id) => {
              this.uuid = id;
              console.log(`atom:user - ${id}`);
          });
          this.socket.on('atom:message', (message) => {
              this.addMessage(message);
              console.log(`atom:message - ${message}`);
          });
      });
  }

  handleEvents() {
      $('body').on('keydown', '.message-box', (e) => {
          if (e.keyCode == 13) {// ENTER KEY
              this.sendMessage();
          }
      })
  }

  sendMessage() {
      var messageBox = $('.message-box')[0];
      var message = messageBox.getModel().getText();
      messageBox.getModel().setText('');
      this.socket.emit('atom:message', {
          text: message,
          uuid: this.uuid,
          username: this.username,
          roomId: 1
      });
  }

  addMessage(message) {
      $('.chat-list').append($(`<li class="chat-item"><span class="username">${message.username}:</span> ${message.text}</li>`));
  }

  // Returns an object that can be retrieved when package is activated
  serialize() {}

  // Tear down any state and detach
  destroy() {
    this.$chatElement.remove();
  }

  getChatElement() {
      return this.$chatElement;
  }

}
