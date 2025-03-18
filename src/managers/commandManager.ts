import * as Discord from "discord.js";
import * as glob from "glob";
import * as util from "util";
import * as utils from "../helpers/utils";
import * as dateUtils from "../helpers/dateUtils";
import * as notifications from "../helpers/notifications";
import ManiClient from "../core/client";
import config from "../config";
import { IPlayerDocument } from "../database/model/playerModel";
import ManiCommand from "../core/command";
import chalk = require("chalk");

export interface ICommandManager {
	deploySlashCommands(): Promise<void>;
	loadCommands(): Promise<boolean>;	
	// getCooldown(commandName: string, playerId: number): number;
	fetchTextCommand(commandName: string): ManiCommand | undefined;
	handleMessage(client: ManiClient, message: Discord.Message): Promise<void>;
	fetchSlashCommand(commandName: string): ManiCommand | undefined;
	handleInteraction(client: ManiClient, interaction: Discord.Interaction): Promise<void>;
}

export default class CommandManager implements ICommandManager {
	private _textCommands: Discord.Collection<string, ManiCommand>;
	private _slashCommands: Discord.Collection<string, ManiCommand>;
	private _commandCooldowns: Map<any, any>;

	public constructor() {
		this._textCommands = new Discord.Collection();
		this._slashCommands = new Discord.Collection();
		this._commandCooldowns = new Map();
	}

	public async deploySlashCommands(): Promise<void> {
		const commands = config.commands;
		const slashCommands = new Array();

		// Get all the files in the commands folder
		console.log(chalk.cyan('Creating slash commands...'));
		await util.promisify(glob)(`${__dirname}/../commands/slashcommands/**/*{.ts,.js}`).then(commandFiles => {
			// Loop through the list of commands that was given
			for (const commandName of commands) {
				const file = commandFiles.find(f => f.includes(commandName));

				// Create the slash command if found and add the JSON body to the array
				if (file) {
					const CommandClass = require(file).default;
					const command: ManiCommand = new CommandClass as ManiCommand;						
					slashCommands.push(command.createSlashCommand().toJSON());

					console.log(chalk.yellow(`created mani ${command.aliases[0]}`));
				}
			}				
		}).catch(err => {
			console.log(chalk.red(`[CommandManager.deploySlashCommands] ${err}`));
		});				

		// Deploy the slash commands
		const rest = new Discord.REST({ version: '10' }).setToken(config.token);
		try {
			console.log(chalk.cyan('Deploying slash commands...'));

			// An empty body would remove all slash commands from the guild(s)
			// If no guildId is given, the commands are doployed to all guilds the bot is in
			await rest.put(
				Discord.Routes.applicationGuildCommands(config.clientId, config.testGuildId), 
				{ body: slashCommands }
			);

			console.log(chalk.cyan(`Successfully deployed ${slashCommands.length} slash commands!`));
		} catch(error) {
			console.log(chalk.red(`[CommandManager.deploySlashCommands] ${error}`));
		}	
	}	

	public async loadCommands(): Promise<boolean> {
		const commands = config.commands;
		
		if (commands.length < 1) return false;
		commands.push(...['help', 'devhelp']);

		// Get all the files in the commands folder
		await util.promisify(glob)(`${__dirname}/../commands/textcommands/**/*{.ts,.js}`).then(commandFiles => {
			// Loop through the list of commands that was given
			for (const commandName of commands) {
				// console.log(`search: ${commandName}`);
				const file = commandFiles.find(f => f.includes(`${commandName}.`));				

				// Add the command to the command list if found
				if (file) {
					const CommandClass = require(file).default;
					const command: ManiCommand = new CommandClass as ManiCommand;
					this._textCommands.set(command.aliases[0], command);
					this._commandCooldowns.set(command.aliases[0], new Map());
					// console.log(`registered: ${command.aliases[0]}`);
				}
			}			
		}).catch(err => {
			console.log(chalk.red(`[CommandManager.loadCommands(TextCommands)] ${err}`));
		});		

		// Get all the files in the commands folder
		await util.promisify(glob)(`${__dirname}/../commands/slashcommands/**/*{.ts,.js}`).then(commandFiles => {
			// Loop through the list of commands that was given
			for (const commandName of commands) {
				const file = commandFiles.find(f => f.includes(`${commandName}.`));

				// Add the command to the command list if found
				if (file) {
					const CommandClass = require(file).default;
					const command: ManiCommand = new CommandClass as ManiCommand;
					this._slashCommands.set(command.aliases[0], command);
				}
			}			
		}).catch(err => {
			console.log(chalk.red(`[CommandManager.loadCommands(SlashCommands)] ${err}`));
		});			
		
		// Return if commands were loaded
		return (this._textCommands.size > 0) || (this._slashCommands.size > 0);
	}

