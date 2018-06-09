'use strict';
const AbstractCommandController = require('./AbstractCommandController'),
  WebhookType = require('./WebhookTypes').Telegram;

/*
 * Facebook Messenger Controller
 * Handles Facebook chat events / messages
 */
class TgCommandController extends AbstractCommandController {
  constructor(props) {
    super(props);
    this.LOG = 'TgCommandController';
    this.webhookType = WebhookType;
  }
}

module.exports = TgCommandController;