'use strict';

const request = require('request');
const _ = require('underscore');
const collectEndpoint = 'https://www.google-analytics.com/collect';
const WebhookTypes = require('./WebhookTypes');

function Analytics(GA_ID, webhookType) {
  this.GA_ID = GA_ID;
  this.LOG = 'Analytics';

  this.setupAnalytics = (webhookType) => {
    this.type = webhookType;
    this.typeLabel = _.invert(WebhookTypes)[webhookType];
  }

  this.setupAnalytics(webhookType);

  this.eventTpl = {
    v: 1,
    t: 'event',
    tid: this.GA_ID,
    cid: '',
    ec: 'webhook',
    ea: ''
  }

  this.trackNewWebhook = (userId) => {
    const event = _.defaults({
      cid: userId,
      ea: 'created',
      el: this.typeLabel
    }, this.eventTpl);

    return this.collect(event);
  }

  this.trackUpdateWebhook = (userId) => {
    const event = _.defaults({
      cid: userId,
      ea: 'updated',
      el: this.typeLabel
    }, this.eventTpl);

    return this.collect(event);
  }

  this.trackDeleteWebhook = (userId) => {
    const event = _.defaults({
      cid: userId,
      ea: 'deleted',
      el: this.typeLabel
    }, this.eventTpl);

    return this.collect(event);
  }

  this.trackWebhookHit = (userId) => {
    const event = _.defaults({
      cid: userId,
      ea: 'hit',
      el: this.typeLabel
    }, this.eventTpl);
    return this.collect(event);
  }

  this.collect = function(eventData) {
    return new Promise((resolve, reject) => {
      request({
        'uri': collectEndpoint,
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