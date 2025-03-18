import * as Discord from "discord.js";
import * as utils from "../../../helpers/utils";
import * as inputUtils from "../../../helpers/inputUtils";
import * as notifications from "../../../helpers/notifications";
import { IPlayerDocument } from "../../../database/model/playerModel";
import { DefaultEmbed } from "../../../core/baseclasses";
import ManiClient from "../../../core/client";
import config from "../../../config";
import ManiCommand from "../../../core/command";
import { getProfileEmbed } from "./profile";

export default class IncomeCommand extends ManiCommand {    
    public constructor(){
        super(["income", "spendings"], config.commandGroups.Owner);

        this.cooldown = 15_000;
        this.unlockable = true;
        this.description = "Shows the player's income and spendings";
    }

    public async runCommand(options: { client: ManiClient, message: Discord.Message, player: IPlayerDocument, args: string[] }): Promise<void> {
        const { client, message, player, args } = options;

        // Check if the channel is a TextChannel
        if (message.channel.type !== Discord.ChannelType.GuildText) return;        
        
        // Create an embed to show the user's statistics
        const statisticsEmbed: DefaultEmbed = new DefaultEmbed(message.author)
            // .setTitle(`📊 Income`)          
            .setAuthor({ name: message.author.username + '\'s income', iconURL: message.author.displayAvatarURL() })
            .setThumbnail(message.author.displayAvatarURL());

        let embedDescription = 
            `Income\n` +
            `> 🔥 **Daily**: +${utils.getGoldStr(player.currency.totalDailyIncome, false)}\n` + 
            `> 📜 **Quests**: +${utils.getGoldStr(player.currency.totalQuestIncome, false)}\n` + 
            `> 🎀 **Contests**: +${utils.getGoldStr(player.currency.totalContestIncome, false)}\n` + 
            `> ⚤ **Kittensales**: +${utils.getGoldStr(player.currency.totalBreedingIncome, false)}\n` + //  ⚤ **Breeding**
            `> 📸 **Photoshoots**: +${utils.getGoldStr(player.currency.totalPhotoshootIncome, false)}\n` +             
            `> 📈 **Gambling**: +${utils.getGoldStr(player.currency.totalGamblingIncome, false)}\n` +         
            `Spendings\n` +        
            `> 🏪 **Adoption**: ${utils.getGoldStr(player.currency.totalAdoptionSpendings, false)}\n` +
            `> 👝 **Shop**: ${utils.getGoldStr(player.currency.totalShopSpendings, false)}\n` + // 👛
            `> 💅 **Salon**: ${utils.getGoldStr(player.currency.totalSalonSpendings, false)}\n` +         
            `> 📉 **Gambling**: ${utils.getGoldStr(player.currency.totalGamblingLosses, false)}\n` +         
            ``;

        statisticsEmbed.setDescription(embedDescription);      

        // Send the embeded profile
        message.channel.send({ embeds: [statisticsEmbed] });

    }    
    
}