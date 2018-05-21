let TEXTS = {};
TEXTS.HELP_TEXT_REQUEST = `On your webhook URL:
Send POST <Content-Type: application/json> with the data structured like this:
\`{ "title": "<Your title (optional)>", "text": "<Your Text (optional)>"}\``;
TEXTS.HELP_TEXT_COMMANDS = `Commands:\n
\`/start\`
to create new webhook URL;
\`/list\`
to get the list of your webhook URLs;
\`/delete\`
to get help on how to delete webhooks;
\`/help\`
to display this prompt;`;

module.exports = TEXTS;