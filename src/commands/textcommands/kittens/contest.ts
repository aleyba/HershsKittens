import * as Discord from "discord.js";
import * as notifications from "../../../helpers/notifications";
import { IPlayerDocument, IPlayerCat } from "../../../database/model/playerModel";
import { DefaultEmbed, HelpEmbed } from "../../../core/baseclasses";
import ManiClient from "../../../core/client";
import config from "../../../config";
import ManiCommand from "../../../core/command";
import { iconData, imageURLs } from "../../../database/data/imageData";
import { CatActions, CatStats, getBar, getCatScore, getEmotion, getMinCatScore, getRank, getStatExp, getStatExpNext, ICatDocument, performAction, performTraining } from "../../../database/model/catModel";
import { getGoldStr } from "../../../helpers/utils";
import { getDateNow, getNumToTimeStr, getSecondsBetweenDates } from "../../../helpers/dateUtils";
import { QuestID } from "../../../database/data/questData";

export default class ContestCommand extends ManiCommand {
    public constructor(){
        super(["contest", "tournament", "compete"], config.commandGroups.Kittens);

        // this.cooldown = 60_000 * 60;
        this.unlockable = true;
        this.description = 'Join a contest with your kitten';

    }

    private readonly cooldownInSeconds = 60 * 60;

    public async runCommand(options: { client: ManiClient, message: Discord.Message, player: IPlayerDocument, args: string[] }): Promise<void> {
        const { client, message, player, args } = options;

        // Check if the channel is a TextChannel
        if (message.channel.type !== Discord.ChannelType.GuildText) return;

        // Check if the player has cats
        if (player.cats.length < 1) {
            notifications.SendInfoMsg(message, notifications.InfoMessages.Custom, `you have no kittens...`);
            return;
        }       

        // Fetch active kitten from the database
        const activeKitten = await player.fetchActiveCat(client.database);
        if (!activeKitten) {
            notifications.SendErrorMsg(message, notifications.ErrorMessages.Custom, `active kitten not found.`);
            return;
        }

        // Check if kitten has energy to play
        if (activeKitten.energy == 0) {
            message.channel.send({ content: `${activeKitten.data?.icon.back}` });
            message.channel.send(`**${activeKitten.name}** has no energy to join a contest...`);
            return;
        }  

        // Check if kitten's full enough to play
        if (activeKitten.hunger == 0) {
            message.channel.send({ content: `${activeKitten.data?.icon.back}` });
            message.channel.send(`**${activeKitten.name}** is starving...`);
            return;
        }   

        // Check if kitten's happiness is full
        if (activeKitten.happiness == 0) {
            message.channel.send({ content: `${activeKitten.data?.icon.back}` });
            message.channel.send(`**${activeKitten.name}** is unhappy...`);
            return;
        }

        // Check cooldown
        const secondsSinceLastContest = getSecondsBetweenDates(getDateNow(), player.cooldowns.contest);
        if (secondsSinceLastContest < this.cooldownInSeconds) {
            const infoMsg = `you recently joined a contest. Please wait **${getNumToTimeStr(this.cooldownInSeconds - secondsSinceLastContest)}** to join another one.`;
            notifications.SendInfoMsg(message, notifications.InfoMessages.Custom, infoMsg);
            return;
        }
        
        // Fetch contest cat data
        await client.contest.fetchCatData(client.database);

        // Create an embed to show the contest
        let contestEmbed = this.createContestEmbed(client, activeKitten);

        // Constest Start Row
        const startButton = new Discord.ButtonBuilder()
            .setCustomId('start')
            .setLabel(`Start Contest`)
            .setEmoji(`🎀`)
            .setStyle(Discord.ButtonStyle.Success);
        const contestStartRow = new Discord.ActionRowBuilder<Discord.ButtonBuilder>()
            .addComponents(startButton); 
            
            
        // Send the Contest Embed
        await message.channel.send("**Sukrati:** Welcome to our kitten contest, compete and win prizes!");
        let botMessage = await message.channel.send({ embeds: [contestEmbed], components: [contestStartRow] });

        let buttonCollector = botMessage.createMessageComponentCollector({
            componentType: Discord.ComponentType.Button,
            filter: (i) => i.user.id === message.author.id,
            time: 120_000
        });

        buttonCollector.on('collect', async (i: Discord.ButtonInteraction) => {
            i.deferUpdate();		
            buttonCollector.stop();

            if (i.customId === 'start') {
                const contestRank: string = client.contest.getContestRankStr(activeKitten);
                const results = await client.contest.getContestResults(activeKitten);
                const place = results.findIndex(contestant => contestant == activeKitten) + 1;
                let prizeMoney = await client.contest.getPrizeAmount(activeKitten, place);                

                // Update values
                player.cooldowns.contest = getDateNow();
                player.money += prizeMoney;
                player.currency.totalContestIncome += prizeMoney;
                if (place == 1) {
                    player.statistics.contestsWon ++;
                    activeKitten.medals.gold += 1;                    
                }
                else if (place == 2) activeKitten.medals.silver += 1;
                else if (place == 3) activeKitten.medals.bronze += 1;

                await client.quests.updateQuestProgress(player, client.database, [QuestID.contest]);
                if (await client.database.updatePlayer(player)) {				
                    // Send message to inform the user                    
                    const resultEmbed = this.createContestResultEmbed(client, activeKitten, contestRank, results, place, prizeMoney);
                    botMessage.edit({ embeds: [resultEmbed], components: [] });
                }				
                else {
                    notifications.SendErrorMsg(message, notifications.ErrorMessages.DBConnectionFailed);
                }
            }            
        });
        
        buttonCollector.on('end', () => {	
            // botMessage.edit({ components: [] });
        });

    }

