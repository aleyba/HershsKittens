import * as Discord from "discord.js";
import * as utils from "../../../helpers/utils";
import * as inputUtils from "../../../helpers/inputUtils";
import * as arrayUtils from "../../../helpers/arrayUtils";
import * as notifications from "../../../helpers/notifications";
import { IPlayerDocument } from "../../../database/model/playerModel";
import { DefaultEmbed } from "../../../core/baseclasses";
import ManiClient from "../../../core/client";
import ManiCommand from "../../../core/command";
import config from "../../../config";
import { iconData } from "../../../database/data/imageData";

export default class ImposterCommand extends ManiCommand {    
	public constructor(){
		super(["imposter", "imp"], config.commandGroups.Gambling);

		this.unlockable = true;
		this.description = "Guess the imposter!";

	}

    // private readonly _imposterOptions = [`🤡`, `😈`, `👻`, `👾`, `🤖`, `👽`, `🎃`, `💩`];

	public async runCommand(options: { client: ManiClient, message: Discord.Message, player: IPlayerDocument, args: string[] }): Promise<void> {		
		const { client, message, player, args } = options;

		// Check if the channel is a TextChannel
		if (message.channel.type !== Discord.ChannelType.GuildText) return;

		let betAmount = 10;
        let bettingLimit = 50_000;
		
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
			.setTitle('Guess the Imposter!');

        let imposterOptions = arrayUtils.shuffle([`🤡`, `😈`, `👻`, `👾`, `🤖`, `👽`, `🎃`, `💩`]);
        imposterOptions.splice(4);
        let imposter = Math.floor(Math.random() * imposterOptions.length);
        // console.log(imposterOptions);                

        let imposterDescription = '';

		for (let i = 0; i < imposterOptions.length; i++) {
			if (imposter === i || Math.random() < 0.4) // show sus info (0.4 gives a 55% chance of winning, 0.45 gives a 50% chance)
                imposterDescription += `${imposterOptions[i]} **was seen near the victim!**\n`;
            else // show clear info
                imposterDescription += `${imposterOptions[i]} was somewhere else.\n`;
		}

        embed.setDescription(imposterDescription + `\nYou bet **${utils.getGoldStr(betAmount)}**`);   

		const buttonOptions: Discord.RestOrArray<Discord.ButtonBuilder> = [];
		for (let i = 0; i < imposterOptions.length; i ++) {
			buttonOptions.push(
				new Discord.ButtonBuilder()
					.setCustomId(`${i}`)
					.setEmoji(imposterOptions[i])
					.setStyle(Discord.ButtonStyle.Secondary)
			);
		}

        let imposterButtonRow: Discord.ActionRowBuilder<Discord.ButtonBuilder> = new Discord.ActionRowBuilder<Discord.ButtonBuilder>()
            .addComponents(buttonOptions); 		

        let gameEnded: boolean = false;
		const gambleMessage = await message.channel.send({ embeds: [embed], components: [imposterButtonRow] }) as Discord.Message;

		let buttonCollector = gambleMessage.createMessageComponentCollector({
			componentType: Discord.ComponentType.Button,
			filter: (i) => i.user.id === message.author.id,
			time: 60_000
		});

		buttonCollector.on('collect', async (i: Discord.ButtonInteraction) => {
            i.deferUpdate();			

			if (i.customId === `${imposter}`) {
				player.money += prizeAmount;
				// player.currency.totalGamblingIncome += betAmount;				
				message.channel.send(`**${message.author.username}**, you found the imposter ${imposterOptions[imposter]} and won **${utils.getGoldStr(prizeAmount)}**`);
					// ` your current balance is **${utils.getGoldStr(player.currency.gold)}**`);
			}
			else {
				player.money -= betAmount;
				// player.currency.totalGamblingLosses -= betAmount;
				message.channel.send(`**${message.author.username}**, the imposter was ${imposterOptions[imposter]}, you lost **${utils.getGoldStr(betAmount)}**`);
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