'use babel';

import $ from 'jquery';
import {CompositeDisposable} from 'atom';

var socket = require('socket.io-client')('http://localhost:3000');

export default class ChatView {

  constructor(serializedState) {
    // Create chatMessage element
    var chatTemplate = `
    <div class="chat-view">
        <div class="chat-box">
            <ul class="chat-list">
                <li class="chat-item"><span class="username">user1:</span> test test tesetestestsetsetest testset</li>
                <li class="chat-item"><span class="username">user2:</span> test</li>
            </ul>
        </div>
        <div class="input-view">
            <input class="message-box native-key-bindings" /> <!--this sucks-->
            <atom-text-editor class="editor mini" tabindex="-1" data-grammar="text plain null-grammar" mini="" data-encoding="utf8"></atom-text-editor>
        </div>
    </div>
    `;
    var $chatMessage = this.$chatElement = $(chatTemplate);

    this.subscriptions = new CompositeDisposable();
    this.username = 'octocat' + (new Date()).getTime();
    this.handleSockets();
    this.handleEvents();
  }

  handleSockets() {
      console.log("handleSockets");
      socket.on('connect', () => {
          socket.emit('atom:user', this.username, (id) => {
              this.uuid = id;
              console.log(`atom:user - ${id}`);
          });
          socket.on('atom:message', (message) => {
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
      var $messageBox = $('.message-box');
      var message = $messageBox.val();
      $messageBox.val('');
      socket.emit('atom:message', {
          text: message,
          uuid: this.uuid,
          username: this.username,
          roomId: 1
      });
  }

  addMessage(message) {
      $('.chat-list').append($(`<li class="chat-item"><span class="username">${message.username}</span> ${message.text}</li>`));
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
