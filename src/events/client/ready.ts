import { ActivityType, ChannelType } from "discord.js";
import { IBotEvent } from "../../core/event";
import client from "../../core/client";
import chalk = require("chalk");
import { itemData } from "../../database/data/itemData";
import { catData } from "../../database/data/catData";

export default class ReadyEvent implements IBotEvent {
	public name: string = 'ready';

	public async onEvent(client: client): Promise<void> {
		// Set help command as bot activity
		client.user?.setActivity('hersh help | h help', { type: ActivityType.Listening });		

		if (await client.commands.loadCommands()) 
			console.log('commands loaded...');		

		if (await client.database.testConnection()) {
			console.log('database connection working...');	

			const logInsertToConsole: boolean = true;
			// client.database.insertOrUpdateCats(catData, logInsertToConsole);
			// client.database.insertOrUpdateItems(itemData, logInsertToConsole);

		}			

		// Show that the bot is online
		console.log(chalk.green(`${client.user?.tag} is online!`));
	}
	
}