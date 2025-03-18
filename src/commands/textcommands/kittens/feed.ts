import * as Discord from "discord.js";
import * as notifications from "../../../helpers/notifications";
import { IPlayerDocument, IPlayerCat } from "../../../database/model/playerModel";
import { DefaultEmbed } from "../../../core/baseclasses";
import ManiClient from "../../../core/client";
import config from "../../../config";
import ManiCommand from "../../../core/command";
import { iconData, imageURLs } from "../../../database/data/imageData";
import { CatActions, getBar, getEmotion, getRank, ICatDocument, performAction } from "../../../database/model/catModel";

export default class FeedCommand extends ManiCommand {
    public constructor(){
        super(["feed", "food"], config.commandGroups.Kittens);

        this.cooldown = 5_000;
        this.unlockable = true;
        this.description = 'Feed your kitten';

    }

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

        // Check if kitten is full
        if (activeKitten.hunger == 100) {
            message.channel.send({ content: `${activeKitten.data?.icon.back}` });
            message.channel.send(`**${activeKitten.name}** is full!`);
            return;
        }           

        // Check if player has food
        await player.fetchInventoryData(client.database);
        const foodItemIndex = player.inventory.findIndex(item => item._id == 'food');
        if (foodItemIndex < 0) {
            notifications.SendErrorMsg(message, notifications.ErrorMessages.Custom, `you have no food...`);
            return;
        }             

        // Update the values
        const foodCount = player.inventory[foodItemIndex].quantity;               
        performAction(activeKitten, CatActions.feed);         
        let foodItem = await player.takeItemFromInventory(foodItemIndex, 1);
        if (await client.database.updatePlayer(player)) {				
            // Send message to inform the user
            message.channel.send({ content: `${activeKitten.data?.icon.forward}` }); // 🐟
            // message.channel.send(`**Hunger**\n${getBar(activeKitten.hunger)}\nYou fed **${activeKitten.name}** ${foodItem.data?.icon} *You have ${foodCount - 1} food left...*`);
            // message.channel.send(`**${activeKitten.name}** is feeling ${getEmotion(activeKitten)}!`);
            message.channel.send(
                `**Hunger**\n${getBar(activeKitten.hunger)}\n` +
                `You fed **${activeKitten.name}** ${foodItem.data?.icon} *You have ${foodCount - 1} food left...*\n` +
                `**${activeKitten.name}** is feeling ${getEmotion(activeKitten)}!`
            );
        }				
        else {
            notifications.SendErrorMsg(message, notifications.ErrorMessages.DBConnectionFailed);
        }

    }
    
}