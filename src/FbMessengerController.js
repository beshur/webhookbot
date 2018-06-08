'use strict';
const _ = require('underscore'),
  request = require('request'),
  stringArgv = require('string-argv'),
  AbstractCommandController = require('./AbstractCommandController'),
  {HELP_START, HELP_UPDATE, HELP_TEXT_REQUEST, HELP_TEXT_COMMANDS} = require('./Texts');

/*
 * Facebook Messenger Controller
 * Handles Facebook chat events / messages
 */
class FbMessengerController extends AbstractCommandController {
  constructor(props) {
    super(props);
    this.props = props;
    this.LOG = 'FbMessengerController';
  }

  handleMessage(senderId, message) {
    // #TODO: FSM
    console.log(this.LOG, 'handleMessage is postback', typeof message.payload !== 'undefined');

    // Check if the message contains text
    if (!message.text) {
      return this.callSendAPI(senderId, {
        "text": "You sent empty text"
      });
    }
    let receivedText = message.text;
    let commandText = stringArgv(receivedText);
    let command = commandText.shift();
    let commandArgs = (commandText.length) ? commandText : null;
    console.log('command, commandArgs', command, commandArgs);

    switch(command) {
      case '/start':
        this.handleStart(senderId);
        break;
      case '/create':
        let label = (commandArgs) ? commandArgs[0] : '';
        this.handleCreate(senderId, label);
        break;
      case '/update':
        let args = (commandArgs) ? commandArgs : [];
        this.handleUpdate(senderId, args);
        break;
      case '/delete':
        if (commandArgs) {
          this.handleDeleteWithId(senderId, commandArgs[0]);
        } else {
          this.handleDelete(senderId);
        }
        break;
       case '/list':
        this.handleList(senderId);
        break;
      case '/help':
        this.handleHelp(senderId);
        break;

      default:
        this.handleDefault(senderId, receivedText);
        break;
    }
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