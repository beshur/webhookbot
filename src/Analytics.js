'use strict';

const request = require('request');
const _ = require('underscore');
const WebhookTypes = require('./WebhookTypes');

class Analytics {
  constructor(GA_ID, webhookType) {
    this.GA_ID = GA_ID;
    this.LOG = 'Analytics';
    this.collectEndpoint = 'https://www.google-analytics.com/collect';
    this.type;
    this.typeLabel;

    this.setupAnalytics(webhookType);
  }

  setupAnalytics(webhookType) {
    this.type = webhookType;
    this.typeLabel = _.invert(WebhookTypes)[webhookType];
  }

  get eventTpl() {
    return {
      v: 1,
      t: 'event',
      tid: this.GA_ID,
      cid: '',
      ec: 'webhook',
      ea: ''
    }
  }

  getEventObj(eventAction, userId) {
    return _.defaults({
      cid: userId,
      ea: eventAction,
      el: this.typeLabel
    }, this.eventTpl);
  };

  trackNewWebhook(userId) {
    return this.collect(this.getEventObj('created', userId));
  }

  trackUpdateWebhook(userId) {
    return this.collect(this.getEventObj('updated', userId));
  }

  trackDeleteWebhook(userId) {
    return this.collect(this.getEventObj('deleted', userId));
  }

  trackWebhookHit(userId) {
    return this.collect(this.getEventObj('hit', userId));
  }

  collect(eventData) {
    return new Promise((resolve, reject) => {
      request({
        'uri': this.collectEndpoint,
        'qs': eventData,
        'method': 'POST'
      }, (err, res, body) => {
        if (err) {
          console.warn(this.LOG, 'trackNewWebhook error:' + err);
          reject(err);
          return;
        }
        resolve();
      });
    });
  }
}

module.exports = Analytics;