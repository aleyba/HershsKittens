import * as Discord from "discord.js";
import ManiCommand from "../../../core/command";
import { HelpEmbed } from "../../../core/baseclasses";
import ManiClient from "../../../core/client";
import config from "../../../config";
import { IPlayerDocument } from "../../../database/model/playerModel";

export default class HelpCommand extends ManiCommand {
	public constructor(){
		super(["help", "commands"], config.commandGroups.Info);

		this.cooldown = 30000;
		this.description = 'Shows the list of available commands';
	}

	public async runCommand(options: { client: ManiClient, message: Discord.Message, player: IPlayerDocument, args: string[] }): Promise<void> {
		const { client, message, player, args } = options;

		// Check if the channel is a TextChannel
		if (message.channel.type !== Discord.ChannelType.GuildText) return;

		if (args.length < 1) {
			const embed: HelpEmbed = new HelpEmbed(client, 'HershsKittens Help ❓')
				.setTitle("Welcome to Hersh's Kittens!")
				.setDescription(
					`**Prefix: \`hersh\` | \`${player.settings.prefix}\`**\n` +
					// 'To start playing the game, use `h start`\n' +
					'To find out how to use a command, use `h help <command>`\n' +
					'\n' +
					'Here is the full list of commands:'
				);

			// Loop through all the command groups
			for (let i = 0; i < Object.keys(config.commandGroups).length; i++) {
				const groupName: string = Object.keys(config.commandGroups)[i];
				const groupValue: string = Object.values(config.commandGroups)[i];
				let commandOutput: string = '';
	
				// Loop through all of the commands in the config file
				for (const commandName of config.commands as string[]) {
					// Get the command, check if it's enabled and check the group
					const command: ManiCommand | undefined = client.commands.fetchTextCommand(commandName);
					if (!command || !command.enabled || command.category !== groupValue) continue;
	
					// Check if the command has limited access and if it's unlocked.
					if (command.developer && !config.developers.includes(message.author.id)) continue;
					// if (command.unlockable && player.cats.length < 1) continue;
	
					// Add the command to the command list
					commandOutput += `\`${commandName}\` `;
				}
	
				// Add commands to the embed
				if (commandOutput !== '') embed.addFields([{ name: `${groupValue} ${groupName}`, value: commandOutput }]);
			}
	
			
			// Show the embed
			message.channel.send({ embeds:[embed] });
		}
		else {
			// Find the command given in the arguments
			const command: ManiCommand | undefined = client.commands.fetchTextCommand(args[0]);
			if (!command) {				
				message.channel.send(`${message.author.username}, command \`${args[0]}\` does not exist. Try using one of the commands specified in \`h help\`.`);
				return;
			}

			// Create an embed to show the command help	
			const embed = new HelpEmbed(client, `${command.aliases[0]} Help ❓`)
				.setTitle(`/${command.aliases[0]}`)
				.setDescription(command.description);

			embed.addFields([{ name: "Aliases", value: `\`${command.aliases.join("` `")}\`` }]);
			// if (command.description.arguments) embed.addFields([{ name: "Arguments", value: command.description.arguments.join('\n') }]);
			// if (command.description.examples) embed.addFields([{ name: "Examples", value: command.description.examples.join('\n') }]);

			// Show the embed
			message.channel.send({ embeds:[embed] });			
		}
	}
	
}