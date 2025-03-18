import * as Discord from "discord.js";
import * as utils from "../../../helpers/utils";
import * as dateUtils from "../../../helpers/dateUtils";
import * as inputUtils from "../../../helpers/inputUtils";
import * as notifications from "../../../helpers/notifications";
import { IPlayerDocument } from "../../../database/model/playerModel";
import { DefaultEmbed, HelpEmbed } from "../../../core/baseclasses";
import ManiClient from "../../../core/client";
import config from "../../../config";
import ManiCommand from "../../../core/command";
import { imageURLs } from "../../../database/data/imageData";

export default class CallManiCommand extends ManiCommand {
    public constructor(){
        super(["mani"], config.commandGroups.Social);

        // this.unlockable = true;
        this.developer = true;
        this.description = 'Call Mani';

    }

    public async runCommand(options: { client: ManiClient, message: Discord.Message, player: IPlayerDocument, args: string[] }): Promise<void> {
        const { client, message, player, args } = options;

        // Check if the channel is a TextChannel
        if (message.channel.type !== Discord.ChannelType.GuildText) return;

        const messages: string[] = [
            "Hey cutie, here's a balloon 🎈",
            "Hey hot stuff, I got you a present 🎁",
            "Hey silly, look at your battery... 🪫 go charge your phone!",
            "Ohayoo, let's see Mt. Fuji together! 🗻💑",
            "Oh hey there! Here have a lollypop 🍭",
            "Hi sweetie, is it chocolate day yet? Here's some anyway 🍫",
            "Hi, I wrote you a poem:\n\n🌹 Roses are red\n🫐 Blueberries are blue\n🫶 I love you",
            "Babe did your flowers die? Here's fresh ones 💐",
            "Are you hungry? Lets have katsu curry 🍛",
            "Oh hey gorgeous! Did you know you are gorgeous? 😘",
            "Has someone told you you look beautiful today? Because you do! 😍",
            "You and me, belong, together...",
            "Can I go where you go?\nCan we always be this close?\nForever and ever 💖",
        ]

        const maniEmbed: DefaultEmbed = new HelpEmbed(client, `HershsKittens`)            
            .setAuthor(null)
            .setTitle("Mani💬")  
            .setDescription(messages[Math.floor(Math.random() * messages.length)])   
            .setThumbnail(imageURLs.avatar_mani);

        message.channel.send({ embeds: [maniEmbed] });
    }
    
}