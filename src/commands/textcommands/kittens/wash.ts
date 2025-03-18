import * as Discord from "discord.js";
import * as notifications from "../../../helpers/notifications";
import { IPlayerDocument, IPlayerCat } from "../../../database/model/playerModel";
import { DefaultEmbed } from "../../../core/baseclasses";
import ManiClient from "../../../core/client";
import config from "../../../config";
import ManiCommand from "../../../core/command";
import { iconData, imageURLs } from "../../../database/data/imageData";
import { CatActions, getBar, getEmotion, getRank, ICatDocument, performAction } from "../../../database/model/catModel";

export default class WashCommand extends ManiCommand {
    public constructor(){
        super(["wash", "clean"], config.commandGroups.Kittens);

        this.cooldown = 5_000;
        this.unlockable = true;
        this.description = 'Wash your kitten';

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

        // Check if kitten is fully clean
        if (activeKitten.energy == 100) {
            message.channel.send({ content: `${activeKitten.data?.icon.back}` });
            message.channel.send(`**${activeKitten.name}** doesn't need to be washed...`);
            return;
        }           

        // Check if player has food
        await player.fetchInventoryData(client.database);
        const soapItemIndex = player.inventory.findIndex(item => item._id == 'soap');
        if (soapItemIndex < 0) {
            notifications.SendErrorMsg(message, notifications.ErrorMessages.Custom, `you have no soap...`);
            return;
        }             

        // Update the values
        const soapCount = player.inventory[soapItemIndex].quantity;     
        performAction(activeKitten, CatActions.wash);           
        let soapItem = await player.takeItemFromInventory(soapItemIndex, 1);
        if (await client.database.updatePlayer(player)) {				
            // Send message to inform the user
            message.channel.send({ content: `${activeKitten.data?.icon.forward}` }); // ⚡
            // message.channel.send(`**Energy**\n${getBar(activeKitten.hunger)}\nYou washed **${activeKitten.name}** ${soapItem.data?.icon} *You have ${soapCount - 1} soap left...*`);
            // message.channel.send(`**${activeKitten.name}** is feeling ${getEmotion(activeKitten)}!`);
            message.channel.send(
                `**Energy**\n${getBar(activeKitten.hunger)}\n` +
                `You washed **${activeKitten.name}** ${soapItem.data?.icon} *You have ${soapCount - 1} soap left...*\n` +
                `**${activeKitten.name}** is feeling ${getEmotion(activeKitten)}!`
            );
        }				
        else {
            notifications.SendErrorMsg(message, notifications.ErrorMessages.DBConnectionFailed);
        }

    }
    
}