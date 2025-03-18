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
import chalk = require("chalk");

export default class MarryCommand extends ManiCommand {
	public constructor(){
		super(["marry", "propose", "married"], config.commandGroups.Social);

		this.cooldown = 15_000;
		this.unlockable = true;
		this.description = 'Propose to marry another player';
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

		// Check if player is married
		if (player.marry.marriedOn && player.marry.marriedTo) {
			const secondsMarried: number = dateUtils.getSecondsBetweenDates(player.marry.marriedOn, dateUtils.getDateNow());
			client.users.fetch(player.marry.marriedTo).then(marriedUser => {
				notifications.SendInfoMsg(message, notifications.InfoMessages.Custom, 
					`you are 💍 **married** to **${marriedUser.username}** for **${dateUtils.getNumToTimeStr(secondsMarried)}**.`);
			}).catch(err => {
				notifications.SendInfoMsg(message, notifications.InfoMessages.Custom, `you are already married for **${dateUtils.getNumToTimeStr(secondsMarried)}**.`);
				console.log(chalk.red(`[Command: marry] ${err}`));
			});			
			return;			
		}

		// Get the mentioned user
		let mentionedUser = inputUtils.CheckMentionedUser(message, args[0], true);
		if (!mentionedUser) return;

		// Check if the user isn't marrying him/herself
		if (mentionedUser.id === message.author.id) {
			notifications.SendInfoMsg(message, notifications.InfoMessages.Custom, `I know you like yourself, but you can't **marry** yourself.`);
			return;
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

        // Ask the mentioned player permission
		const acceptButton = new Discord.ButtonBuilder()
			.setCustomId('yes')
			.setLabel(`Accept`)
			.setStyle(Discord.ButtonStyle.Success);
		const declineButton = new Discord.ButtonBuilder()
			.setCustomId('no')
			.setLabel(`Decline`)
			.setStyle(Discord.ButtonStyle.Danger);
		const marryButtonRow = new Discord.ActionRowBuilder<Discord.ButtonBuilder>()
			.addComponents(acceptButton, declineButton); 

		let botMessage = await message.channel.send({
			content: `<@${mentionedUser.id}>,\n**${message.author.username}** wishes to 💍 **marry** you...`,
			components: [marryButtonRow]
		});

		let buttonCollector = botMessage.createMessageComponentCollector({
			componentType: Discord.ComponentType.Button,
			filter: (i) => i.user.id === mentionedUser.id,
			time: 120_000
		});

		buttonCollector.on('collect', async (i: Discord.ButtonInteraction) => {
			i.deferUpdate();
			
			// Check if the channel is a TextChannel
			if (message.channel.type !== Discord.ChannelType.GuildText) return;

			if (i.customId === 'yes') {
				acceptButton.setStyle(Discord.ButtonStyle.Secondary);

				// Update the married status
				let date = new Date();
				player.marry.marriedOn = date;
				player.marry.marriedTo = mentionedUser.id;
				mentionedPlayer.marry.marriedOn = date;
				mentionedPlayer.marry.marriedTo = message.author.id;
				if (await client.database.updatePlayers([player, mentionedPlayer])) {				
					// Send message to inform the user
					message.channel.send(`**${message.author.username}**, you married 💍 **<@${mentionedUser.id}>**! ${suppliedReason}`);					
				}				
				else {
					notifications.SendErrorMsg(message, notifications.ErrorMessages.DBConnectionFailed);
				}	
			}
			if (i.customId === 'no') {
				declineButton.setStyle(Discord.ButtonStyle.Secondary);
				// Send message to inform the user
				message.channel.send(`**${message.author.username}**, **<@${mentionedUser.id}>** declined your marriage proposal.`);					
			}
			buttonCollector.stop();
		});
		
        buttonCollector.on('end', () => {
			acceptButton.setDisabled(true);
			declineButton.setDisabled(true);			
            botMessage.edit({ components: [marryButtonRow] });
        });  			

        // message.channel.send(`**${message.author.username}**, you tried to **marry** 💍 <@${mentionedUser.id}>. ` +
        //     `A romantic gesture, but unfortunately this functionality has not yet been implemented. *Coming Soon...*`);		
	}
	
}