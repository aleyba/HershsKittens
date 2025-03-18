import * as Discord from "discord.js";
import { HelpEmbed } from "../../../core/baseclasses";
import config from "../../../config";
import ManiCommand, { IBotCommandRunOptions } from "../../../core/command";

export default class PingCommand extends ManiCommand {
	public constructor(){
		super(["ping"], config.commandGroups.Info);
		
		this.cooldown = 30000;
		this.description = 'Ping the bot';
		// this.argumentOptions = [{ name: 'flag', description: 'test', type: IBotCommandArgumentType.Boolean, required: true  }]
	}

	public async runCommand( options: IBotCommandRunOptions ): Promise<void> {
		const { client, interaction } = options;

        if (interaction) {
            const embed: HelpEmbed = new HelpEmbed(client, `${client.user?.tag}`);
            embed.setDescription(`pong! \`${client.ws.ping}ms\``);			
			interaction.reply({ embeds: [embed] });
		}
	}
	
}