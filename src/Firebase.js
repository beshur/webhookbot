'use strict';
const firebase = require('firebase');
const _ = require('underscore');
const Config = require('./Config');

const webhookSchema = {
  'userId': '',
  'createdOn': '',
  'lastHitOn': ''
}

const webhooksRef = 'webhooks/';

let firebaseApp = function() {
  this.app = {};
  this.database = {};
  this.webhooksRef = {};
  this.LOG = 'Firebase';

  this.init = function() {
    this.app = firebase.initializeApp({
      "apiKey": Config.get('WHB_FIREBASE_apiKey'),
      "authDomain": Config.get('WHB_FIREBASE_authDomain'),
      "databaseURL": Config.get('WHB_FIREBASE_databaseURL'),
      "projectId": Config.get('WHB_FIREBASE_projectId'),
      "storageBucket":Config.get('WHB_FIREBASE_storageBucket'),
      "messagingSenderId": Config.get('WHB_FIREBASE_messagingSenderId')
    });
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
    return this.webhooksRef.push(this.generateNewWebhook(userId));
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
            resolve(webhookObj);
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

  this.deleteWebhook = (webhookId, senderId) => {
    return new Promise((resolve, reject) => {
      this.getWebhook(webhookId)
        .then(webhookObj => {
          if (webhookObj.userId !== senderId) {
            const errorText = `401 Unauthorized. Trying to delete someone else webhook id: ${webhookId} sender: ${senderId}`;
            console.warn(errorText);
            reject(errorText);
            return;
          }
          this.database.ref(webhooksRef + webhookId).remove()
            .then(resolve)
            .catch(reject);
        }).catch(reject);
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