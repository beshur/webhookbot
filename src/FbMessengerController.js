'use strict';
const {HELP_TEXT_REQUEST, HELP_TEXT_COMMANDS} = require('./Texts'),
  request = require('request');

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

  handleStart(senderId, message) {
    let response;
    this.props.firebase.createWebhook(senderId).then((success) => {
      let clientHookUrl = this.createWebhookUrl(success.key);
      response = {
        "text": `Send your requests here:\n${clientHookUrl}\n\n${HELP_TEXT_REQUEST}` 
      }

      this.callSendAPI(senderId, response, {
        onSuccess: () => {},
        onError: () => {}
      });

    }).catch((err) => {
      response = {
        'text': 'Something went wrong. Please try again later.'
      }
      // notify user of error
      this.callSendAPI(senderId, response, {
        onSuccess: () => {},
        onError: () => {}
      });

      console.error(this.LOG, 'createWebhook', err);
    });
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
    request({
      "uri": this.FB_MESSAGES,
      "qs": { "access_token": this.props.config.get('WHB_FB_PAGE_ACCESS_TOKEN') },
      "method": "POST",
      "json": request_body
    }, (err, res, body) => {
      if (!err) {
        console.log('message sent!')
        callback.onSuccess(true);
      } else {
        console.error("Unable to send message:" + err);
        callback.onError(err);
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
      resultList = _.map(list, prettyHookItem);
      result = resultList.join('\n');
    }

    return result;
  }

  prettyHookIdsLastHitList(list) {
    let result = '';
    let resultList = [];
    if (list) {
      resultList = _.map(list, prettyHookIdLastHitItem);
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