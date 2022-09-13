'use strict';
class TempoExtension {
  static PULL_WORK = 'Pull Work';
  static TIMED_OUT = 'TIMED OUT';
  static DEFAULT_TIMER_INTERVAL_SECONDS = 60;
  static clickPullWorkInterval = null;
  static remainingTimeObserver = null;
  static lastMinutesMatcher = /^\dm/;
  static lastMinutesSet = new Set();

  static start() {
    if (this.getPullWorkButton()) {
      this.registerClickPullWorkInterval();
    } else if (this.getRemainingTimeSpan()) {
      this.registerRemainingTimeObserver();
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
      this.registerRemainingTimeObserver();
    }
  }

  static getRemainingTimeSpan() {
    return document.querySelector('div[data-test-id="CircularProgressbarWithChildren"]')?.querySelector('span');
  }

  static checkRemainingTime(mutationList) {
    const targetTextContent = mutationList[0].target.textContent;
    const matches = targetTextContent.match(this.lastMinutesMatcher);
    if (matches) {
      const remainingTime = matches[0];
      if (!this.lastMinutesSet.has(remainingTime)) {
        this.lastMinutesSet.add(remainingTime);
        this.notifyUser(`Last minutes of SLA! ${remainingTime} remained`);
      }
    } else if (targetTextContent === this.TIMED_OUT) {
      this.notifyUser('SLA timed out');
      this.unregisterRemainingTimeObserver();
      this.lastMinutesSet.clear();
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

  static registerRemainingTimeObserver() {
    // Select the node that will be observed for mutations
    const targetNode = this.getRemainingTimeSpan();

    // Options for the observer (which mutations to observe)
    const config = {
      attributes: true,
      childList: true,
      subtree: true,
      characterData: true,
    };

    // Create an observer instance linked to the callback function
    this.remainingTimeObserver = new MutationObserver(this.checkRemainingTime.bind(this));

    // Start observing the target node for configured mutations
    this.remainingTimeObserver.observe(targetNode, config);
  }

  static unregisterRemainingTimeObserver() {
    this.remainingTimeObserver.disconnect();
    this.remainingTimeObserver = null;
  }
}

setTimeout(TempoExtension.start.bind(TempoExtension), 10000);
