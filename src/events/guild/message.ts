import * as Discord from "discord.js";
import { IBotEvent } from "../../core/event";
import ManiClient from "../../core/client";

export default class MessageEvent implements IBotEvent {
	public name: string = 'messageCreate';

	public async onEvent(client: ManiClient, message: Discord.Message): Promise<void> {
		this._logMessage(client, message);
		
		// Ignore messages sent by a bot, or sent in dms
		if (message.author.bot || !message.guild) return;

		// Let command manager handle the message
		client.commands.handleMessage(client, message);
	}

	private _logMessage(client: ManiClient, message: Discord.Message): void {
		//console.log(message.content);
	}

}