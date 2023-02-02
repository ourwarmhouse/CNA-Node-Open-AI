#!/usr/bin/env node
import fs from 'fs';
import { pathToFileURL } from 'url'
import ChatGPTClient from '../src/ChatGPTClient.js';
import boxen from 'boxen';
import ora from 'ora';
import clipboard from 'clipboardy';
import inquirer from 'inquirer';

const arg = process.argv.find((arg) => arg.startsWith('--settings'));
let path;
if (arg) {
    path = arg.split('=')[1];
} else {
    path = './settings.js';
}

let settings;
if (fs.existsSync(path)) {
    // get the full path
    const fullPath = fs.realpathSync(path);
    settings = (await import(pathToFileURL(fullPath).toString())).default;
} else {
    if (arg) {
        console.error(`Error: the file specified by the --settings parameter does not exist.`);
    } else {
        console.error(`Error: the settings.js file does not exist.`);
    }
    process.exit(1);
}

const chatGptClient = new ChatGPTClient(settings.openaiApiKey, settings.chatGptClient, settings.cacheOptions);

console.log(boxen('ChatGPT CLI', { padding: 0.7, margin: 1, borderStyle: 'double', dimBorder: true }));

await conversation();

async function conversation(conversationId = null, parentMessageId = null) {
    const { message } = await inquirer.prompt([
        {
            type: 'input',
            name: 'message',
            message: 'Write a message:',
        },
    ]);
    if (message === '!exit') {
        return true;
    }
    const chatGPTLabel = settings.chatGptClient?.chatGPTLabel || 'ChatGPT';
    const spinner = ora(`${chatGPTLabel} is typing...`);
    spinner.prefixText = '\n';
    spinner.start();
    try {
        const response = await chatGptClient.sendMessage(message, { conversationId, parentMessageId });
        clipboard.write(response.response).then(() => {}).catch(() => {});
        spinner.stop();
        conversationId = response.conversationId;
        parentMessageId = response.messageId;
        console.log(boxen(response.response, { title: chatGPTLabel, padding: 0.7, margin: 1, dimBorder: true }));
    } catch (error) {
        spinner.stop();
        console.log(boxen(error?.json?.error?.message || error.body, { title: 'Error', padding: 0.7, margin: 1, borderColor: 'red' }));
    }
    return conversation(conversationId, parentMessageId);
}
