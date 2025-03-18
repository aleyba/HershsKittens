import * as Discord from "discord.js";
import * as notifications from "../../../helpers/notifications";
import { HelpEmbed } from "../../../core/baseclasses";
import config from "../../../config";
import ManiCommand, { IBotCommandArgumentType, IBotCommandRunOptions } from "../../../core/command";
import { getGoldStr } from "../../../helpers/utils";
import { IPlayerDocument } from "../../../database/model/playerModel";
import ManiClient from "../../../core/client";

export default class MoneyCommand extends ManiCommand {
    public constructor(){
        super(["money", "cash", "bal", "balance"], config.commandGroups.Items);
        
        this.cooldown = 15_000;
        this.description = 'Check how much money you own';
    }

    public async runCommand(options: { client: ManiClient, message: Discord.Message, player: IPlayerDocument, args: string[] }): Promise<void> {
        const { client, message, player, args } = options;

        if (message) {
            // Check if the channel is a TextChannel
            if (message.channel.type !== Discord.ChannelType.GuildText) return;
            		
            notifications.SendInfoMsg(message, notifications.InfoMessages.Custom, `you have **${getGoldStr(player.money, false)}**`);
        }
    }
    
}