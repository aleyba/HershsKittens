import * as Discord from "discord.js";
import * as utils from "../../../helpers/utils";
import * as dateUtils from "../../../helpers/dateUtils";
import * as notifications from "../../../helpers/notifications";
import { IPlayerDocument } from "../../../database/model/playerModel";
import { DefaultEmbed } from "../../../core/baseclasses";
import ManiClient from "../../../core/client";
import config from "../../../config";
import ManiCommand from "../../../core/command";
import { QuestID } from "../../../database/data/questData";

export default class DailyCommand extends ManiCommand {
	public constructor(){
		super(["daily"], config.commandGroups.Owner);

		this.unlockable = true;
		this.description = 'Gives you your daily money, increasing for each consecutive day of use';
		this.examples = [
            "`h daily`: Gives you your daily money"
        ]
	}

	public async runCommand(options: { client: ManiClient, message: Discord.Message, player: IPlayerDocument, args: string[] }): Promise<void> {
		const { client, message, player, args } = options;

		// Check if the channel is a TextChannel
		if (message.channel.type !== Discord.ChannelType.GuildText) return;

		// Get the difference in days
		const dateNow: Date = dateUtils.getDateNow();
		const daysSinceLastDaily: number = dateUtils.getDaysBetweenDates(dateUtils.getDateAtMidnight(dateNow), dateUtils.getDateAtMidnight(player.daily.dailyClaimedOn));

		// Get the cooldown time for the next day		
		const dateTomorrowMidnight: Date = dateUtils.getDateAtMidnight(dateUtils.getDateAddDays(dateNow, 1));
		const secondsTillNextDaily: number = dateUtils.getSecondsBetweenDates(dateTomorrowMidnight, dateUtils.getDateNow());

		// Init the streak info
		let streakInfo: string = '🙌 *Claim tomorrow to start a daily streak*\n';

		// Check if the user has already claimed their daily today
		if (daysSinceLastDaily < 1) {
			const infoMsg = `you have already claimed your daily for today. Please wait **${dateUtils.getNumToTimeStr(secondsTillNextDaily)}** for your next daily.`;
			notifications.SendInfoMsg(message, notifications.InfoMessages.Custom, infoMsg);
			// message.channel.send(`${message.author.username}, you have already claimed your daily for today. Please wait ` +
			// 	`**${dateUtils.getNumToTimeStr(secondsTillNextDaily)}** for your next daily.`)
			// 	.then(msg => setTimeout(() => (msg as Discord.Message).delete(), 10000));
			return;			
		}
		else if (daysSinceLastDaily < 2) {
			// In time to keep the streak going
			player.daily.dailyStreakCurrent++;
			if (player.daily.dailyStreakMax < player.daily.dailyStreakCurrent) player.daily.dailyStreakMax = player.daily.dailyStreakCurrent;
		}
		else {
			// Reset the streak if the user had one
			if (player.daily.dailyStreakCurrent > 1) streakInfo = `😭 *You've lost your **${player.daily.dailyStreakCurrent}** daily streak :(*\n`;
			player.daily.dailyStreakCurrent = 1;
		}

		// Set the daily amount		
		let dailyAmount: number = 200; // + Math.floor(Math.random() * 100);
		let streakAmount: number = 0;
		if (player.daily.dailyStreakCurrent > 1) {
			streakAmount = player.daily.dailyStreakCurrent * 25; //100;
			streakInfo = `You're on a 🔥 **${player.daily.dailyStreakCurrent}** daily streak *(+ ${streakAmount})*\n`;			
		}		

		// Set the cooldown and update the gold amount and streak info in database
		player.money += dailyAmount + streakAmount;
		player.currency.totalDailyIncome += dailyAmount + streakAmount;
		player.daily.dailyClaimedOn = dateNow;		
		player.statistics.dailiesCollected ++;
		await client.quests.updateQuestProgress(player, client.database, [QuestID.daily]);
		if (await client.database.updatePlayer(player)) {
			// Create an embed to show the result
			const embed: DefaultEmbed = new DefaultEmbed(message.author)      
				.setDescription(`**You received your daily ${utils.getGoldStr(dailyAmount + streakAmount)}**\n` + streakInfo)
				.setFooter({ text: `You can claim your next daily in ${dateUtils.getNumToTimeStr(secondsTillNextDaily)}` })

			// Send the embed
			message.channel.send({ embeds: [embed] });
		}
		else {
			notifications.SendErrorMsg(message, notifications.ErrorMessages.DBConnectionFailed);
			// message.channel.send(`${message.author.username}, updating the database failed...`);
		}
	}
	
}