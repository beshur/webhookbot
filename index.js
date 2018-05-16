'use strict';

// Imports dependencies and set up http server
const
  express = require('express'),
  bodyParser = require('body-parser'),
  config = require('./config.json'),
  ClientWebhooks = require('./src/ClientWebhooks'),
  Firebase = require('./src/Firebase'),
  Analytics = require('./src/Analytics'),
  request = require('request'),
  uuidv4 = require('uuid/v4'),
  _ = require('underscore'),
  app = express().use(bodyParser.json()); // creates express http server

const PORT = process.env.PORT || 1337;

const analyticsInstance = new Analytics(config.GA_ID);
const firebaseInstance = new Firebase(config.FIREBASE, analyticsInstance);

// Handles messages events
function handleMessage(sender_psid, received_message) {
  var response;
  var async = false;

  console.log('handleMessage is postback', typeof received_message.payload !== 'undefined');
  // Check if the message contains text
  if (received_message.text) {

    switch(received_message.text) {
      case '/start':
        async = true;
        // let clientHookUrl = `${config.APP_HOST}webhook/${newId}`;
        firebaseInstance.createWebhook(sender_psid).then((success) => {
          let clientHookUrl = createWebhookUrl(success.key);
          response = {
            "text": `Send your requests here:\n${clientHookUrl}
              \n\nSend POST <Content-Type: application/json> with the data structured like this:
              \n{ "title": "<Your title (optional)>", "text": "<Your Text (optional)>"}` 
          }

          callSendAPI(sender_psid, response, {
            onSuccess: () => {},
            onError: () => {}
          });

        }).catch((err) => {
          response = {
            'text': 'Something went wrong. Please try again later.'
          }
          // notify user of error
          callSendAPI(sender_psid, response, {
            onSuccess: () => {},
            onError: () => {}
          });

          console.error('createWebhook', err);
        });

        break;
      case '/list':
        async = true;
        // let clientHookUrl = `${config.APP_HOST}webhook/${newId}`;
        firebaseInstance.listWebhooks(sender_psid).then((list) => {
          let hooksList = prettyHooksList(list);
          response = {
            "text": `Your webhooks:\n${hooksList}` 
          }

          callSendAPI(sender_psid, response, {
            onSuccess: () => {},
            onError: () => {}
          });

        }).catch((err) => {
          response = {
            'text': 'Something went wrong. Please try again later.'
          }
          // notify user of error
          callSendAPI(sender_psid, response, {
            onSuccess: () => {},
            onError: () => {}
          });

          console.error('listWebhooks', err);
        });

        break;
      case '/help':
        response = {
          "text": `Send /start to create new webhook URL.\nSend /list to get the list of your webhook URLs.` 
        }
        break;

      default:
        response = {
          "text": `You sent the message: "${received_message.text}".`
        }
        break;
    }
    // Create the payload for a basic text message
  }  
  // Sends the response message
  if (async) {
    return;
  }
  console.log('handleMessage response', response);
  callSendAPI(sender_psid, response, {
    onSuccess: () => {},
    onError: () => {}
  });    
}

// Handles messaging_postbacks events
function handlePostback(sender_psid, received_postback) {
  console.log('handlePostback');
  let payload = received_postback.payload;
  handleMessage(sender_psid, _.extend(received_postback, {
    text: payload
  }));
}

