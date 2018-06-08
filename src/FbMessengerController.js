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
    this.setupController({
      FB_MESSAGES: 'https://graph.facebook.com/v2.6/me/messages',
      FB_PROFILE: 'https://graph.facebook.com/v2.6/me/messenger_profile'
    })

    if (!props.isLocal) {
      this.setupMessengerProfile();
    }
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

  // Sends response messages via the Send API
  callSendAPI(senderId, response, meta) {
    // Construct the message body)
    let request_body = {
      "recipient": {
        "id": senderId
      },
      "message": response
    }
    if (meta) {
      request_body = _.extend(request_body, meta);
    }

    if (process.env.DEBUG) {
      console.log(this.LOG, 'callSendAPI', request_body);
    } else {
      console.log(this.LOG, 'callSendAPI');
    }
    // Send the HTTP request to the Messenger Platform
    return new Promise((resolve, reject) => {
      request({
        "uri": this.setup.FB_MESSAGES,
        "qs": { "access_token": this.props.config.get('WHB_FB_PAGE_ACCESS_TOKEN') },
        "method": "POST",
        "json": request_body
      }, (err, res, body) => {
        if (err) {
          console.error("Unable to send message:" + err);
          return reject(err);
        } else {
          console.log('message sent!')
          return resolve();
        }
      }); 
    });
  }

  get profileSettings() {
    return {
      'get_started':{
        'payload':'/help'
      },
      'greeting': [{
        'locale':'default',
        'text':`Hi!
        \nWebhook Bot can create the webhook URL that you can use to forward messages to yourself.
        \nType /help to display the commands.`
      }],
      'persistent_menu':[{
        'locale':'default',
        'composer_input_disabled': false,
        'call_to_actions':[{
          'title':'Get started',
          'type':'postback',
          'payload':'/help'
        },
        {
          'title':'Create Webhook',
          'type':'postback',
          'payload':'/start'
        },
        {
          'type':'postback',
          'title':'My Webhooks',
          'payload':'/list'
        }]
      }]
    }
  }
  setupMessengerProfile() {
    request({
      'uri': this.setup.FB_PROFILE,
      'qs': { 'access_token': this.props.config.get('WHB_FB_PAGE_ACCESS_TOKEN') },
      'method': 'POST',
      'json': this.profileSettings
    }, (err, res, body) => {
      if (!err) {
        console.log('setupMessengerProfile OK!')
      } else {
        console.error("setupMessengerProfile error:" + err);
      }
    }); 

  }
}

module.exports = FbMessengerController;