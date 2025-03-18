import * as Discord from "discord.js";
import { HelpEmbed } from "../../../core/baseclasses";
import config from "../../../config";
import ManiCommand, { IBotCommandArgumentType, IBotCommandRunOptions } from "../../../core/command";

export default class PingCommand extends ManiCommand {
	public constructor(){
		super(["ping"], config.commandGroups.Info);
		
		this.cooldown = 30000;
		this.description = 'Ping the bot';
	}

	public async runCommand( options: IBotCommandRunOptions ): Promise<void> {
		const { client, message } = options;

		if (message) {
			// Check if the channel is a TextChannel
			if (message.channel.type !== Discord.ChannelType.GuildText) return;
			
			const embed: HelpEmbed = new HelpEmbed(client, `${client.user?.tag}`);
			embed.setDescription(`pong! \`${client.ws.ping}ms\``);			
			message.channel.send({ embeds: [embed] });
		}
	}
	
}