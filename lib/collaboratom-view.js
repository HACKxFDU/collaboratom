'use babel';

export default class ChatxView {

  constructor(serializedState) {
    // Create root element
    this.chatElement = document.createElement('div');
    this.chatElement.classList.add('chatx');

    // Create chatMessage element
    const chatMessage = document.createElement('div');
    chatMessage.textContent = 'The Chatx package is Alive! It\'s ALIVE!';
    chatMessage.classList.add('chat-message');
    this.chatElement.appendChild(chatMessage);
  }

  // Returns an object that can be retrieved when package is activated
  serialize() {}

  // Tear down any state and detach
  destroy() {
    this.element.remove();
  }

  getChatElement() {
      return this.chatElement;
  }

}
