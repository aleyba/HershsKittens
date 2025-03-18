import * as Discord from "discord.js";
import * as utils from "../../../helpers/utils";
import * as dateUtils from "../../../helpers/dateUtils";
import * as inputUtils from "../../../helpers/inputUtils";
import * as notifications from "../../../helpers/notifications";
import { IPlayerDocument } from "../../../database/model/playerModel";
import { DefaultEmbed } from "../../../core/baseclasses";
import ManiClient from "../../../core/client";
import config from "../../../config";
import ManiCommand from "../../../core/command";

export default class HonorCommand extends ManiCommand {
	public constructor(){
		super(["honor", "rep", "giverep"], config.commandGroups.Social);

		this.unlockable = true;
		this.description = 'Gives a player +1 honor';
		/*{
			arguments(): string[] {
				return [
					"`<@Mention> (User)`: The user you wish to give reputation",
					"`<reason> (Text)`: A reason for giving the user reputation **(optional)**"
				];
			}

			examples(): string[] {
				return [
					"`mani rep @User`: Gives the user +1 rep",
					"`mani rep @User because you're so honorable`: Gives the user +1 rep and shows the reason"
				]
			}
		}*/
	}

	public async runCommand(options: { client: ManiClient, message: Discord.Message, player: IPlayerDocument, args: string[] }): Promise<void> {
        const { client, message, player, args } = options;

		// Check if the channel is a TextChannel
		if (message.channel.type !== Discord.ChannelType.GuildText) return;

		// Get the current date
		const dateNow: Date = dateUtils.getDateNow();
		const daysSinceLastHonor: number = dateUtils.getDaysBetweenDates(dateUtils.getDateAtMidnight(dateNow), dateUtils.getDateAtMidnight(player.daily.repClaimedOn));	
		
		if (daysSinceLastHonor < 1) {
			const dateTomorrowMidnight: Date = dateUtils.getDateAtMidnight(dateUtils.getDateAddDays(dateNow, 1));
			const secondsTillNextHonor: number = dateUtils.getSecondsBetweenDates(dateTomorrowMidnight, dateUtils.getDateNow());

			const infoMsg = `you have already given someone reputation today. Please wait **${dateUtils.getNumToTimeStr(secondsTillNextHonor)}** and try again.`;
			notifications.SendInfoMsg(message, notifications.InfoMessages.Custom, infoMsg);
			return;
		} 

		// Get the mentioned user
		let mentionedUser = inputUtils.CheckMentionedUser(message, args[0], true);
		if (!mentionedUser) return;

		// Check if the user isn't repping him/herself
		if (mentionedUser.id === message.author.id) {
			notifications.SendInfoMsg(message, notifications.InfoMessages.Custom, `it's good to vouch for yourself, but you can't give yourself reputation.`);
			if (mentionedUser.id != config.hershId)
				return;
			notifications.SendInfoMsg(message, notifications.InfoMessages.Custom, `unless you're hersh of course.`);
		}

		// Get the supplied reason
		let suppliedReason = args.slice(1).join(" ") || '';
		if (suppliedReason != "") suppliedReason = `*${suppliedReason.trim()}*`;

		// Get mentioned user's data
		let mentionedPlayer = await client.database.getPlayer(mentionedUser.id);

		// Check if the mentioned user was found		
		if (!mentionedPlayer) {
			notifications.SendErrorMsg(message, notifications.ErrorMessages.PlayerNotFound);
			return;
		}

		// Update the reputation			
		player.daily.repClaimedOn = dateNow;
		player.statistics.reputationGiven ++;
		mentionedPlayer.reputation ++;
		if (await client.database.updatePlayers([player, mentionedPlayer])) {				
			// Send message to inform the user
			message.channel.send(`**${message.author.username}**, you gave <@${mentionedUser.id}> 🎖️**+1** reputation. ${suppliedReason}`);					
		}				
		else {
			notifications.SendErrorMsg(message, notifications.ErrorMessages.DBConnectionFailed);
		}

	}
	
}