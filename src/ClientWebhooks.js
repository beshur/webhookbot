'use strict';
const fs = require('fs');

function ClientWebhooks(config, firebase) {
  this.webhooksMap = {};
  this.firebase = firebase;
  this.LOG = 'ClientWebhooks';

  this.loadLocal = function() {
    fs.readFile(config.WEBHOOKS_FILE_PATH, 'utf8', function(err, data) {
      if(err) {
        return console.error(this.LOG, "loadLocal", err);
      }

      let webhooksJson;
      try {
        webhooksJson = JSON.parse(data);
      } catch(err) {
        return console.error(this.LOG, "loadLocal corrupted file", err);
      }
      console.log("The webhooks file was loaded!", webhooksJson );

      this.pushMany(webhooksJson);

    }.bind(this)); 
  }

  this.saveLocal = function() {
    fs.writeFile(config.WEBHOOKS_FILE_PATH, JSON.stringify(this.webhooksMap), function(err) {
      if(err) {
        return console.error(this.LOG, "saveLocal", err);
      }
      console.log("The webhooks file was saved!");
    }); 
  }

  this.pushMany = function(webhooks) {
    for (let prop in webhooks) {
      this.push(prop, webhooks[prop], 'skipSave');
    }
  }

  this.push = function(webhookId, psid, skipSave) {
    console.log(this.LOG, 'push', arguments);
    this.webhooksMap[webhookId] = psid;

    if (!skipSave) {
      this.saveLocal();
    }
  }

  this.getWebhook = function(webhookId) {
    console.log(this.LOG, 'getWebhook', arguments);
    return this.webhooksMap[webhookId];
  }

  this.pull = function(webhookId) {
    console.log(this.LOG, 'pull', arguments);
    delete this.webhooksMap[webhookId];
  }

  this.status = function() {
    return this.webhooksMap;
  }

  this.init = function() {
    console.log(this.LOG, 'init');
    this.loadLocal();
  }

  this.init();
}
module.exports = ClientWebhooks;