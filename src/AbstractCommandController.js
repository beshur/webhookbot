'use strict';
const _ = require('underscore'),
  request = require('request'),
  stringArgv = require('string-argv'),
  {HELP_START, HELP_UPDATE, HELP_TEXT_REQUEST, HELP_TEXT_COMMANDS} = require('./Texts');

/*
 * Abstract Command Controller
 * Generic commands handler that should be reused for different platforms
 */
class AbstractCommandController {
  constructor(props) {
    this.props = props;
    this.LOG = 'AbstractCommandController';
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
   * Handle /start command
   * @param string senderId
   * @param string message
   */
  handleStart(senderId, message) {
    this.callSendAPI(senderId, {
      "text": HELP_START 
    });
  }

  /*
   * Handle /create command
   * @param string senderId
   * @param string label
   */
  handleCreate(senderId, label) {
    let response;
    this.props.firebase.createWebhook(senderId, label, this.webhookType).then((success) => {
      let clientHookUrl = this.createWebhookUrl(success.key);
      response = {
        "text": `Send your requests here:\n${clientHookUrl}\n\n${HELP_TEXT_REQUEST}` 
      }
      this.callSendAPI(senderId, response);
      this.props.analytics.trackNewWebhook(senderId).catch();
    }).catch(this._defaultFirebaseCatch.bind(this, 'handleCreate', senderId));
  }


  /*
   * Handle /update command
   * @param string senderId
   * @param array args
   */
  handleUpdate(senderId, args) {
    let response;
    let id = args[0];
    let label = args[1];
    if (id) {
      return this.handleUpdateParams(senderId, id, label);
    }
    // no id
    this.props.firebase.listWebhooks(senderId).then((list) => {
      let hooksList = this.prettyHookIdsLastHitList(list);
      response = {
        "text": `Your webhooks:${hooksList}\n\nSend \`/update <Webhook id> <New label>\` to update the label` 
      }
      this.callSendAPI(senderId, response);
    }).catch(this._defaultFirebaseCatch.bind(this, 'handleUpdateParams', senderId));
  }

  /*
   * Handle /update with params command
   * @param string senderId
   * @param string id
   * @param string label
   */
  handleUpdateParams(senderId, id, label) {
    this.props.firebase.updateWebhook(senderId, id, label).then((success) => {
      let clientHookUrl = this.createWebhookUrl(success.key);
      response = {
        "text": `${clientHookUrl}\nUpdated label to ${label}\n`
      }
      this.callSendAPI(senderId, response);
      this.props.analytics.trackUpdateWebhook(senderId).catch();
    }).catch(this._defaultFirebaseCatch.bind(this, 'handleUpdate', senderId));
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
   * @param string id - webhook id
   */
  handleDeleteWithId(senderId, id) {
    let response;
    this.props.firebase.deleteWebhook(id, senderId).then((success) => {
      response = {
        "text": `Successfully deleted ${id}` 
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
  handleWebhookHit(hookId, senderId, label, body) {
    this.props.analytics.trackWebhookHit(senderId).catch();
    return this.callSendAPI(
      senderId,
      this.formatProcessedWebhookMessage(hookId, label, body)
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
    this.props.sender.callSendAPI(...arguments);
  }

  get deleteWebhookIdRegexp() {
    return /\/delete (-[A-Z_]\w+)/g;
  }

  formatProcessedWebhookMessage(hookId, label, body) {
    let text = this.prettyHookLabel(label);
    if (!text) {
      text = this.prettyHookLabel(hookId);
    }
    if (body.title) {
      text += `*${body.title}*\n`;
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
      resultList = _.map(list, this.prettyHookIdLastHitItem.bind(this));
      result = resultList.join('\n');
    }

    return result;
  }

  prettyHookLabel(label) {
    return (!!label) ? `@${label}\n` : '';
  }

  prettyHookItem(item, key) {
    let result = '\n' + this.prettyHookLabel(item.label);
    let url = this.createWebhookUrl(key);
    let createdOn = `\nCreated on ${new Date(item.createdOn).toString()}`;
    return result + url + createdOn;
  }

  prettyHookIdLastHitItem(item, key) {
    let result = '\n' + this.prettyHookLabel(item.label);
    let lastHitOn = `\nLast hit on ${new Date(item.lastHitOn).toString()}`;
    return result + key + lastHitOn;
  }

  createWebhookUrl(hookId) {
    return `${this.props.config.get('WHB_APP_HOST')}webhook/${hookId}`;
  }

}

module.exports = AbstractCommandController;