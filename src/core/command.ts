import * as Discord from "discord.js";
import { IPlayerDocument } from "../database/model/playerModel";
import ManiClient from "./client";

export interface IBotCommandRunOptions {
	client: ManiClient,
	message?: Discord.Message,
	interaction?: Discord.ChatInputCommandInteraction,
	player?: IPlayerDocument,
	args?: string[]
}

export interface IBotCommandArgumentChoice {
	name: string,
	value: string | number | boolean | Discord.User
}

export enum IBotCommandArgumentType { String, Integer, Number, Boolean, UserMention }
export interface IBotCommandArgumentOption {
	name: string;
	description: string;
	type: IBotCommandArgumentType;
	required: boolean;
	examples?: string[];
	choices?: IBotCommandArgumentChoice[];
	minValue?: number;
	maxValue?: number;
}

export interface IBotCommandArgument {
	name: string;
	type: IBotCommandArgumentType;
	value?: string | number | boolean | Discord.User;
}

export default abstract class ManiCommand {
	public enabled: boolean;
	public cooldown: number;
	public ratelimit: number;
	public developer: boolean;
	public unlockable: boolean;
	public description: string;
	public argumentOptions?: IBotCommandArgumentOption[];
	public examples?: string[];

	public constructor(private _aliases: string[], private _category: string) {
		this.enabled = true;
		this.cooldown = 100;
		this.ratelimit = 4;
		this.developer = false;
		this.unlockable = false;
		this.description = '';
	}

	get aliases() { return this._aliases; }
	get category() { return this._category; }	

	public abstract runCommand(options: IBotCommandRunOptions): Promise<void>;

	public createSlashCommand(): Discord.SlashCommandBuilder {
		const slashCommand: Discord.SlashCommandBuilder = new Discord.SlashCommandBuilder()
			.setName(this._aliases[0])
			.setDescription(this.description);
		if (this.argumentOptions) {
			this.argumentOptions.forEach(argumentOption => {
				if (argumentOption.type === IBotCommandArgumentType.String) {
					slashCommand.addStringOption(option => option.setName(argumentOption.name)
						.setDescription(argumentOption.description)
						.setRequired(argumentOption.required));
					const stringOption: Discord.SlashCommandStringOption = slashCommand.options[slashCommand.options.length-1] as Discord.SlashCommandStringOption;
					if (argumentOption.choices) {
						argumentOption.choices.forEach(choice => {
							stringOption.addChoices({ name: choice.name, value: choice.value as string });
						})
					}						
				} else if (argumentOption.type === IBotCommandArgumentType.Integer) {
					slashCommand.addIntegerOption(option => option.setName(argumentOption.name)
						.setDescription(argumentOption.description)
						.setRequired(argumentOption.required));
					const integerOption: Discord.SlashCommandIntegerOption = slashCommand.options[slashCommand.options.length-1] as Discord.SlashCommandIntegerOption;
					if (argumentOption.choices) {
						argumentOption.choices.forEach(choice => {
							integerOption.addChoices({ name: choice.name, value: choice.value as number });
						})
					}						
				} else if (argumentOption.type === IBotCommandArgumentType.Number) {
					slashCommand.addIntegerOption(option => option.setName(argumentOption.name)
						.setDescription(argumentOption.description)
						.setRequired(argumentOption.required));
					const numberOption: Discord.SlashCommandNumberOption = slashCommand.options[slashCommand.options.length-1] as Discord.SlashCommandNumberOption;
					if (argumentOption.choices) {
						argumentOption.choices.forEach(choice => {
							numberOption.addChoices({ name: choice.name, value: choice.value as number });
						})
					}						
				} else if (argumentOption.type === IBotCommandArgumentType.Boolean) {
					slashCommand.addBooleanOption(option => option.setName(argumentOption.name)
						.setDescription(argumentOption.description)
						.setRequired(argumentOption.required));
				} else if (argumentOption.type === IBotCommandArgumentType.UserMention) {
					slashCommand.addUserOption(option => option.setName(argumentOption.name)
						.setDescription(argumentOption.description)	
						.setRequired(argumentOption.required));	
				} 
			})
		}
		return slashCommand;
	}

	protected checkLocation(): boolean {
		return false;
	}
}







/*
export interface IBotCommand {
	enabled: boolean;
	aliases: string[];
	category: string;
	cooldown: number;
	ratelimit: number;
	developer: boolean;
	unlockable: boolean;
	description: 
	{
		content: string,
		arguments?: string[],
		examples?: string[]
	}
	runCommand(options: IBotCommandRunOptions): Promise<void>;
}
*/