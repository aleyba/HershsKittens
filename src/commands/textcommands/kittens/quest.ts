import * as Discord from "discord.js";
import * as notifications from "../../../helpers/notifications";
import * as dateUtils from "../../../helpers/dateUtils";
import { DefaultEmbed, HelpEmbed } from "../../../core/baseclasses";
import config from "../../../config";
import ManiCommand, { IBotCommandArgumentType, IBotCommandRunOptions } from "../../../core/command";
import { getGoldStr } from "../../../helpers/utils";
import { IPlayerDocument } from "../../../database/model/playerModel";
import ManiClient from "../../../core/client";
import { iconData } from "../../../database/data/imageData";

export default class QuestCommand extends ManiCommand {
    public constructor(){
        super(["quest", "quests", "task", "tasks"], config.commandGroups.Owner);
        
        this.cooldown = 15_000;
        this.description = 'Complete daily quests for a reward';
    }

    public async runCommand(options: { client: ManiClient, message: Discord.Message, player: IPlayerDocument, args: string[] }): Promise<void> {
        const { client, message, player, args } = options;

        if (message) {
            // Check if the channel is a TextChannel
            if (message.channel.type !== Discord.ChannelType.GuildText) return;         
                    
            const dailyQuests = await client.quests.startOrGetDailyQuest(player, client.database);

            const questEmbed: DefaultEmbed = new DefaultEmbed(message.author)
                .setAuthor({ name: message.author.username + '\'s quests', iconURL: message.author.displayAvatarURL() })
                .setTitle('📜 Daily Quest');                

            let questDescription = '';

            for (let i = 0; i < dailyQuests.length; i ++) {
                questDescription += `> **${dailyQuests[i].description}**\n> Progress: \`${player.quest.progress[i]} / ${dailyQuests[i].target}\`\n`;
            }

            if (player.quest.questRewardedOn < player.quest.questStartedOn) {
                questDescription += 'Reward: 🎁🎁🎁';
            }
            else {
                // Get the cooldown time for the next day		
                const dateTomorrowMidnight: Date = dateUtils.getDateAtMidnight(dateUtils.getDateAddDays(dateUtils.getDateNow(), 1));
                const secondsTillNextDaily: number = dateUtils.getSecondsBetweenDates(dateTomorrowMidnight, dateUtils.getDateNow());   

                questDescription += 'Reward: 🎉🎉🎉';
                questEmbed.setFooter({ text: `Quest reward claimed! next quest in ${dateUtils.getNumToTimeStr(secondsTillNextDaily)}` });
            }            

            questEmbed.setDescription(questDescription);            

            const claimButton = new Discord.ButtonBuilder()
                .setCustomId('claim')
                .setLabel(`Claim Reward`)
                // .setEmoji(`🎉`)
                .setStyle(Discord.ButtonStyle.Success);               
            const claimButtonRow = new Discord.ActionRowBuilder<Discord.ButtonBuilder>()
                .addComponents(claimButton);  

            if (!await client.quests.questCompleted(player)) {
                message.channel.send({ embeds: [questEmbed] });
            }
            else {
                const botMessage = await message.channel.send({ embeds: [questEmbed], components: [claimButtonRow] });

                let buttonCollector = botMessage.createMessageComponentCollector({
                    componentType: Discord.ComponentType.Button,
                    filter: (i) => i.user.id === message.author.id,
                    time: 120_000
                });  

                buttonCollector.on('collect', async (i: Discord.ButtonInteraction) => {
                    i.deferUpdate();		

                    if (i.customId === 'claim') {
                        buttonCollector.stop();

                        const questMoney = 500;
                        const questExp = 200; //Math.round(Math.random() * 100) + 150;
                        const rewardEmbed: DefaultEmbed = new DefaultEmbed(message.author)
                            .setAuthor(null)
                            .setTitle('🎉 Daily Quest Reward 🎉')
                            .setDescription(
                                `1. **You received:**\n  - ${getGoldStr(questMoney, false)}\n` +
                                `2. **All your kittens gain:**\n` +
                                `  - Beauty +${questExp}${iconData.xp}\n` +
                                `  - Cuteness +${questExp}${iconData.xp}\n` +
                                `  - Posture +${questExp}${iconData.xp}\n` +
                                `  - Tricks +${questExp}${iconData.xp}\n` +
                                `3. **All your kittens regain:**\n  - Full Happiness, Hunger and Energy`
                            );

                        player.money += questMoney;
                        player.currency.totalQuestIncome += questMoney;
                        player.statistics.questsCompleted ++;   
                        player.quest.questRewardedOn = dateUtils.getDateNow();                     
                        for (let i = 0; i < player.cats.length; i++) {
                            player.cats[i].happiness = 100;
                            player.cats[i].hunger = 100;
                            player.cats[i].energy = 100;
                            player.cats[i].stats.beauty += questExp;
                            player.cats[i].stats.cuteness += questExp;
                            player.cats[i].stats.posture += questExp;
                            player.cats[i].stats.tricks += questExp;
                        }

                        botMessage.channel.send({ embeds: [rewardEmbed] });
                        if (await client.database.updatePlayer(player)) {                            
                        }
                        else {
                            notifications.SendErrorMsg(message, notifications.ErrorMessages.DBConnectionFailed);
                        }                        
                    }
                });
                
                buttonCollector.on('end', () => {
                    botMessage.edit({ components: [] });
                }); 

            }



        }
    }
    
}