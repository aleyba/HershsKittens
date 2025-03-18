import * as Discord from "discord.js";
import * as notifications from "../../../helpers/notifications";
import { IPlayerDocument, IPlayerCat } from "../../../database/model/playerModel";
import { DefaultEmbed } from "../../../core/baseclasses";
import ManiClient from "../../../core/client";
import config from "../../../config";
import ManiCommand from "../../../core/command";
import { iconData, imageURLs } from "../../../database/data/imageData";
import { CatStats, getBar, getCostForRank, getEmotion, getRank, getStatExp, getStatExpNext, ICatDocument, performTraining } from "../../../database/model/catModel";
import { getGoldStr } from "../../../helpers/utils";
import { QuestID } from "../../../database/data/questData";
import { getDateNow, getNumToTimeStr, getSecondsBetweenDates } from "../../../helpers/dateUtils";

export default class SalonCommand extends ManiCommand {
    public constructor(){
        super(["salon", "spa", "beauty"], config.commandGroups.Kittens);

        // this.cooldown = 30_000;
        this.unlockable = true;
        this.description = 'Go to the salon with your kitten';

    }

    private readonly cooldownInSeconds = 30;

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

        // Check if player has enough money
        const cost = getCostForRank(activeKitten.stats.beauty);
        if (player.money < cost) {
            notifications.SendInfoMsg(message, notifications.InfoMessages.NotEnoughMoney);
            return;
        }        

        // Check if kitten has energy to go out
        if (activeKitten.energy == 0) {
            message.channel.send({ content: `${activeKitten.data?.icon.back}` });
            message.channel.send(`**${activeKitten.name}** has no energy to go out...`);
            return;
        }  

        // Check if kitten's full enough to go out
        if (activeKitten.hunger == 0) {
            message.channel.send({ content: `${activeKitten.data?.icon.back}` });
            message.channel.send(`**${activeKitten.name}** is starving...`);
            return;
        }                       

        // Check cooldown
        const secondsSinceLastContest = getSecondsBetweenDates(getDateNow(), player.cooldowns.salon);
        if (secondsSinceLastContest < this.cooldownInSeconds) {
            const infoMsg = `you recently went to the salon. Please wait **${getNumToTimeStr(this.cooldownInSeconds - secondsSinceLastContest)}** to go again.`;
            notifications.SendInfoMsg(message, notifications.InfoMessages.Custom, infoMsg);
            return;
        }  
        player.cooldowns.salon = getDateNow();        

        // Update the values        
        player.money -= cost;        
        player.currency.totalSalonSpendings -= cost;
        player.statistics.salonCommandsUsed ++;
        const exp = performTraining(activeKitten, CatStats.beauty);        
        let bonusExp = 0;
        let expString = `+${exp}${iconData.xp}`;
        const toyItem = await player.fetchItem('beautytoy', client.database);
        if (toyItem) {
            bonusExp = Math.round(exp * 0.25);   
            activeKitten.stats.beauty += bonusExp;         
            // expString += `${toyItem.data?.icon} +${bonusExp}${iconData.xp}`;
            expString = `+${exp+bonusExp}${iconData.xp}${toyItem.data?.icon}`;
        }
        player.increaseExp(exp);
        await client.quests.updateQuestProgress(player, client.database, [QuestID.salon]);
        if (await client.database.updatePlayer(player)) {				
            // Send message to inform the user
            message.channel.send({ content: `${activeKitten.data?.icon.forward}` });
            message.channel.send(
                `**🤍 Beauty**${getRank(activeKitten.stats.beauty)}\n` +
                `${getBar(getStatExp(activeKitten.stats.beauty), getStatExpNext(activeKitten.stats.beauty))} **${expString}**\n` +
                `**${activeKitten.name}** is feeling ${getEmotion(activeKitten)}!\n` +
                `**${message.author.username}**, you spent **${getGoldStr(cost)}** on your kitten's beauty treatment at the salon.`
            );
            // message.channel.send(`**${activeKitten.name}** is feeling ${getEmotion(activeKitten)}!`);
            // message.channel.send(`**${message.author.username}**, you spent **${getGoldStr(cost)}** on your kitten's beauty treatment at the salon.`);
            
            // botMessage.delete();
        }				
        else {
            notifications.SendErrorMsg(message, notifications.ErrorMessages.DBConnectionFailed);
        }

    }
    
}