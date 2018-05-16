'use strict';
const firebase = require('firebase');
const _ = require('underscore');
const webhookSchema = {
  'userId': '',
  'createdOn': '',
  'lastHitOn': ''
}

const webhooksRef = 'webhooks/';

let firebaseApp = function(firebaseConfig, analyticsInstance) {
  this.app = {};
  this.database = {};
  this.webhooksRef = {};
  this.LOG = 'Firebase';

  this.analytics = analyticsInstance;

  this.init = function() {
    this.app = firebase.initializeApp(firebaseConfig);
    this.database = this.app.database();
    this.webhooks = {};

    console.log(this.LOG, 'ready steady');
    this.subscribe();
  }
  this.subscribe = () => {
    this.webhooksRef = this.database.ref(webhooksRef);
    // this.webhooksRef.on('value', this.handleData);
  }

  this.handleData = (snapshot) => {
    let itemsBase = snapshot.val();
    for (let prop in itemsBase) {
      this.webhooks[prop] = itemsBase[prop]['userId'];
    }
    console.log(this.LOG, 'handleData', this.webhooks);
  }

  this.generateNewWebhook = function(userId) {
    return _.defaults({
      userId: userId,
      createdOn: Date.now()
    }, webhookSchema);
  }

  this.createWebhook = (userId) => {
    let newWebHook = this.webhooksRef.push(this.generateNewWebhook(userId));
    this.analytics.trackWebhookHit(userId).catch();
    return newWebHook;
  }

  this.webhookHit = (webhookId) => {
    let updates = {};
    return new Promise((resolve, reject) => {

      this.getWebhook(webhookId).then(webhookObj => {
        if (webhookObj === null) {
          return reject('WEBHOOK:NULL');
        }

        updates[webhooksRef + webhookId] = _.extend(webhookSchema, webhookObj, {
          lastHitOn: Date.now()
        });

        return this.database.ref().update(updates)
          .then(success => {
            resolve(updates);
            this.analytics.trackWebhookHit(webhookObj.userId).catch();
          })
          .catch(reject);
      }).catch(err => {
        console.err(this.LOG, 'webhookHit -> getWebhook err', err);
        reject(err);
      });
    });
  }

  this.getWebhook = (webhookId) => {
    return new Promise((resolve, reject) => {
      this.database.ref(webhooksRef + webhookId).once('value', snapshot => resolve(snapshot.val()));
    });
  }

  this.listWebhooks = function(userId) {
    console.log(this.LOG, 'listWebhooks for ', userId, typeof userId);
    return new Promise((resolve, reject) => {
      this.webhooksRef.orderByChild('userId').equalTo(userId).once('value', success => {
        let list = success.val();
        console.log(this.LOG, 'listWebhooks for ', userId, list);
        resolve(list)
      });
    });
  }

  this.init();
}

module.exports = firebaseApp;