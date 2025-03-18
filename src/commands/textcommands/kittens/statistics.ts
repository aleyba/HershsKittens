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

export default class StatisticsCommand extends ManiCommand {    
	public constructor(){
		super(["statistics", "stats"], config.commandGroups.Owner);

        this.cooldown = 15_000;
        this.unlockable = true;
		this.description = "Shows the player's statistics";
        /*{
			content: 
            arguments: [
                "`<@Mention> (User)`: A user tag **(optional)**",
			    "`-list`: Shows the user's profile in a list format **(optional)**",
    			"`-simple`: Shows the user's profile in a simple format **(optional)**"
            ],
			examples: [
                "`mani profile`: Shows your user profile",
                "`mani profile -list`: Shows your user profile in a list format",
                "`mani profile @User`: Shows the mentioned user's profile",
                "`mani profile @User -simple`: Shows the mentioned user's profile in a simple format"
            ]
		}*/
	}

	public async runCommand(options: { client: ManiClient, message: Discord.Message, player: IPlayerDocument, args: string[] }): Promise<void> {
        const { client, message, player, args } = options;

        // Check if the channel is a TextChannel
		if (message.channel.type !== Discord.ChannelType.GuildText) return;        

		// Get the mentioned user
		let mentionedUser: Discord.User | undefined = inputUtils.CheckMentionedUser(message, args[0]);	
        if (mentionedUser) args.shift();

		// Get the user's data from the database
        let discordUser = mentionedUser ? mentionedUser : message.author;
        let playerData: IPlayerDocument | null = player;        
        if (mentionedUser && mentionedUser !== message.author) playerData = await client.database.addOrGetUser(mentionedUser.id, mentionedUser.username);
		if (!playerData) { notifications.SendErrorMsg(message, notifications.ErrorMessages.PlayerNotFound); return; }
		
        // Create an embed to show the user's statistics
        const profileEmbed: DefaultEmbed = await getProfileEmbed(client, discordUser, playerData);
        const statisticsEmbed: DefaultEmbed = getStatisticsEmbed(discordUser, playerData);        

        const profileButton = new Discord.ButtonBuilder()
            .setCustomId('profile')
            .setLabel(`Profile`)
            // .setEmoji(`👤`)
            .setStyle(Discord.ButtonStyle.Primary);
        
        const statisticsButton = new Discord.ButtonBuilder()
            .setCustomId('statistics')
            .setLabel(`Statistics`)
            .setEmoji(`📊`)
            .setStyle(Discord.ButtonStyle.Secondary);

        const buttonRow = new Discord.ActionRowBuilder<Discord.ButtonBuilder>()
            .addComponents(profileButton, statisticsButton);  

        // Send the embeded profile
        const botMessage = await message.channel.send({ embeds: [statisticsEmbed], components: [buttonRow] });

		let buttonCollector = botMessage.createMessageComponentCollector({
			componentType: Discord.ComponentType.Button,
			filter: (i) => i.user.id === message.author.id,
			time: 60_000
		});

		buttonCollector.on('collect', async (i: Discord.ButtonInteraction) => {
            i.deferUpdate();			

			if (i.customId === 'profile') {
                botMessage.edit({ embeds: [profileEmbed] });
			}
			else if (i.customId === 'statistics') {
                botMessage.edit({ embeds: [statisticsEmbed] });
			}
		});

		buttonCollector.on('end', () => {
            botMessage.edit({ components: [] })
        });  
	}    
	
}

export function getStatisticsEmbed(author: Discord.User, player: IPlayerDocument) {
    const statisticsEmbed: DefaultEmbed = new DefaultEmbed(author)
        // .setTitle(`📊 Statistics`)          
        .setAuthor({ name: author.username + '\'s statistics', iconURL: author.displayAvatarURL() })
        .setThumbnail(author.displayAvatarURL());

    let embedDescription = 
        `⏱️ **Dailies Collected**: ${player.statistics.dailiesCollected}\n` +
        `🔥 **Highest Daily Streak**: ${player.daily.dailyStreakMax}\n` + 
        `🎖️ **Reputation Given**: ${player.statistics.reputationGiven}\n` + 
        `\n` +
        `🎀 **Contests Won**: ${player.statistics.contestsWon}\n` + 
        `📜 **Quests Completed**: ${player.statistics.questsCompleted}\n` + 
        `🏆 **Achievements Reached**: ${player.statistics.achievementsUnlocked}\n` + 
        `\n` +
        `💗 **Play Commands**: ${player.statistics.playCommandsUsed}\n` +
        `🐾 **Train Commands**: ${player.statistics.trainCommandsUsed}\n` +
        `📸 **Photo Commands**: ${player.statistics.photoshootCommandsUsed}\n` +
        `💅 **Salon Commands**: ${player.statistics.salonCommandsUsed}\n` + // 💄
        `🎲 **Gambling Commands**: ${player.statistics.gamblingCommandsUsed}\n` +
        ``;

    statisticsEmbed.setDescription(embedDescription);

    return statisticsEmbed;
}