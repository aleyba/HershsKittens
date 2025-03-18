import * as Discord from "discord.js";

export enum ErrorMessages {
    DBConnectionFailed = 'connection to the database failed...',
    PlayerNotFound = 'mentioned player not found.', // player not found
    PlayerNotMentioned = 'you forgot to mention a player.', // please mention a player
    LocationNotFound = 'player location not found, please contact the developer on the official ManiBot server.',
    Custom = ''
}
export async function SendErrorMsg(message: Discord.Message, errorMsg: ErrorMessages, customMsg: string = ''): Promise<void> {
    if (message.channel.type === Discord.ChannelType.GuildText) {
        if (errorMsg === ErrorMessages.Custom)
            message.channel.send(`**${message.author.username}**, ${customMsg}`);
        else
            message.channel.send(`**${message.author.username}**, ${errorMsg}`); //.then(msg => setTimeout(() => (msg as Discord.Message).delete(), 10000));
    }
}

export enum InfoMessages {
    NotEnoughMoney = `you don't have enough money...`,
    Custom = ''
}
export async function SendInfoMsg(message: Discord.Message, infoMsg: InfoMessages, customMsg: string = ''): Promise<void> {
    if (message.channel.type === Discord.ChannelType.GuildText) {
        if (infoMsg === InfoMessages.Custom)
            message.channel.send(`**${message.author.username}**, ${customMsg}`);
        else
            message.channel.send(`**${message.author.username}**, ${infoMsg}`); //.then(msg => setTimeout(() => (msg as Discord.Message).delete(), 10000));
    }
}