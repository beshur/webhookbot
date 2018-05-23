'use strict';

const request = require('request');
const _ = require('underscore');
const collectEndpoint = 'https://www.google-analytics.com/collect';

function Analytics(GA_ID) {
  this.GA_ID = GA_ID;
  this.LOG = 'Analytics';

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
      ea: 'created'
    }, this.eventTpl);

    return this.collect(event);
  }

  this.trackUpdateWebhook = (userId) => {
    const event = _.defaults({
      cid: userId,
      ea: 'updated'
    }, this.eventTpl);

    return this.collect(event);
  }

  this.trackWebhookHit = (userId) => {
    const event = _.defaults({
      cid: userId,
      ea: 'hit'
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