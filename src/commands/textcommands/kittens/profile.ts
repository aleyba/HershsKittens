import * as Discord from "discord.js";
import * as utils from "../../../helpers/utils";
import * as inputUtils from "../../../helpers/inputUtils";
import * as notifications from "../../../helpers/notifications";
import { IPlayerDocument } from "../../../database/model/playerModel";
import { DefaultEmbed } from "../../../core/baseclasses";
import ManiClient from "../../../core/client";
import config from "../../../config";
import ManiCommand from "../../../core/command";
import { getStatisticsEmbed } from "./statistics";
import chalk = require("chalk");
import { getCatScore } from "../../../database/model/catModel";

export default class ProfileCommand extends ManiCommand {    
	public constructor(){
		super(["profile", "pf"], config.commandGroups.Owner);

        this.cooldown = 15_000;
        this.unlockable = true;
		this.description = "Shows the player's profile";
        /*{
			content: 
            arguments: [
                "`<@Mention> (User)`: A user tag **(optional)**",
            ],
			examples: [
                "`mani profile`: Shows your user profile",
                "`mani profile @User`: Shows the mentioned user's profile",
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

        // Fetch required data from the database
        await playerData.fetchCatData(client.database);        
		
        // Create an embed to show the user's profile
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
        const botMessage = await message.channel.send({ embeds: [profileEmbed], components: [buttonRow] });

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

export async function getProfileEmbed(client: ManiClient, author: Discord.User, player: IPlayerDocument) {
    const profileEmbed: DefaultEmbed = new DefaultEmbed(author)
        // .setTitle(`${player.title}`)          
        .setAuthor({ name: author.username + '\'s profile', iconURL: author.displayAvatarURL() })
        .setThumbnail(author.displayAvatarURL());
    
    // Check if player is married already
    let marriedInfo = '';
    if (player.marry.marriedOn && player.marry.marriedTo) {
        await client.users.fetch(player.marry.marriedTo).then(marriedUser => {
            marriedInfo = `💍 **Married to ${marriedUser.username}**\n`;
        }).catch(err => {
            console.log(chalk.red(`[Command: profile] ${err}`));
        });				
    }    

    let embedDescription = 
        `🎀 **Level ${player.level}**\n` + 
        `🎖️ **${player.reputation} Reputation**\n` +
        marriedInfo +                   
        `**${utils.getGoldStrShort(player.money)}**\n` +       
        `\n**Top Kittens**\n`; //🐾
        
    // player.fetchCatData();
    player.cats.sort((catA, catB) => {
        let compare = getCatScore(catB) - getCatScore(catA);
        if (compare == 0) compare = catB.stats.genetics.value - catA.stats.genetics.value;
        if (compare == 0) compare = 1;
        return compare;
    });

    for (let i = 0; i < Math.min(3, player.cats.length); i++) {
        let cat = player.cats[i];
        embedDescription += `${cat.data?.icon.left} **${cat.name}** 🥇${cat.medals.gold} 🥈${cat.medals.silver} 🥉${cat.medals.bronze}\n`;            
    }

    profileEmbed.setDescription(embedDescription);	

    return profileEmbed;
}