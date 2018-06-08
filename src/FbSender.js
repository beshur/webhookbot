'use strict';
const AbstractSender = require('./AbstractSender');
/**
 * Facebook Messenger Sender Class
 */
class FbSender extends AbstractSender {
  constructor(props) {
    super(props);
    this.LOG = 'FbSender';

    this.FB_MESSAGES = 'https://graph.facebook.com/v2.6/me/messages';
    this.FB_PROFILE = 'https://graph.facebook.com/v2.6/me/messenger_profile';

    this.onInit();
  }

  onInit() {
    if (!this.props.isLocal) {
      this.setupMessengerProfile();
    }
  }

  setupBody(senderId, response, meta) {
    let request_body = {
      "recipient": {
        "id": senderId
      },
      "message": response
    }
    if (meta) {
      request_body = _.extend(request_body, meta);
    }
    return request_body;
  }

  setupRequest(request_body) {
    return {
      "uri": this.FB_MESSAGES,
      "qs": { "access_token": this.props.FB_TOKEN },
      "method": "POST",
      "json": request_body
    }
  }

  setupProfileRequest(request_body) {
    return {
      "uri": this.FB_PROFILE,
      "qs": { "access_token": this.props.FB_TOKEN },
      "method": "POST",
      "json": request_body
    }
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
    this.predefinedCallSendAPI(this.setupProfileRequest())
      .then(success => {
        console.log('setupMessengerProfile OK!')
      }).catch(err => {
        console.error('setupMessengerProfile error:' + err);
      }); 
  }
}

module.exports = FbSender;