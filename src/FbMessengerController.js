'use strict';
const _ = require('underscore'),
  stringArgv = require('string-argv'),
  AbstractCommandController = require('./AbstractCommandController'),
  WebhookType = require('./WebhookTypes').Facebook,
  {HELP_START, HELP_UPDATE, HELP_TEXT_REQUEST, HELP_TEXT_COMMANDS} = require('./Texts');

/*
 * Facebook Messenger Controller
 * Handles Facebook chat events / messages
 */
class FbMessengerController extends AbstractCommandController {
  constructor(props) {
    super(props);
    this.LOG = 'FbMessengerController';
    this.webhookType = WebhookType;
  }

  // Handles messaging_postbacks events
  handlePostback(senderId, receivedPostback) {
    console.log(this.LOG, 'handlePostback');
    // it's a hack
    this.handleMessage(senderId, _.extend(receivedPostback, {
      text: receivedPostback.payload
    }));
  }

  /*
   * Handle actual webhook hit
   */
  handleWebhookHit(hookId, senderId, label, body) {
    this.props.analytics.trackWebhookHit(senderId).catch();
    return this.callSendAPI(
      senderId,
      this.formatProcessedWebhookMessage(hookId, label, body),
      {
        'messaging_type': 'MESSAGE_TAG',
        'tag': 'NON_PROMOTIONAL_SUBSCRIPTION'
      }
    )
  }
}

module.exports = FbMessengerController;