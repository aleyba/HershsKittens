import * as Discord from "discord.js";
import * as utils from "../../../helpers/utils";
import * as inputUtils from "../../../helpers/inputUtils";
import * as notifications from "../../../helpers/notifications";
import { IPlayerDocument } from "../../../database/model/playerModel";
import { DefaultEmbed } from "../../../core/baseclasses";
import ManiClient from "../../../core/client";
import ManiCommand from "../../../core/command";
import config from "../../../config";
import { iconData } from "../../../database/data/imageData";

export default class WeatherCommand extends ManiCommand {    
	public constructor(){
		super(["weather", "predictweather", "predict", "pw"], config.commandGroups.Gambling);

		this.unlockable = true;
		this.description = "Gamble on the weather";

	}

    private readonly _weatherOptions = [`🌩️`, `🌧️`, `☁️`, `⛅`]; // 🌡️ 🥶 🥵 ❔ ❄️ ☀️

	public async runCommand(options: { client: ManiClient, message: Discord.Message, player: IPlayerDocument, args: string[] }): Promise<void> {		
		const { client, message, player, args } = options;

		// Check if the channel is a TextChannel
		if (message.channel.type !== Discord.ChannelType.GuildText) return;

		let betAmount = 10;
		const bettingLimit = 50_000;
		
		if (args.length != 0) {
			// Get the amount to bet
			betAmount = inputUtils.CheckAmount(message, args[0], true, true);
			if (betAmount < 0.5) return; 		
		}

		// Check wallet
		betAmount = inputUtils.getAmount(message, player.money, betAmount, "gold", "bet");
		if (betAmount < 1) return;
		
		// Calculate all and half with betting max
		if (args[0] == "all") {
			if (betAmount > bettingLimit) betAmount = bettingLimit;
		}
		else if (args[0] == "half") {
			if (betAmount > Math.floor(bettingLimit/2)) betAmount = Math.floor(bettingLimit/2);
		}

		// Check if the amount is under the maximum
		if (betAmount > bettingLimit) {
			message.channel.send(`**${message.author.username}**, the betting amount has to be a maximum of **${utils.getGoldStr(bettingLimit)}**. `);
			// `The maximum betting amount increases with your level.`);
			return;
		}

		let prizeAmount = betAmount * 2;


        client.emojis.cache.find(emoji => emoji.name == 'cloud')?.imageURL();
		let embed: DefaultEmbed = new DefaultEmbed(message.author)
			.setTitle('Predict the weather!')
            .setDescription(`⛅ → 🌧️ → ❓\n\nYou bet **${utils.getGoldStr(betAmount)}**`)
            .setTimestamp(new Date());

		let leftoverPercentage = 103;
		let maxPercentage = Math.floor(Math.random() * 25) + 50 + 1; // 0~25 + minimumpercentage + 1
		let minPercentage = 26;
		const percentages: number[] = [0, 0, 0, 0]
		for (let i = 0; i < percentages.length - 1; i++) {
			// console.log(minPercentage + '~' + maxPercentage);
			percentages[i] = Math.floor(Math.random() * (maxPercentage - minPercentage)) + minPercentage - 1;
			leftoverPercentage -= percentages[i] + 1;
			maxPercentage = Math.min(maxPercentage, leftoverPercentage);
			minPercentage = Math.max(0, leftoverPercentage - (percentages.length - 2 - i) * maxPercentage) + 1;			
		}		
		percentages[percentages.length - 1] = leftoverPercentage;
		// console.log(percentages);

		let winningPercentage = Math.floor(Math.random() * 100) + 1;
		// console.log({ winningPercentage });
		let winningIndex = -1;
		while (winningPercentage > 0) {
			winningIndex += 1
			winningPercentage -= percentages[winningIndex];
		}
		// console.log({ winningIndex });
        

		const weatherOptions: Discord.RestOrArray<Discord.ButtonBuilder> = [];
		for (let i = 0; i < percentages.length; i ++) {
			weatherOptions.push(
				new Discord.ButtonBuilder()
					.setCustomId(`${i}`)
					.setLabel(`${percentages[i]}%`)
					.setEmoji(this._weatherOptions[i])
					.setStyle(Discord.ButtonStyle.Primary)
			);
		}

		// Double Down Button
		let doubleButton: Discord.ButtonBuilder = new Discord.ButtonBuilder()
			.setCustomId(`double`)
			.setLabel(`Double Bet`)
			// .setEmoji(iconData.gold.gold_1k)
			.setStyle(Discord.ButtonStyle.Danger)
		weatherOptions.push(doubleButton);

		// Disable double down if player doesn't have enough gold
		if (player.money < betAmount * 2) {
			doubleButton.setStyle(Discord.ButtonStyle.Secondary);
			doubleButton.setDisabled(true);			
		}			

        let weatherButtonRow: Discord.ActionRowBuilder<Discord.ButtonBuilder> = new Discord.ActionRowBuilder<Discord.ButtonBuilder>()
            .addComponents(weatherOptions); 		

		let gameEnded = false;
		const gambleMessage = await message.channel.send({ embeds: [embed], components: [weatherButtonRow] }) as Discord.Message;

		let buttonCollector = gambleMessage.createMessageComponentCollector({
			componentType: Discord.ComponentType.Button,
			filter: (i) => i.user.id === message.author.id,
			time: 30_000
		});

		buttonCollector.on('collect', async (i: Discord.ButtonInteraction) => {
            i.deferUpdate();
			
			// Check if the channel is a TextChannel
			if (message.channel.type !== Discord.ChannelType.GuildText) return;

			if (i.customId === 'double') {
				betAmount *= 2;
				prizeAmount *= 2;
				embed.setDescription(`⛅ → 🌧️ → ❓\n\nYou bet **${utils.getGoldStr(betAmount)}**`)
				doubleButton.setStyle(Discord.ButtonStyle.Secondary);
				doubleButton.setDisabled(true);
				gambleMessage.edit({ embeds: [embed], components: [weatherButtonRow] })	
				return;
			}

			if (i.customId === `${winningIndex}`) {
				player.money += prizeAmount;
				// player.currency.totalGamblingIncome += betAmount;				
				message.channel.send(`**${message.author.username}**, congratulations you won **${utils.getGoldStr(prizeAmount)}**`);
					// ` your current balance is **${utils.getGoldStr(player.currency.gold)}**`);
			}
			else {
				player.money -= betAmount;
				// player.currency.totalGamblingLosses -= betAmount;
				message.channel.send(`**${message.author.username}**, you lost **${utils.getGoldStr(betAmount)}** *:( better luck next time...*`);
				// ` your current balance is **${utils.getGoldStr(player.currency.gold)}**`);
			}

			gambleMessage.edit({ components: [] })

			gameEnded = true;
			// player.statistics.gamblingCommandsUsed ++;
			client.database.updatePlayer(player).then(succeeded => {
				if (!succeeded) notifications.SendErrorMsg(message, notifications.ErrorMessages.DBConnectionFailed);
			});
		});

		buttonCollector.on('end', () => {
			if (gameEnded) return;

			// Check if the channel is a TextChannel
			if (message.channel.type !== Discord.ChannelType.GuildText) return;

            gambleMessage.edit({ components: [] })			
			message.channel.send(`**${message.author.username}**, you waited too long and lost **${utils.getGoldStr(betAmount)}**`);

			player.money -= betAmount;
			// player.currency.totalGamblingLosses -= betAmount;
			// player.statistics.gamblingCommandsUsed ++;
			client.database.updatePlayer(player).then(succeeded => {
				if (!succeeded) notifications.SendErrorMsg(message, notifications.ErrorMessages.DBConnectionFailed);
			});			
        });

	}
	
}