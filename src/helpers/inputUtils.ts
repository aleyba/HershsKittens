import * as Discord from "discord.js";
import * as utils from "./utils";
import * as notifications from "./notifications";

const _halfGold = 0.5;
const _allGold = 999999999999;

export interface MentionInfo {
	user: Discord.User | undefined;
	arg_id: number;
}
export class MentionInfo implements MentionInfo {
	constructor () {
		this.user = undefined,
		this.arg_id = -1;
	}
}

export function CheckMentionedUser(message: Discord.Message, arg: string, sendErrorMsg: boolean = false) {
	// Check if there is a given argument
	if (!arg) {
		if (sendErrorMsg) notifications.SendErrorMsg(message, notifications.ErrorMessages.PlayerNotMentioned);
		return;
	}

	// Get the mentioned user from the message object
	let mentionedUser = message.mentions.users.first();
	let found = false;
	
	if (mentionedUser) {
		// Check if the mentioned user found is indeed the argument
		if ((arg === `<@!${mentionedUser.id}>`) || (arg === `<@${mentionedUser.id}>`)) {
			found = true;
		}
	}
	else {
		// Try to find the mentioned user in the guild based on the argument
		message.guild?.members.cache.forEach(guildMember => {
			if (!found && (arg.includes(guildMember.user.id) || guildMember.user.tag.toLocaleLowerCase().startsWith(arg))) {
				mentionedUser = guildMember.user;
				found = true;
			}			
		})
	};

	// Return the mentioned user or show an error message if needed
	if (found) return mentionedUser
	else if (sendErrorMsg) notifications.SendErrorMsg(message, notifications.ErrorMessages.Custom, `could not find user "**${arg}**"`);
}

export function GetMentionedUser(message: Discord.Message, args: string[], limit: number, sendErrorMSg: boolean = false) {
	// Init the mention info object
	let mentionInfo = new MentionInfo();
	let searchLimit = limit > 0 ? limit : args.length;

	// Check if there is a given argument
	if (args.length < 1) {
		if (sendErrorMSg) notifications.SendErrorMsg(message, notifications.ErrorMessages.PlayerNotMentioned);
		return mentionInfo;
	}

	// Get the mentioned user from the message object
	let mentionedUser = message.mentions.users.first();

	if (mentionedUser) {
		// Check which one of the arguments is the mentioned user
		for (let i = 0; i < searchLimit; i++) {
			if ((args[i] != `<@!${mentionedUser.id}>`) && (args[i] != `<@${mentionedUser.id}>`)) continue;

			mentionInfo.user = mentionedUser;
			mentionInfo.arg_id = i;
			return mentionInfo;
		}
	}
	else {
		message.guild?.members.cache.forEach(guildMember => {
			// Try to find the mentioned user in the guild based on the arguments
			for (let j = 0; j < searchLimit; j++) {
				if (!args[j].includes(guildMember.user.id) && !guildMember.user.tag.toLocaleLowerCase().startsWith(args[j])) continue;
	
				mentionInfo.user = guildMember.user;
				mentionInfo.arg_id = j;
				break;
			}
		})
	};

	// Mentioned user not found, show an error message if needed
	if (!mentionInfo.user && sendErrorMSg) notifications.SendErrorMsg(message, notifications.ErrorMessages.PlayerNotFound);	
	
	// Return the object
	return mentionInfo;
}

export function CheckAmount(message: Discord.Message, arg: string, sendErrorMsg: boolean = false, gold: boolean = false) {
	// if (message.channel.type !== Discord.ChannelType.GuildText) return;

	// Check if there is a given argument
	if (!arg) {
		if (sendErrorMsg) {
			notifications.SendErrorMsg(message, notifications.ErrorMessages.Custom, `please specify an amount.`);
		}
		return -1;
	}

	let amount = gold? 0 : parseInt(arg, 10);

	if (gold) {
		// Convert 1e3 etc
		if (arg.includes("e")) {
			let split = arg.split("e");
			arg = `${parseInt(split[0]) * Math.pow(10, parseInt(split[1]))}`;
		}

		// Convert the argument to an integer
		amount = parseInt(utils.getConvertedGoldInputStr(arg), 10);
	}

	// Convert half and all
	if (arg === "half") amount = _halfGold
	else if (arg == "all") amount = _allGold;

	// Check if the argument is filled and is an integer
	if (isNaN(amount)) {
		notifications.SendErrorMsg(message, notifications.ErrorMessages.Custom, `specify a valid amount.`);
		return -1;
	}

	// Check if the amount is positive
	if (amount < 0.5) {
		notifications.SendErrorMsg(message, notifications.ErrorMessages.Custom, `the specified amount has to be at least 1.`);
		return -1;
	}	

	return amount;
}

export function getAmount(message: Discord.Message, source: number, amount: number, sourceType: string, action: string, minAmount: number = 1) {
	// // Check if the channel is a TextChannel
	// if (message.channel.type !== Discord.ChannelType.GuildText) return;

	// check half
	if (amount === _halfGold) amount = Math.floor(source * 0.5)

	// check all
	else if (amount === _allGold) amount = source
	
	// Check if the user has enough 
	else if (source < amount) {			
		notifications.SendErrorMsg(message, notifications.ErrorMessages.Custom, `you don't have that much ${sourceType} to ${action}.`);
		return -1;
	}

	// check if amount is at least minAmount
	else if (amount < minAmount) {
		notifications.SendErrorMsg(message, notifications.ErrorMessages.Custom, `you have to ${action} at least ${minAmount} ${sourceType}.`);
		return -1;
	}
	
	return amount;
}