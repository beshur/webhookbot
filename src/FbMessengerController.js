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
  }

  handleMessage(senderId, message) {

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
   * Handle all other texts (echo)
   */
  handleDefault(senderId, receivedText) {
    this.callSendAPI(senderId, {
      "text": `You sent the message: "${received_message.text}".`
    });
  }

  _defaultFirebaseCatch(senderId, methodName, err) {
    // notify user of error
    this.callSendAPI(senderId, {
      'text': 'Something went wrong. Please try again later.'
    });
    console.error(this.LOG, methodName, err);
  }

  // Sends response messages via the Send API
  callSendAPI(senderId, response, callback, meta) {
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
          // callback.onError(err);
          return reject(err);
        } else {
          console.log('message sent!')
          // callback.onSuccess(true);
          resolve();
        }
      }); 
    });
  }

  get deleteWebhookIdRegexp() {
    return /\/delete (-[A-Z_]\w+)/g;
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