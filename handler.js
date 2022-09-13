'use strict';
class Handler {
  static handleOnMessage(request, sender, sendResponse) {
    if (request.action === 'notify-user') {
      this.notifyUser(request.message);
    }

    sendResponse({ action: 'done' });
  }

  static notifyUser(message) {
    chrome.notifications.create({
      type: 'basic',
      iconUrl: 'icons/favicon.ico',
      title: 'Tempo Extension',
      message,
      silent: false,
    });
  }
}

chrome.runtime.onMessage.addListener(Handler.handleOnMessage.bind(Handler));
