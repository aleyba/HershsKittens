import * as Discord from "discord.js";
import * as notifications from "../../../helpers/notifications";
import { HelpEmbed } from "../../../core/baseclasses";
import config from "../../../config";
import ManiCommand, { IBotCommandArgumentType, IBotCommandRunOptions } from "../../../core/command";
import { getGoldStr } from "../../../helpers/utils";
import { IPlayerCat, IPlayerDocument } from "../../../database/model/playerModel";
import ManiClient from "../../../core/client";

export default class RenameCommand extends ManiCommand {
    public constructor(){
        super(["rename", "nickname"], config.commandGroups.Kittens);
        
        this.cooldown = 5_000;
        this.unlockable = true;
        this.description = 'Change the nickname of your active kitten';
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

        // Fetch required data from the database
        await player.fetchCatData(client.database);

        // get active cat
        let activeKitten: IPlayerCat | undefined = player.cats.find(cat => cat.active);
        if (!activeKitten) activeKitten = player.cats[0];
        
        // get the new name
        if (args.length < 1) {
            notifications.SendInfoMsg(message, notifications.InfoMessages.Custom, `put the new nickname in your command: \`h rename <nickname>\``);
            return;
        }
        let nickname = args[0];
        
        if (player.cats.find(cat => cat.name == nickname)) {
            for (let num = 2; num < 99; num ++) {
                if (!player.cats.find(cat => cat.name == `${nickname}${num}`)) {
                    nickname = `${nickname}${num}`;
                    break;
                }
            }
        }
        const prevName = activeKitten.name;
        activeKitten.name = nickname;

        if (await client.database.updatePlayer(player)) {				
            // Send message to inform the user
            notifications.SendInfoMsg(message, notifications.InfoMessages.Custom, `you've changed **${prevName}**'s nickname to **${nickname}**!`);
        }				
        else {
            notifications.SendErrorMsg(message, notifications.ErrorMessages.DBConnectionFailed);
        }                

    }
    
}