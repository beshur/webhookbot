let TEXTS = {};
TEXTS.HELP_START = `Let me create a webhook URL for you.
Send \`/create <Your label>\`
Labels are handy and will mark the channel you received a message from.
Send \`/help\` to get info on other commands.`;
TEXTS.HELP_UPDATE = `To update the webhook label:
Send \`/update <Webhook Id> <Your label>\`
To get webhook id, send \`/list\``;
TEXTS.HELP_TEXT_REQUEST = `On your webhook URL:
Send POST <Content-Type: application/json> with the data structured like this:
\`{ "title": "<Your title (optional)>", "text": "<Your Text (optional)>"}\``;
TEXTS.HELP_TEXT_COMMANDS = `Commands:\n
\`/start\`
to prepare for creating new webhook URLs;
\`/create <Your label>\`
to create new webhook URL with a label;
\`/update <Webhook Id> <New label>\`
to update webhook label;
\`/list\`
to get the list of your webhook URLs;
\`/delete\`
to get help on how to delete webhooks;
\`/help\`
to display this prompt;`;

module.exports = TEXTS;