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
import { itemData } from "../../../database/data/itemData";
import { QuestID } from "../../../database/data/questData";
import { getDateNow, getNumToTimeStr, getSecondsBetweenDates } from "../../../helpers/dateUtils";

export default class PhotoshootCommand extends ManiCommand {
    public constructor(){
        super(["photoshoot", "photo", "shoot", "model", "pose"], config.commandGroups.Kittens);

        // this.cooldown = 30_000;
        this.unlockable = true;
        this.description = 'Join a photoshoot with your kitten to make some money';

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

        // Check if kitten has energy to model
        if (activeKitten.energy == 0) {
            message.channel.send({ content: `${activeKitten.data?.icon.back}` });
            message.channel.send(`**${activeKitten.name}** has no energy to do a photoshoot...`);
            return;
        }  

        // Check if kitten's full enough to model
        if (activeKitten.hunger == 0) {
            message.channel.send({ content: `${activeKitten.data?.icon.back}` });
            message.channel.send(`**${activeKitten.name}** is starving...`);
            return;
        }         

        // Check if kitten's happy to model
        if (activeKitten.happiness == 0) {
            message.channel.send({ content: `${activeKitten.data?.icon.back}` });
            message.channel.send(`**${activeKitten.name}** doesn't feel like doing a photoshoot...`);
            return;
        }  
        
        // Check cooldown
        const secondsSinceLastContest = getSecondsBetweenDates(getDateNow(), player.cooldowns.photoshoot);
        if (secondsSinceLastContest < this.cooldownInSeconds) {
            const infoMsg = `you recently did a photoshoot. Please wait **${getNumToTimeStr(this.cooldownInSeconds - secondsSinceLastContest)}** to do another one.`;
            notifications.SendInfoMsg(message, notifications.InfoMessages.Custom, infoMsg);
            return;
        }   
        player.cooldowns.photoshoot = getDateNow();        

        // Update the values
        const salary = getCostForRank(activeKitten.stats.posture);
        player.money += salary; 
        player.currency.totalPhotoshootIncome += salary;
        player.statistics.photoshootCommandsUsed ++;
        const exp = performTraining(activeKitten, CatStats.posture);
        let bonusExp = 0;
        let expString = `+${exp}${iconData.xp}`;
        const toyItem = await player.fetchItem('posturetoy', client.database);
        if (toyItem) {
            bonusExp = Math.round(exp * 0.25);  
            activeKitten.stats.posture += bonusExp;
            // expString += `${toyItem.data?.icon} +${bonusExp}${iconData.xp}`;
            expString = `+${exp+bonusExp}${iconData.xp}${toyItem.data?.icon}`;
        }
        player.increaseExp(exp);
        await client.quests.updateQuestProgress(player, client.database, [QuestID.photoshoot]);
        if (await client.database.updatePlayer(player)) {				
            // Send message to inform the user
            message.channel.send({ content: `${activeKitten.data?.icon.forward}` });
            message.channel.send(
                `**🩰 Posture**${getRank(activeKitten.stats.posture)}\n` +
                `${getBar(getStatExp(activeKitten.stats.posture), getStatExpNext(activeKitten.stats.posture))} **${expString}**\n` +
                `**${activeKitten.name}** is feeling ${getEmotion(activeKitten)}!\n` +
                `**${message.author.username}**, you earned **${getGoldStr(salary)}** from your kitten's photoshoot.`
            );
            // message.channel.send(`**${activeKitten.name}** is feeling ${getEmotion(activeKitten)}!`);
            // message.channel.send(`**${message.author.username}**, you earned **${getGoldStr(salary)}** from your kitten's photoshoot.`);
            
            // botMessage.delete();
        }				
        else {
            notifications.SendErrorMsg(message, notifications.ErrorMessages.DBConnectionFailed);
        }


    }
    
}