    private createContestEmbed(client: ManiClient, cat: IPlayerCat): DefaultEmbed {
        let contestEmbed: DefaultEmbed = new HelpEmbed(client, `Kitten Contest`)
            .setTitle("I'm your host Sukrati,")
            .setThumbnail(imageURLs.avatar_contesthost);

        let embedDescription = 

            `Welcome to our${client.contest.getContestRankStr(cat)}rank contest!\n\n` +
            `People from all over the world join us with their most prestigious kittens to compete.\n\n` +
            `You'll have to reach **🥇 1st place** to advance to a higher rank contest.\n\n` +

            `You're about to enter with:\n\n` +
            `${cat.data?.icon.left} **${cat.name}** 🥇${cat.medals.gold} 🥈${cat.medals.silver} 🥉${cat.medals.bronze}\n` +
            `- **🤍 ${getRank(cat.stats.beauty)} 💗${getRank(cat.stats.cuteness)} 🩰${getRank(cat.stats.posture)}❣️${getRank(cat.stats.tricks)}**\n` +

            `\n`;
        
        contestEmbed.setDescription(embedDescription);
        
        return contestEmbed;
    }   
    
    private createContestResultEmbed(client: ManiClient, cat: IPlayerCat, contestRank: string, result: IPlayerCat[], place: number, prizeMoney: number): DefaultEmbed {
        let contestEmbed: DefaultEmbed = new HelpEmbed(client, `Kitten Contest`)
            .setTitle("Sukrati💬")
            .setThumbnail(imageURLs.avatar_contesthost);

        if (result.length < 8) return contestEmbed;
        
        let placeStr: string;
        if (place == 1) placeStr = `🥇1st`
        else if (place == 2) placeStr = `🥈2nd`
        else if (place == 3) placeStr = `🥉3rd`
        else placeStr = `${place}th`;

        let embedDescription = 
            `I'm back with your long awaited results for the${contestRank}rank contest!\n\n` +
            
            `${result[0].data?.icon.forward} **${result[0].name}** 🥇1st place\n` +
            `${result[1].data?.icon.forward} **${result[1].name}** 🥈2nd place\n` +
            `${result[2].data?.icon.forward} **${result[2].name}** 🥉3rd place\n` +
            `${result[3].data?.icon.forward} **${result[3].name}** 4th place\n` +
            `${result[4].data?.icon.forward} **${result[4].name}** 5th place\n` +
            `${result[5].data?.icon.forward} **${result[5].name}** 6th place\n` +
            `${result[6].data?.icon.forward} **${result[6].name}** 7th place\n` +
            `${result[7].data?.icon.forward} **${result[7].name}** 8th place\n\n` +

            `You ended up in **${placeStr} place** and won **${getGoldStr(prizeMoney)}**\n` +

            `\n`;
        
        if (place == 1) {
            embedDescription += `You now advance to**${client.contest.getContestRankStr(cat)}rank**`;
        }
        
        contestEmbed.setDescription(embedDescription);
        
        return contestEmbed;
    }        
    
}