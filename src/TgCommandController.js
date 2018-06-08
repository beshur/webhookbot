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
    this.props = props;
    this.LOG = 'TgCommandController';
    this.webhookType = WebhookType;
  }

  /*
   * Handle actual webhook hit
   */
  handleWebhookHit(hookId, senderId, label, body) {
    this.props.analytics.trackWebhookHit(senderId).catch();
    return this.callSendAPI(
      senderId,
      this.formatProcessedWebhookMessage(hookId, label, body)
    )
  }
}

module.exports = TgCommandController;