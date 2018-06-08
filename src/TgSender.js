'use strict';
const AbstractSender = require('./AbstractSender');
/**
 * Facebook Messenger Sender Class
 */
class TgSender extends AbstractSender {
  constructor(props) {
    super(props);
    this.LOG = 'TgSender';

    this.TG_URL = 'https://api.telegram.org/bot' + this.props.TG_TOKEN;

    this.onInit();
  }

  onInit() {
    if (!this.props.isLocal) {
      this.setupTgWebhook();
    }
  }

  setupBody(senderId, response, meta) {
    let request_body = {
      "chat_id": senderId,
      "text": response.text
    }
    if (meta) {
      request_body = _.extend(request_body, meta);
    }
    return request_body;
  }

  setupRequest(request_body) {
    return {
      "uri": this.TG_URL + '/sendMessage',
      "method": "POST",
      "json": request_body
    }
  }

  generateWebhookUrl() {
    return this.props.HOST + 'tg/' + this.props.TG_TOKEN;
  }

  setupWebhookRequest(request_body) {
    return {
      "uri": this.TG_URL + '/setWebhook',
      "method": "POST",
      "json": {
        "url": this.generateWebhookUrl()
      }
    }
  }

  setupDeleteWebhookRequest(request_body) {
    return {
      "uri": this.TG_URL + '/deleteWebhook',
      "method": "POST"
    }
  }

  setupTgWebhook() {
    this.predefinedCallSendAPI(this.setupDeleteWebhookRequest())
      .then(success => {
        console.log('deleteTgWebhook OK!')
        this.predefinedCallSendAPI(this.setupWebhookRequest())
          .then(success => {
            console.log('setupTgWebhook OK!')
          }).catch(err => {
            console.error('setupTgWebhook error:' + err);
          })
      }).catch(err => {
        console.error('deleteTgWebhook error:' + err);
      }); 
  }
}

module.exports = TgSender;