import * as Discord from "discord.js";
import ManiClient from "./client";
import config from "../config";

export class DefaultEmbed extends Discord.EmbedBuilder {
	public constructor(user: Discord.User, data?: Discord.EmbedData) {
		super(data);
		
		this.setColor(config.embedColours.default);
		this.setAuthor({ name: `${user.username},`, iconURL: user.displayAvatarURL() });
	}
}

export class HelpEmbed extends Discord.EmbedBuilder {
	public constructor(client: ManiClient, title: string, data?: Discord.EmbedData) {
		super(data);

		this.setColor(config.embedColours.help);
		this.setAuthor({ name: title, iconURL: client.user?.displayAvatarURL() });
	}
}
