import * as Discord from "discord.js";
import * as notifications from "../../../helpers/notifications";
import { IPlayerDocument, IPlayerCat } from "../../../database/model/playerModel";
import { DefaultEmbed } from "../../../core/baseclasses";
import ManiClient from "../../../core/client";
import config from "../../../config";
import ManiCommand from "../../../core/command";
import { iconData, imageURLs } from "../../../database/data/imageData";
import { CatStats, getBar, getEmotion, getRank, getStatExp, getStatExpNext, ICatDocument, performTraining } from "../../../database/model/catModel";
import { QuestID } from "../../../database/data/questData";
import { getDateNow, getNumToTimeStr, getSecondsBetweenDates } from "../../../helpers/dateUtils";

export default class TrainCommand extends ManiCommand {
    public constructor(){
        super(["train", "trick", "tricks"], config.commandGroups.Kittens);

        // this.cooldown = 30_000;
        this.unlockable = true;
        this.description = 'Train your kitten to do tricks';

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

        // Check if kitten has energy to train
        if (activeKitten.energy == 0) {
            message.channel.send({ content: `${activeKitten.data?.icon.back}` });
            message.channel.send(`**${activeKitten.name}** has no energy to train...`);
            return;
        }  

        // Check if kitten's full enough to train
        if (activeKitten.hunger == 0) {
            message.channel.send({ content: `${activeKitten.data?.icon.back}` });
            message.channel.send(`**${activeKitten.name}** is starving...`);
            return;
        }         

        // Check if kitten's happy to train
        if (activeKitten.happiness == 0) {
            message.channel.send({ content: `${activeKitten.data?.icon.back}` });
            message.channel.send(`**${activeKitten.name}** is bored of training...`);
            return;
        }  
        
        // Check cooldown
        const secondsSinceLastContest = getSecondsBetweenDates(getDateNow(), player.cooldowns.train);
        if (secondsSinceLastContest < this.cooldownInSeconds) {
            const infoMsg = `you recently trained. Please wait **${getNumToTimeStr(this.cooldownInSeconds - secondsSinceLastContest)}** to train again.`;
            notifications.SendInfoMsg(message, notifications.InfoMessages.Custom, infoMsg);
            return;
        }    
        player.cooldowns.train = getDateNow();      

        // Update the values
        player.statistics.trainCommandsUsed ++;
        const exp = performTraining(activeKitten, CatStats.tricks);
        let bonusExp = 0;
        let expString = `+${exp}${iconData.xp}`;
        const toyItem = await player.fetchItem('trickstoy', client.database);
        if (toyItem) {
            bonusExp = Math.round(exp * 0.25); 
            activeKitten.stats.tricks += bonusExp;           
            // expString += `${toyItem.data?.icon} +${bonusExp}${iconData.xp}`;
            expString = `+${exp+bonusExp}${iconData.xp}${toyItem.data?.icon}`;
        }
        player.increaseExp(exp);
        await client.quests.updateQuestProgress(player, client.database, [QuestID.train]);
        if (await client.database.updatePlayer(player)) {				
            // Send message to inform the user
            message.channel.send({ content: `${activeKitten.data?.icon.forward}` });
            message.channel.send(
                `**❣️ Tricks**${getRank(activeKitten.stats.tricks)}\n` +
                `${getBar(getStatExp(activeKitten.stats.tricks), getStatExpNext(activeKitten.stats.tricks))} **${expString}**\n` +
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