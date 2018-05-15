'use strict';

function ClientWebhooks() {
  this.webhooksMap = {};
  this.LOG = 'ClientWebhooks';

  this.pushMany = function(webhooks) {
    for (let prop in webhooks) {
      this.push(prop, webhooks[prop]);
    }
  }

  this.push = function(webhookId, psid) {
    console.log(this.LOG, 'push', arguments);
    this.webhooksMap[webhookId] = psid;
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
}
let clientWebhooksInstance = new ClientWebhooks();
module.exports = clientWebhooksInstance;