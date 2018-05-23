'use strict';

// Imports dependencies and set up http server
const
  express = require('express'),
  bodyParser = require('body-parser'),
  Firebase = require('./src/Firebase'),
  Analytics = require('./src/Analytics'),
  Config = require('./src/Config'),
  FbMessengerController = require('./src/FbMessengerController'),
  request = require('request'),
  fs = require('fs'),
  _ = require('underscore'),
  app = express().use(bodyParser.json()); // creates express http server

const PORT = process.env.PORT || 1337;
const LOCAL = fs.existsSync('LOCAL');

const analyticsInstance = new Analytics(Config.get('WHB_GA_ID'));
const firebaseInstance = new Firebase();
const fbMesControllerInstance = new FbMessengerController({
  analytics: analyticsInstance,
  firebase: firebaseInstance,
  config: Config,
  isLocal: LOCAL
});

app.get('/', (req, res) => {
  res.redirect(Config.get('WHB_INDEX_REDIRECT'));
});

app.get('/health-check', (req, res) => {
  res.send('OK');
});

// Adds support for GET requests to our webhook
app.get('/webhook', (req, res) => {

  // Your verify token. Should be a random string.
  let VERIFY_TOKEN = Config.get('WHB_FB_VERIFY_TOKEN');
    
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
        fbMesControllerInstance.handleMessage(sender_psid, webhook_event.message);        
      } else if (webhook_event.postback) {
        fbMesControllerInstance.handlePostback(sender_psid, webhook_event.postback);
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

    fbMesControllerInstance.handleWebhookHit(hookId, success.userId, success.label, body)
      .then(success => {
        res.status(200).send('OK');
      }).catch(error => {
        console.error('webhookHit', error);
        res.status(500).send('ERROR');
      });      
  }).catch(err => {
    console.error('/webhook/:id error getting webhook', hookId, err );
    res.status(400).send({
      error: err
    });
  });
});

// Sets server port and logs message on success
app.listen(PORT, () => console.log('webhook is listening on', PORT));