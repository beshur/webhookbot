'use strict';
const _ = require('underscore'),
  request = require('request'),
  {HELP_TEXT_REQUEST, HELP_TEXT_COMMANDS} = require('./Texts');

/*
 * Facebook Messenger Controller
 * Handles Facebook chat events / messages
 */
class FbMessengerController {
  constructor(props) {
    this.props = props;
    this.LOG = 'FbMessengerController';
    this.FB_MESSAGES = 'https://graph.facebook.com/v2.6/me/messages';
    this.FB_PROFILE = 'https://graph.facebook.com/v2.6/me/messenger_profile';

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
    const receivedDeleteWithId = this.deleteWebhookIdRegexp.test(receivedText);

    // on top of switch because it's hard to put regex in this switch
    if (receivedDeleteWithId) {
      this.handleDeleteWithId(senderId, receivedText);
      return;
    }

    switch(receivedText) {
      case '/start':
        this.handleStart(senderId);
        break;
      case '/delete':
        this.handleDelete(senderId);
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
   * Handle /start command
   * @param string senderId
   * @param string message
   */
  handleStart(senderId, message) {
    let response;
    this.props.firebase.createWebhook(senderId).then((success) => {
      let clientHookUrl = this.createWebhookUrl(success.key);
      response = {
        "text": `Send your requests here:\n${clientHookUrl}\n\n${HELP_TEXT_REQUEST}` 
      }
      this.callSendAPI(senderId, response);
      this.props.analytics.trackWebhookHit(senderId).catch();
    }).catch(this._defaultFirebaseCatch.bind(this, 'handleStart', senderId));
  }

  /*
   * Handle /delete command
   * @param string senderId
   */
  handleDelete(senderId) {
    let response;
    this.props.firebase.listWebhooks(senderId).then((list) => {
      let hooksList = this.prettyHookIdsLastHitList(list);
      response = {
        "text": `Your webhooks:${hooksList}\n\nSend \`/delete <webhook id>\` as presented in the list` 
      }
      this.callSendAPI(senderId, response);
    }).catch(this._defaultFirebaseCatch.bind(this, 'handleDelete', senderId));
  }
  /*
   * Handle /delete <id> command
   * @param string senderId
   */
  handleDeleteWithId(senderId, receivedText) {
    let response;
    let webhookTest = this.deleteWebhookIdRegexp.exec(receivedText);
    if (webhookTest.length < 2) {
      response = {
        "text": `Could not understand the webhook id. Please try again.` 
      }
      return this.callSendAPI(senderId, response);
    }
    const webhookId = webhookTest[1];
    this.props.firebase.deleteWebhook(webhookId, senderId).then((success) => {
      response = {
        "text": `Successfully deleted ${webhookId}` 
      }
      this.callSendAPI(senderId, response);
    }).catch(this._defaultFirebaseCatch.bind(this, 'handleDeleteWithId', senderId));
  }
  /*
   * Handle /list command
   */
  handleList(senderId) {
    let response;
    this.props.firebase.listWebhooks(senderId).then((list) => {
      let hooksList = this.prettyHooksList(list);
      response = {
        "text": `Your webhooks:${hooksList}\n\nSend /delete to understand how to delete webhooks URLs.` 
      }
      this.callSendAPI(senderId, response);
    }).catch(this._defaultFirebaseCatch.bind(this, 'handleList', senderId));
  }
  /*
   * Handle /list command
   */
  handleHelp(senderId) {
    this.callSendAPI(senderId, {
      "text": `${HELP_TEXT_COMMANDS}\n\n${HELP_TEXT_REQUEST}`
    });
  }

  /*
   * Handle all other text commands (echo)
   */
  handleDefault(senderId, receivedText) {
    this.callSendAPI(senderId, {
      "text": `You sent the message: "${receivedText}".`
    });
  }

  /*
   * Handle actual webhook hit
   */
  handleWebhookHit(senderId, body) {
    this.props.analytics.trackWebhookHit(senderId).catch();
    return this.callSendAPI(
      senderId,
      this.formatProcessedWebhookMessage(body),
      {
        'messaging_type': 'MESSAGE_TAG',
        'tag': 'NON_PROMOTIONAL_SUBSCRIPTION'
      }
    )
  }

  _defaultFirebaseCatch(senderId, methodName, err) {
    // notify user of error
    this.callSendAPI(senderId, {
      'text': 'Something went wrong. Please try again later.'
    });
    console.error(this.LOG, methodName, err);
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
        "uri": this.FB_MESSAGES,
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

  get deleteWebhookIdRegexp() {
    return /\/delete (-[A-Z_]\w+)/g;
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
      'uri': this.FB_PROFILE,
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

  formatProcessedWebhookMessage(body) {
    let text = '';
    if (body.title) {
      text = `*${body.title}*\n`;
    }
    if (body.text) {
      text += body.text;
    }
    return {text};
  }

  prettyHooksList(list) {
    let result = '';
    let resultList = [];
    if (list) {
      resultList = _.map(list, this.prettyHookItem.bind(this));
      result = resultList.join('\n');
    }

    return result;
  }

  prettyHookIdsLastHitList(list) {
    let result = '';
    let resultList = [];
    if (list) {
      resultList = _.map(list, this.prettyHookIdLastHitItem);
      result = resultList.join('\n');
    }

    return result;
  }

  prettyHookItem(item, key) {
    let result = '\n';
    let createdOn = `\nCreated on ${new Date(item.createdOn).toString()}`;
    let url = this.createWebhookUrl(key);
    return result + url + createdOn;
  }

  prettyHookIdLastHitItem(item, key) {
    let result = '\n';
    let lastHitOn = `\nLast hit on ${new Date(item.lastHitOn).toString()}`;
    return result + key + lastHitOn;
  }

  createWebhookUrl(hookId) {
    return `${this.props.config.get('WHB_APP_HOST')}webhook/${hookId}`;
  }

}

module.exports = FbMessengerController;