	public fetchTextCommand(commandName: string): ManiCommand | undefined {
		return this._textCommands.find(cmd => cmd.aliases.includes(commandName));
	}

	public async handleMessage(client: ManiClient, message: Discord.Message): Promise<void> {
		const msg: string = message.content.toLowerCase();
		
		let player: IPlayerDocument | null = await client.database.addOrGetUser(message.author.id, message.author.username);
		if (!player) return;

		// Determine if a prefix was used
		let usedPrefix: string = '';
		if (msg.startsWith(`<@${client.user?.id}>`)) usedPrefix = `<@${client.user?.id}>`;
		else if (msg.startsWith(`<@!${client.user?.id}>`)) usedPrefix = `<@!${client.user?.id}>`;
		else if (msg.startsWith(config.botprefix)) usedPrefix = config.botprefix;
		else if (msg.startsWith(config.defaultprefix)) usedPrefix = player.settings.prefix;

		// Exit if no prefix was used
		if (usedPrefix === '') return;

		// Extract the command name and arguments from the message
		const args: string[] = message.content.slice(usedPrefix.length).trim().split(/ +/g);
		const commandName: string | undefined = args.shift()?.toLowerCase();
		const command: ManiCommand | undefined = commandName? this.fetchTextCommand(commandName) : undefined;

		// Exit if no command was used or command is disabled
		if ((!command) || (!command.enabled)) return;

		// Exit if the command has limited access
		if (command.developer && !config.developers.includes(message.author.id)) return;
		if (command.unlockable && player.cats.length < 1) {
			notifications.SendErrorMsg(message, notifications.ErrorMessages.Custom, "adopt a kitten to unlock this command.");
			return;
		}

		// Exit if the command is on cooldown
		const userCooldownDate: any = this._commandCooldowns.get(command.aliases[0]).get(message.author.id);
		if (userCooldownDate) {
			const currentDate: any = new Date() as any;
			const difference: number = currentDate - userCooldownDate;
			const secondsLeft: number = Math.floor((command.cooldown - difference) / 1000);

			const infoMsg = `this command is on cooldown. Please wait **${dateUtils.getNumToTimeStr(secondsLeft)}** and try again.`
			notifications.SendInfoMsg(message, notifications.InfoMessages.Custom, infoMsg);
			return;
		}		

		// Run the command
		command.runCommand({ client: client, message: message, player: player, args: args }).catch(err => {
			console.log(chalk.red(`[CommandManager.handleMessage] (${command.aliases[0]}) ${err}`));
		});

		// Add the user to the cooldown list for the used command
		this._commandCooldowns.get(command.aliases[0]).set(message.author.id, new Date());
		setTimeout(() => {
			this._commandCooldowns.get(command.aliases[0]).delete(message.author.id);
		}, command.cooldown);
	}

	public fetchSlashCommand(commandName: string): ManiCommand | undefined {
		return this._slashCommands.find(cmd => cmd.aliases.includes(commandName));
	}

	public async handleInteraction(client: ManiClient, interaction: Discord.Interaction): Promise<void> {
		if (interaction.isChatInputCommand()) {
			let user: IPlayerDocument | null = await client.database.addOrGetUser(interaction.user.id, interaction.user.username);
			if (!user) return;

			// Extract the command name and arguments from the interaction
			const args: string[] = [];
			const commandName: string = interaction.commandName;
			const command: ManiCommand | undefined = commandName? this.fetchSlashCommand(commandName) : undefined;

			// Exit if no command was used or command is disabled
			if ((!command) || (!command.enabled)) return;
		
			// Exit if the command has limited access
			if (command.developer && !config.developers.includes(interaction.user.id)) return;
			if (command.unlockable && user.cats.length < 1) {
				await interaction.reply({
					content: "Adopt a kitten to unlock this command."
				})
				return;
			}	
			
			// Exit if the command is on cooldown
			const userCooldownDate: any = this._commandCooldowns.get(command.aliases[0]).get(interaction.user.id);
			if (userCooldownDate) {
				const currentDate: any = new Date() as any;
				const difference: number = currentDate - userCooldownDate;
				const secondsLeft: number = Math.floor((command.cooldown - difference) / 1000);

				await interaction.reply({
					content: `This command is on cooldown. Please wait **${dateUtils.getNumToTimeStr(secondsLeft)}** and try again...`,
					ephemeral: true
				})
				return;				
			}		

			// Run the command
			command.runCommand({ client: client, interaction: interaction, player: user, args: args }).catch(err => {
				console.log(chalk.red(`[CommandManager.handleMessage] (${command.aliases[0]}) ${err}`));
			});

			// Add the user to the cooldown list for the used command
			this._commandCooldowns.get(command.aliases[0]).set(interaction.user.id, new Date());
			setTimeout(() => {
				this._commandCooldowns.get(command.aliases[0]).delete(interaction.user.id);
			}, command.cooldown);			
		}
	}

}