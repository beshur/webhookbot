'use strict';

const request = require('request-promise-native');

/**
 * Abstract Sender Class
 */
class AbstractSender {
  constructor(props) {
    this.props = props;
    this.LOG = 'AbstractSender';
  }

  // Method that is intended to prepare message format to send back to platform
  setupBody(senderId, response, meta) {
    throw new Error('setupBody - not implemented');
  }

  // Method that is indened to prepare additional request headers
  setupRequest(request_body) {
    throw new Error('setupRequest - not implemented');
  }

  // Sends response messages via the Send API
  callSendAPI(senderId, response, meta) {
    // Construct the message body
    let request_body = this.setupBody(senderId, response, meta);
    let request_data = this.setupRequest(request_body);

    if (process.env.DEBUG) {
      console.log(this.LOG, 'callSendAPI', request_body);
    } else {
      console.log(this.LOG, 'callSendAPI');
    }
    return this.predefinedCallSendAPI(request_data);
  }

  // Actual request
  predefinedCallSendAPI(request_data) {
    // Send the HTTP request to the Messenger Platform
    return new Promise((resolve, reject) => {
      request(request_data)
        .then(success => {
          console.log(this.LOG, 'message sent!')
          resolve(success);
        }).catch(err => {
          console.error(this.LOG, 'Unable to send message:' + err);
          reject(err);
        })
    });
  }
}

module.exports = AbstractSender;