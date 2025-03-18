import * as Discord from "discord.js";
import * as notifications from "../../../helpers/notifications";
import { IPlayerDocument, IPlayerCat } from "../../../database/model/playerModel";
import { DefaultEmbed } from "../../../core/baseclasses";
import ManiClient from "../../../core/client";
import config from "../../../config";
import ManiCommand from "../../../core/command";
import { iconData, imageURLs } from "../../../database/data/imageData";
import { CatActions, CatStats, getBar, getEmotion, getRank, getStatExp, getStatExpNext, ICatDocument, performAction, performTraining } from "../../../database/model/catModel";
import { QuestID } from "../../../database/data/questData";
import { getDateNow, getNumToTimeStr, getSecondsBetweenDates } from "../../../helpers/dateUtils";

export default class PlayCommand extends ManiCommand {
    public constructor(){
        super(["play", "cute"], config.commandGroups.Kittens);

        // this.cooldown = 30_000;
        this.unlockable = true;
        this.description = 'Play with your kitten';

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

        // Check if kitten has energy to play
        if (activeKitten.energy == 0) {
            message.channel.send({ content: `${activeKitten.data?.icon.back}` });
            message.channel.send(`**${activeKitten.name}** has no energy to play...`);
            return;
        }  

        // Check if kitten's full enough to play
        if (activeKitten.hunger == 0) {
            message.channel.send({ content: `${activeKitten.data?.icon.back}` });
            message.channel.send(`**${activeKitten.name}** is starving...`);
            return;
        }   

        // Check if kitten's happiness is full
        // if (activeKitten.happiness == 100) {
        //     message.channel.send({ content: `${activeKitten.data?.icon.back}` });
        //     message.channel.send(`**${activeKitten.name}** does not feel like playing...`);
        //     return;
        // }                       

        // Check cooldown
        const secondsSinceLastContest = getSecondsBetweenDates(getDateNow(), player.cooldowns.play);
        if (secondsSinceLastContest < this.cooldownInSeconds) {
            const infoMsg = `you recently played. Please wait **${getNumToTimeStr(this.cooldownInSeconds - secondsSinceLastContest)}** to play again.`;
            notifications.SendInfoMsg(message, notifications.InfoMessages.Custom, infoMsg);
            return;
        }     
        player.cooldowns.play = getDateNow();   

        // Update the values
        player.statistics.playCommandsUsed ++;
        const exp = performTraining(activeKitten, CatStats.cuteness);
        let bonusExp = 0;
        let expString = `+${exp}${iconData.xp}`;
        const toyItem = await player.fetchItem('cutenesstoy', client.database);
        if (toyItem) {
            bonusExp = Math.round(exp * 0.25);   
            activeKitten.stats.cuteness += bonusExp;         
            // expString += `${toyItem.data?.icon} +${bonusExp}${iconData.xp}`;
            expString = `+${exp+bonusExp}${iconData.xp}${toyItem.data?.icon}`;
        }
        player.increaseExp(exp);
        await client.quests.updateQuestProgress(player, client.database, [QuestID.play]);
        if (await client.database.updatePlayer(player)) {				
            // Send message to inform the user
            message.channel.send({ content: `${activeKitten.data?.icon.forward}` });
            message.channel.send(
                `**💗 Cuteness**${getRank(activeKitten.stats.cuteness)}\n` +
                `${getBar(getStatExp(activeKitten.stats.cuteness), getStatExpNext(activeKitten.stats.cuteness))} **${expString}**\n` +
                `**${activeKitten.name}** is feeling ${getEmotion(activeKitten)}!`
            );
            // message.channel.send(`**${activeKitten.name}** is feeling ${getEmotion(activeKitten)}!`);
            
            // botMessage.delete();
        }				
        else {
            notifications.SendErrorMsg(message, notifications.ErrorMessages.DBConnectionFailed);
        }

    }
    
}