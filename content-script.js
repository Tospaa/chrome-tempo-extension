'use strict';
class TempoExtension {
  static PULL_WORK = 'Pull Work';
  static TIMED_OUT = 'TIMED OUT';
  static CHARACTER_DATA = 'characterData';
  static CHILD_LIST = 'childList';
  static SPAN = 'SPAN';
  static ASSIGNEE = 'Assignee';
  static WORK_TYPE = 'Work type';
  static SLA = 'SLA';
  static DEFAULT_TIMER_INTERVAL_SECONDS = 15;
  static clickPullWorkInterval = null;
  static documentObserver = null;
  static lastMinutesMatcher = /^\dm/;
  static lastMinutesSet = new Set();

  static start() {
    this.registerDocumentObserver();
    if (this.getPullWorkButton()) {
      this.registerClickPullWorkInterval();
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
      this.unregisterClickPullWorkInterval();
    }
  }

  static getRemainingTimeSpan() {
    return document.querySelector('div[data-test-id="CircularProgressbarWithChildren"]')?.querySelector('span');
  }

  static notifyUser(message) {
    chrome.runtime.sendMessage(
      {
        action: 'notify-user',
        message
      },
      function (response) {
        if (response.action !== 'done') {
          console.error('an error occured during notify user', response.error);
        }
      }
    );
  }

  static registerClickPullWorkInterval() {
    if (this.clickPullWorkInterval !== null) return;

    this.lastMinutesSet.clear();

    this.clickPullWorkInterval = setInterval(
      this.clickPullWork.bind(this),
      this.getTimerInterval());
  }

  static unregisterClickPullWorkInterval() {
    clearInterval(this.clickPullWorkInterval);
    this.clickPullWorkInterval = null;
  }

  static registerDocumentObserver() {
    // Select the node that will be observed for mutations
    const targetNode = document;

    // Options for the observer (which mutations to observe)
    const config = {
      attributes: false,
      childList: true,
      subtree: true,
      characterData: true,
    };

    // Create an observer instance linked to the callback function
    this.documentObserver = new MutationObserver(this.checkDocumentChanges.bind(this));

    // Start observing the target node for configured mutations
    this.documentObserver.observe(targetNode, config);
  }

  static checkDocumentChanges(mutationList) {
    for (let mutation of mutationList) {
      const { detected, remainingTime } = this.detectLastMinutes(mutation);
      if (detected) {
        this.notifyUser(`Last minutes of SLA! ${remainingTime} remained`);
        break;
      }

      if (this.detectSlaTimedOut(mutation)) {
        this.notifyUser('SLA timed out');
        this.registerClickPullWorkInterval();
        break;
      }

      if (this.detectTicketProcessed(mutation)) {
        this.notifyUser('Ticket processed');
        this.registerClickPullWorkInterval();
        break;
      }

      if (this.detectTicketFetched(mutation)) {
        this.notifyUser('Ticket fetched');
        this.unregisterClickPullWorkInterval();
        break;
      }
    }
  }

  static detectLastMinutes(mutation) {
    let detected = false;
    let remainingTime;
    if (mutation.type !== this.CHARACTER_DATA) {
      return { detected, remainingTime };
    }

    const targetTextContent = mutation.target.textContent;
    const matches = targetTextContent.match(this.lastMinutesMatcher);
    if (matches) {
      remainingTime = matches[0];
      if (!this.lastMinutesSet.has(remainingTime)) {
        this.lastMinutesSet.add(remainingTime);
        detected = true;
      }
    }

    return { detected, remainingTime };
  }

  static detectTicketProcessed(mutation) {
    if (mutation.type !== this.CHILD_LIST || mutation.removedNodes?.length === 0) {
      return false;
    }

    for (let node of mutation.removedNodes) {
      const textsSet = this.findNestedTagTextContent(node, this.SPAN);
      if (textsSet.has(this.ASSIGNEE)
        && textsSet.has(this.WORK_TYPE)
        && textsSet.has(this.SLA)) {
        return true;
      }
    }

    console.log('detectTicketProcessed', mutation);
    return false;
  }

  static detectSlaTimedOut(mutation) {
    if (mutation.type !== this.CHARACTER_DATA) {
      return false;
    }

    const targetTextContent = mutation.target.textContent;

    return targetTextContent === this.TIMED_OUT;
  }

  static detectTicketFetched(mutation) {
    if (mutation.type !== this.CHILD_LIST || mutation.addedNodes?.length === 0) {
      return false;
    }

    for (let node of mutation.addedNodes) {
      const textsSet = this.findNestedTagTextContent(node, this.SPAN);
      if (textsSet.has(this.ASSIGNEE)
        && textsSet.has(this.WORK_TYPE)
        && textsSet.has(this.SLA)) {
        return true;
      }
    }

    return false;
  }

  static findNestedTagTextContent(node, tagName) {
    let textsSet = new Set();
    if (node.tagName === tagName) {
      textsSet.add(node.textContent);
    }

    if (!node.children[Symbol.iterator]) {
      // means node.children is not iterable
      return textsSet
    }

    for (let child of node.children) {
      const nestedTextsSet = this.findNestedTagTextContent(child, tagName);
      if (nestedTextsSet.size > 0) {
        nestedTextsSet.forEach(textsSet.add, textsSet);
      }
    }

    return textsSet;
  }
}

setTimeout(TempoExtension.start.bind(TempoExtension), 10000);
