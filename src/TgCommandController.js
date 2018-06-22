'use strict';
const AbstractCommandController = require('./AbstractCommandController'),
  WebhookType = require('./WebhookTypes').Telegram,
  {HELP_START, HELP_UPDATE, HELP_TEXT_REQUEST, HELP_TEXT_COMMANDS} = require('./Texts');


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
  /*
   * Handle /start command
   * @override
   * @param string senderId
   * @param string message
   */
  handleStart(senderId, message) {
    this.callSendAPI(senderId, {
      "text": HELP_START 
    }, {
      "parse_mode": "Markdown"
    });
  }
  /*
   * Handle /list command
   * @override
   */
  handleHelp(senderId) {
    this.callSendAPI(senderId, {
      "text": `${HELP_TEXT_COMMANDS}\n\n${HELP_TEXT_REQUEST}`
    }, {
      "parse_mode": "Markdown"
    });
  }
}

module.exports = TgCommandController;