import * as Discord from "discord.js";
import { IBotEvent } from "../../core/event";
import ManiClient from "../../core/client";

export default class MessageEvent implements IBotEvent {
	public name: string = 'interactionCreate';

	public async onEvent(client: ManiClient, interaction: Discord.Interaction): Promise<void> {
		this._logInteraction(client, interaction);
		
		// Ignore interactions sent in dms
		if (!interaction.guild) return;

		// Let command manager handle the interaction
		client.commands.handleInteraction(client, interaction);
	}

	private _logInteraction(client: ManiClient, interaction: Discord.Interaction): void {
        if (interaction.isChatInputCommand()) {
            // console.log("Slash command used: " + interaction.commandName);
        }		
	}

}