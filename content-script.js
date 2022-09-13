'use strict';
class TempoExtension {
  static PULL_WORK = 'Pull Work';
  static DEFAULT_TIMER_INTERVAL_SECONDS = 60;
  static clickPullWorkInterval = null;
  static remainingTimeInterval = null;
  static lastMinutesMatcher = /^(?:\dm )?\d{1,2}s$/;

  static start() {
    if (this.getPullWorkButton()) {
      this.registerClickPullWorkInterval();
    } else if (this.getRemainingTimeSpan()) {
      this.registerRemainingTimeInterval();
    }
  }

  static getTimerInterval() {
    return this.DEFAULT_TIMER_INTERVAL_SECONDS * 1000;
  }

  static getPullWorkButton() {
    const buttons = document.querySelectorAll('button');
    for (let elem of buttons) {
      if (elem.textContent === this.PULL_WORK) {
        return elem;
      }
    }

    return null;
  }

  static clickPullWork() {
    const button = this.getPullWorkButton();

    if (button) {
      button.click();
    } else {
      this.notifyUser('Ticket fetched');
      clearInterval(this.clickPullWorkInterval);
      this.clickPullWorkInterval = null;
      this.registerRemainingTimeInterval();
    }
  }

  static getRemainingTimeSpan() {
    return document.querySelector('div[data-test-id="CircularProgressbarWithChildren"]')?.querySelector('span');
  }

  static checkRemainingTime() {
    const span = this.getRemainingTimeSpan();

    if (span) {
      const remainingTime = span.textContent;
      if (this.lastMinutesMatcher.test(remainingTime)) {
        this.notifyUser(`Last minutes of SLA! ${remainingTime} remained`);
      }
    } else {
      this.notifyUser('No ticket');
      clearInterval(this.remainingTimeInterval);
      this.remainingTimeInterval = null;
      this.registerClickPullWorkInterval();
    }
  }

  static notifyUser(message) {
    chrome.runtime.sendMessage(
      {
        action: 'notify-user',
        message
      },
      function(response) {
        if (response.action !== 'done') {
          console.error('an error occured during notify user', response.error);
        }
      }
    );
  }

  static registerClickPullWorkInterval() {
    this.clickPullWorkInterval = setInterval(
      this.clickPullWork.bind(this),
      this.getTimerInterval());
  }

  static registerRemainingTimeInterval() {
    this.remainingTimeInterval = setInterval(
      this.checkRemainingTime.bind(this),
      this.getTimerInterval());
  }
}

setTimeout(TempoExtension.start.bind(TempoExtension), 10000);
