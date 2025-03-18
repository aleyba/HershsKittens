import * as Discord from "discord.js";
import { HelpEmbed } from "../../../core/baseclasses";
import ManiClient from "../../../core/client";
import config from "../../../config";
import ManiCommand from "../../../core/command";

export default class AboutCommand extends ManiCommand {
	public constructor(){
		super(["about"], config.commandGroups.Info);

		this.cooldown = 30000;
		this.description = 'Shows who created the bot and what its current verion is';
	}

	public async runCommand(options: { client: ManiClient, message: Discord.Message }): Promise<void> {
		// Check if the channel is a TextChannel
		if (options.message.channel.type !== Discord.ChannelType.GuildText) return;

		const embed: HelpEmbed = new HelpEmbed(options.client, `${options.client.user?.tag}`)
			.addFields([
				{ name: 'Creator', value: 'Mani' },
				{ name: 'Version', value: '0.1.0' },
				{ name: 'Dedication', value: "This bot is dedicated to Hersh as a 3 year anniversary gift. She is the best!" }
			])
			.setThumbnail(options.client.user? options.client.user.displayAvatarURL() : '');		
		options.message.channel.send({ embeds:[embed] });
	}
	
}