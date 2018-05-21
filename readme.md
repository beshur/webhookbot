# Webhook Bot Server

Runs a webhook commands processor.

## Config 

Config should be defined as ENV vars (because of heroku).

Example to add to `.bash_profile`:
```
export WHB_APP_HOST=https://webhookbot-server.herokuapp.com/
export WHB_FB_VERIFY_TOKEN=
export WHB_FB_PAGE_ACCESS_TOKEN=
export WHB_FB_APP_ID=
export WHB_FB_APP_SECRET=
export WHB_GA_ID=
export WHB_FIREBASE_apiKey=
export WHB_FIREBASE_authDomain=
export WHB_FIREBASE_databaseURL=
export WHB_FIREBASE_projectId=
export WHB_FIREBASE_storageBucket=
export WHB_FIREBASE_messagingSenderId=
export WHB_INDEX_REDIRECT=
```