// Sends response messages via the Send API
function callSendAPI(sender_psid, response, callback) {
  // Construct the message body)
  let request_body = {
    "recipient": {
      "id": sender_psid
    },
    "message": response
  }

  if (process.env.DEBUG) {
    console.log('callSendAPI', request_body);
  } else {
    console.log('callSendAPI');
  }
  // Send the HTTP request to the Messenger Platform
  request({
    "uri": "https://graph.facebook.com/v2.6/me/messages",
    "qs": { "access_token": config.FB_PAGE_ACCESS_TOKEN },
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

function formatProcessedWebhookMessage(body) {
  let text = '';
  if (body.title) {
    text = `*${body.title}*\n`;
  }
  if (body.text) {
    text += body.text;
  }
  return {text};
}

function prettyHooksList(list) {
  let result = '';
  let resultList = [];
  if (list) {
    resultList = _.map(list, prettyHookItem);
    result = resultList.join('\n');
  }

  return result;
}

function prettyHookItem(item, key) {
  let result = '* ';
  let createdOn = ` Created on ${new Date(item.createdOn).toString()}`;
  let url = createWebhookUrl(key);
  return result + url + createdOn;
}

function createWebhookUrl(hookId) {
  return `${config.APP_HOST}webhook/${hookId}`;
}

function setupMessengerProfile() {
  let settingsBody = {
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
  request({
    'uri': 'https://graph.facebook.com/v2.6/me/messenger_profile',
    'qs': { 'access_token': config.FB_PAGE_ACCESS_TOKEN },
    'method': 'POST',
    'json': settingsBody
  }, (err, res, body) => {
    if (!err) {
      console.log('setupMessengerProfile OK!')
    } else {
      console.error("setupMessengerProfile error:" + err);
    }
  }); 

}

app.get('/', (req, res) => {
  res.send('OK');
});

app.get('/health-check', (req, res) => {
  res.send('OK ' + process.uptime());
});

// Adds support for GET requests to our webhook
app.get('/webhook', (req, res) => {

  // Your verify token. Should be a random string.
  let VERIFY_TOKEN = config.FB_VERIFY_TOKEN;
    
  // Parse the query params
  let mode = req.query['hub.mode'];
  let token = req.query['hub.verify_token'];
  let challenge = req.query['hub.challenge'];
    
  // Checks if a token and mode is in the query string of the request
  if (mode && token) {
  
    // Checks the mode and token sent is correct
    if (mode === 'subscribe' && token === VERIFY_TOKEN) {
      
      // Responds with the challenge token from the request
      console.log('WEBHOOK_VERIFIED');
      res.status(200).send(challenge);
    
    } else {
      // Responds with '403 Forbidden' if verify tokens do not match
      res.sendStatus(403);      
    }
  }
});

// Creates the endpoint for our webhook 
app.post('/webhook', (req, res) => {  
 
  let body = req.body;
  console.log(body);
  // Checks this is an event from a page subscription
  if (body.object === 'page') {

    // Iterates over each entry - there may be multiple if batched
    body.entry.forEach(function(entry) {

      // Gets the message. entry.messaging is an array, but 
      // will only ever contain one message, so we get index 0
      let webhook_event = entry.messaging[0];
      console.log("webhook event", webhook_event);

      // Get the sender PSID
      let sender_psid = webhook_event.sender.id;
      console.log('Sender PSID: ' + sender_psid);

      if (webhook_event.message) {
        handleMessage(sender_psid, webhook_event.message);        
      } else if (webhook_event.postback) {
        handlePostback(sender_psid, webhook_event.postback);
      }

    });

    // Returns a '200 OK' response to all requests
    res.status(200).send('EVENT_RECEIVED');
  } else {
    // Returns a '404 Not Found' if event is not from a page subscription
    res.sendStatus(404);
  }

});

// Creates the endpoint for client webhook 
app.post('/webhook/:id', (req, res) => {  
 
  let body = req.body;
  let hookId = req.params.id;
  if (!hookId) {
    res.status(400).send({error: 'BAD_WEBHOOK_ID'});
  }

  firebaseInstance.webhookHit(hookId).then((success) => {
    console.log('/webhook/ hit', success, hookId);
    // console.log("/webhook/ valid hookId %s clientId %s", hookId, clientId);

    callSendAPI(success[hookId]['userId'], formatProcessedWebhookMessage(body), {
      onSuccess: (success) => {
        res.status(200).send('OK');
      },
      onError: (error) => {
        res.status(500).send('ERROR');
      }
    });
      
  }).catch(err => {
    console.error('/webhook/:id error getting webhook', hookId, err );
    res.status(400).send({
      error: err
    });
  });
});

setupMessengerProfile();

// Sets server port and logs message on success
app.listen(PORT, () => console.log('webhook is listening on', PORT));