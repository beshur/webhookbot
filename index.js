'use strict';

// Imports dependencies and set up http server
const
  express = require('express'),
  bodyParser = require('body-parser'),
  config = require('./config.json'),
  clientWebhooks = require('./src/ClientWebhooks'),
  request = require('request'),
  uuidv4 = require('uuid/v4'),
  app = express().use(bodyParser.json()); // creates express http server

const PORT = process.env.PORT || 1337;

// Handles messages events
function handleMessage(sender_psid, received_message) {
  var response;

  // Check if the message contains text
  if (received_message.text) {    

    switch(received_message.text) {
      case '/start':
        let newId = uuidv4();
        let clientHookUrl = `${config.APP_HOST}hook/${newId}`;
        response = {
          "text": `Send your POST requests here: ${clientHookUrl}` 
        }
        
        clientWebhooks.push(newId, sender_psid);
        break;
      default:
        response = {
          "text": `You sent the message: "${received_message.text}". Now send me an image!`
        }
        break;
    }
    // Create the payload for a basic text message
  }  
  console.log('handleMessage response', response);
  // Sends the response message
  callSendAPI(sender_psid, response);    
}

// Handles messaging_postbacks events
function handlePostback(sender_psid, received_postback) {

}

// Sends response messages via the Send API
function callSendAPI(sender_psid, response) {
  // Construct the message body
  let request_body = {
    "recipient": {
      "id": sender_psid
    },
    "message": response
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
    } else {
      console.error("Unable to send message:" + err);
    }
  }); 
}

app.get('/', (req, res) => {
  res.send('OK');
});

app.get('/health-check', (req, res) => {
  res.send('OK ' + process.uptime());
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

// Creates the endpoint for our webhook 
app.post('/hook/:id', (req, res) => {  
 
  let body = req.body;
  let hookId = req.params.id;
  let clientId = clientWebhooks.getWebhook(hookId);
  if (!hookId || !clientId) {
    res.status(400).send('BAD_WEBHOOK_ID');
  }

  console.log("/hook/", body, hookId, clientId);

  callSendAPI(clientId, body);

  res.status(200).send('OK');

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

// Sets server port and logs message on success
app.listen(PORT, () => console.log('webhook is listening on', PORT));