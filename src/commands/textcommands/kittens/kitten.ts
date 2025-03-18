import * as Discord from "discord.js";
import * as notifications from "../../../helpers/notifications";
import { IPlayerDocument, IPlayerCat } from "../../../database/model/playerModel";
import { DefaultEmbed } from "../../../core/baseclasses";
import ManiClient from "../../../core/client";
import config from "../../../config";
import ManiCommand from "../../../core/command";
import { iconData, imageURLs } from "../../../database/data/imageData";
import { CatActions, getBar, getCatScore, getDNARank, getDNARankShort, getEmotion, getRank, getRankShort, getStatExp, getStatExpNext, ICatDocument, performAction } from "../../../database/model/catModel";
import { formatMoney, getGoldStr } from "../../../helpers/utils";

export default class KittenCommand extends ManiCommand {    
    public constructor(){
        super(["kitten", "kittens", "cat", "cats"], config.commandGroups.Kittens);

        this.cooldown = 15_000;
        this.unlockable = true;
        this.description = "Shows the player's kittens";
        this.examples = [
            "`h kitten`"
        ]
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

        // Create an embed to show the user's profile
        let catEmbed: DefaultEmbed = this.createCatEmbed(message.author, player, activeKitten);
        let statsEmbed: DefaultEmbed = this.createCatStatsEmbed(message.author, player, activeKitten);
        let sellPrice: number = 0;

        let kittenSelectRow = this.createKittenSelectRow(player);

        const playButton = new Discord.ButtonBuilder()
            .setCustomId('pet')
            .setLabel(`Pet`)
            .setEmoji(`🫳`)
            .setStyle(Discord.ButtonStyle.Primary);

        const feedButton = new Discord.ButtonBuilder()
            .setCustomId('feed')
            .setLabel(`Feed`)
            .setEmoji(`🥫`)
            .setStyle(Discord.ButtonStyle.Primary);
            
        const washButton = new Discord.ButtonBuilder()
            .setCustomId('wash')
            .setLabel(`Wash`)
            .setEmoji(`🧼`)
            .setStyle(Discord.ButtonStyle.Primary);   

        const chooseButton = new Discord.ButtonBuilder()
            .setCustomId('select')
            .setLabel(`Select kitten...`)
            .setEmoji(`⭐`)
            .setStyle(Discord.ButtonStyle.Secondary);   
            
        const statsButton = new Discord.ButtonBuilder()
            .setCustomId('stats')
            .setLabel(`Stats`)
            .setEmoji(`🎀`)
            .setStyle(Discord.ButtonStyle.Secondary);   
            
        const kittenActionRow = new Discord.ActionRowBuilder<Discord.ButtonBuilder>()
            .addComponents(playButton, feedButton, washButton, chooseButton, statsButton); 

        const backButton = new Discord.ButtonBuilder()
            .setCustomId('back')
            .setLabel(`Back`)
            // .setEmoji(`⭐`)
            .setStyle(Discord.ButtonStyle.Secondary);

        const favButton = new Discord.ButtonBuilder()
            .setCustomId('fav')
            .setLabel(`Active`)
            .setEmoji(`⭐`)
            .setStyle(Discord.ButtonStyle.Primary);
        
        const sellButton = new Discord.ButtonBuilder()
            .setCustomId('sell')
            .setLabel(`Sell`)
            .setEmoji(`${iconData.money}`)
            .setStyle(Discord.ButtonStyle.Danger);

        const kittenFavButtonRow = new Discord.ActionRowBuilder<Discord.ButtonBuilder>()
            .addComponents(backButton, favButton, sellButton);  
            
        const kittenStatsButtonRow = new Discord.ActionRowBuilder<Discord.ButtonBuilder>()
            .addComponents(backButton);  

        let botMessage = await message.channel.send({ embeds: [catEmbed], components: [kittenActionRow] });

        let selectMenuCollector = botMessage.createMessageComponentCollector({
            componentType: Discord.ComponentType.StringSelect,
            filter: (i) => i.user.id === message.author.id,
            time: 120_000, 
        });  

        let buttonCollector = botMessage.createMessageComponentCollector({
            componentType: Discord.ComponentType.Button,
            filter: (i) => i.user.id === message.author.id,
            time: 120_000
        });          

        selectMenuCollector.on('collect', (i: Discord.StringSelectMenuInteraction) => {
            i.deferUpdate();
            if (i.values.length < 1) return;
    
            let selection = parseInt(i.values[0]);
            if (i.customId === 'kittenMenu') {                                            
                if (!isNaN(selection)) {
                    activeKitten = player.cats[selection];
                    catEmbed = this.createCatEmbed(message.author, player, activeKitten);                    
                    if (activeKitten.active) {
                        favButton.setDisabled(true);
                        favButton.setStyle(Discord.ButtonStyle.Secondary);
                        sellButton.setDisabled(true);
                        sellButton.setLabel('Sell');
                    }                             
                    else {
                        favButton.setDisabled(false);                    
                        favButton.setStyle(Discord.ButtonStyle.Primary);
                        sellButton.setDisabled(false);
                        sellPrice = 100 + Math.floor(Math.max(2000, getCatScore(activeKitten, false)) / 10 * (activeKitten.stats.genetics.value / 100));
                        sellButton.setLabel(`${formatMoney(sellPrice)} | Sell`);                   
                    }                             
                    botMessage.edit({ embeds: [catEmbed], components: [kittenSelectRow, kittenFavButtonRow] });                    
                }                
            } 
        });

        buttonCollector.on('collect', async (i: Discord.ButtonInteraction) => {
            i.deferUpdate();		
            
            // Check if the channel is a TextChannel
            if (message.channel.type !== Discord.ChannelType.GuildText) return;
            
            if (i.customId === 'back') {
                activeKitten = player.cats.find(cat => cat.active);
                if (activeKitten) {
                    catEmbed = this.createCatEmbed(message.author, player, activeKitten);
                    botMessage.edit({ embeds: [catEmbed], components: [kittenActionRow] });
                }
            }
            else if (i.customId === 'stats') {
                if (activeKitten) {
                    statsEmbed = this.createCatStatsEmbed(message.author, player, activeKitten);
                    botMessage.edit({ embeds: [statsEmbed], components: [kittenStatsButtonRow] });
                }
            }                 
            else if (i.customId === 'select') {
                favButton.setDisabled(true);
                favButton.setStyle(Discord.ButtonStyle.Secondary);
                sellButton.setDisabled(true);
                botMessage.edit({ embeds: [catEmbed], components: [kittenSelectRow, kittenFavButtonRow] });
            }  
            else if (i.customId === 'pet') {
                if (activeKitten && activeKitten.happiness < 100) {
                    performAction(activeKitten, CatActions.pet);
                    client.database.updatePlayer(player).then(succeeded => {
                        if (succeeded && activeKitten && (message.channel.type == Discord.ChannelType.GuildText)) {
                            catEmbed = this.createCatEmbed(message.author, player, activeKitten);
                            botMessage.edit({ embeds: [catEmbed], components: [kittenActionRow] });
                            message.channel.send(`You pet **${activeKitten.name}** 🫳`);
                        }
                    });                     
                }
                else {
                    message.channel.send(`**${activeKitten?.name}** is not in the mood...`);
                }
            }   
            else if (i.customId === 'feed') {
                if (activeKitten && activeKitten.hunger < 75) {
                    const foodItemIndex = player.inventory.findIndex(item => item._id == 'food');
                    if (foodItemIndex >= 0) {
                        const foodCount = player.inventory[foodItemIndex].quantity;
                        performAction(activeKitten, CatActions.feed);                        
                        await player.takeItemFromInventory(foodItemIndex, 1);                        
                        client.database.updatePlayer(player).then(succeeded => {
                            if (succeeded && activeKitten && (message.channel.type == Discord.ChannelType.GuildText)) {
                                catEmbed = this.createCatEmbed(message.author, player, activeKitten);
                                botMessage.edit({ embeds: [catEmbed], components: [kittenActionRow] });
                                message.channel.send(`You fed **${activeKitten.name}** 🥫 *You have ${foodCount - 1} food left...*`);
                            }
                        });                     
                    }
                    else notifications.SendErrorMsg(message, notifications.ErrorMessages.Custom, `you have no food...`);
                }
                else {
                    message.channel.send(`**${activeKitten?.name}** is not hungry...`);
                }
            }      
            else if (i.customId === 'wash') {
                if (activeKitten && activeKitten.energy < 50) {
                    const soapItemIndex = player.inventory.findIndex(item => item._id == 'soap');
                    if (soapItemIndex >= 0) {
                        const soapCount = player.inventory[soapItemIndex].quantity;
                        performAction(activeKitten, CatActions.wash);
                        await player.takeItemFromInventory(soapItemIndex, 1);                        
                        client.database.updatePlayer(player).then(succeeded => {
                            if (succeeded && activeKitten && (message.channel.type == Discord.ChannelType.GuildText)) {
                                catEmbed = this.createCatEmbed(message.author, player, activeKitten);
                                botMessage.edit({ embeds: [catEmbed], components: [kittenActionRow] });
                                message.channel.send(`You washed **${activeKitten.name}** 🧼 *You have ${soapCount - 1} soap left...*`);
                            }
                        });                     
                    }
                    else notifications.SendErrorMsg(message, notifications.ErrorMessages.Custom, `you have no soap...`);
                }
                else {
                    message.channel.send(`**${activeKitten?.name}** doesn't need to be washed...`);
                }                
            }                                          
            else if (i.customId === 'fav') {
                if (activeKitten) {
                    let kitten = player.cats.find(cat => cat.active);
                    if (kitten) {
                        kitten.active = false;
                        activeKitten.active = true;
                        client.database.updatePlayer(player).then(succeeded => {
                            if (succeeded && activeKitten) {
                                catEmbed = this.createCatEmbed(message.author, player, activeKitten);
                                kittenSelectRow = this.createKittenSelectRow(player);
                                favButton.setDisabled(true);
                                favButton.setStyle(Discord.ButtonStyle.Secondary);                                
                                // botMessage.edit({ embeds: [catEmbed], components: [kittenSelectRow, kittenFavButtonRow] });
                                botMessage.edit({ embeds: [catEmbed], components: [kittenActionRow] });                                
                            }
                        });                                                    
                    }
                }
            }
            else if (i.customId === 'sell') {
                await notifications.SendInfoMsg(message, notifications.InfoMessages.Custom, `you wish to sell **${activeKitten?.name}**, type 'yes' to confirm.`);  

                const messageCollector = message.channel.createMessageCollector({
                    filter: (i) => i.author.id === message.author.id,
                    time: 30_000,
                });

                let sold: boolean = false;
                messageCollector.on('collect', (msg) => {
                    if (msg.content.trim() == 'yes'){
                        if (activeKitten) {                    
                            const index = player.cats.findIndex(cat => cat._id == activeKitten?._id && cat.name == activeKitten.name);
                            if (index) {
                                player.money += sellPrice;
                                player.currency.totalBreedingIncome += sellPrice;
                                player.cats.splice(index, 1);
                                let favKitten = player.cats.find(cat => cat.active);
                                if (favKitten) {
                                    client.database.updatePlayer(player).then(succeeded => {
                                        if (succeeded && favKitten) {
                                            sold = true;
                                            catEmbed = this.createCatEmbed(message.author, player, favKitten);
                                            kittenSelectRow = this.createKittenSelectRow(player);
                                            favButton.setDisabled(true);
                                            favButton.setStyle(Discord.ButtonStyle.Secondary);
                                            sellButton.setDisabled(true);
                                            sellButton.setLabel('Sell');
                                            // botMessage.edit({ embeds: [catEmbed], components: [kittenSelectRow, kittenFavButtonRow] });
                                            botMessage.edit({ embeds: [catEmbed], components: [kittenActionRow] }); 
                                            notifications.SendInfoMsg(message, notifications.InfoMessages.Custom, `you sold **${activeKitten?.name}** for **${getGoldStr(sellPrice, false)}**`);                               
                                            messageCollector.stop();
                                        }
                                    });                                                    
                                }
                            }
                        }                        
                    }                    
                });

                messageCollector.on('end', () => {
                    if (!sold)
                        notifications.SendInfoMsg(message, notifications.InfoMessages.Custom, `you took too long, sale cancelled...`);
                });
            }            
        });
        
        selectMenuCollector.on('end', () => {
            botMessage.edit({ embeds: [catEmbed], components: [] })
        });

        buttonCollector.on('end', () => {
            // botMessage.edit({ embeds: [catEmbed], components: [] })
        });         

    }

    private createCatEmbed(author: Discord.User, player: IPlayerDocument, cat: IPlayerCat): DefaultEmbed {
        let gender = '♀️';
        if (cat.gender == 1) gender = '♂️';
        // let genA = iconData.gen_x;
        // let genB = iconData.gen_x;
        // if (cat.gender == 1) genB = iconData.gen_y;
        let fav = ``;
        if (cat.active) fav = `(⭐ active)`;
        
        let kittenEmbed: DefaultEmbed = new DefaultEmbed(author)
            .setTitle(`${cat.name} ${gender}`)          
            .setAuthor({ name: `${author.username} 's kittens ${fav}`, iconURL: author.displayAvatarURL() })
            .setThumbnail(`${cat.data?.image.forward}`);
        
        let embedDescription = 
            // `**${cat.data?.icon.left} ${cat.name}** ${gender}\n` +
            // `*${cat.data?.description}*\n\n` +

            `**🤍 ${getRank(cat.stats.beauty)} 💗 ${getRank(cat.stats.cuteness)} 🩰 ${getRank(cat.stats.posture)} ❣️ ${getRank(cat.stats.tricks)}**\n\n` +            

            `**Happiness**\n${getBar(cat.happiness)}\n` +
            `**Hunger**\n${getBar(cat.hunger)}\n` +
            `**Energy**\n${getBar(cat.energy)}\n` +            
            `\n` +

            // `**🧬 Genetics ${getRank(cat.stats.genetics.value)}**\n` +
            // `**${genA}** ${cat.stats.genetics.A.toFixed(8)} **${genB}** ${cat.stats.genetics.B.toFixed(8)}\n` +  

            `**${cat.name}** is feeling ${getEmotion(cat)}!` +

            `\n`;
        
        kittenEmbed.setDescription(embedDescription);	
        
        return kittenEmbed;
    } 

    private createCatStatsEmbed(author: Discord.User, player: IPlayerDocument, cat: IPlayerCat): DefaultEmbed {
        let gender = '♀️';
        if (cat.gender == 1) gender = '♂️';
        let genA = iconData.gen_x;
        let genB = iconData.gen_x;
        if (cat.gender == 1) genB = iconData.gen_y;        
        let fav = ``;
        if (cat.active) fav = `(⭐ active)`;

        let statsEmbed: DefaultEmbed = new DefaultEmbed(author)
            .setTitle(`${cat.name} ${gender}`)          
            .setAuthor({ name: `${author.username} 's kittens ${fav}`, iconURL: author.displayAvatarURL() })
            .setThumbnail(`${cat.data?.image.forward}`);
        
        let embedDescription = 
            `**🤍 Beauty** ${getRank(cat.stats.beauty)}\n` +
            `${getBar(getStatExp(cat.stats.beauty), getStatExpNext(cat.stats.beauty))}\n` +
            `**💗 Cuteness** ${getRank(cat.stats.cuteness)}\n` +
            `${getBar(getStatExp(cat.stats.cuteness), getStatExpNext(cat.stats.cuteness))}\n` +
            `**🩰 Posture** ${getRank(cat.stats.posture)}\n` +
            `${getBar(getStatExp(cat.stats.posture), getStatExpNext(cat.stats.posture))}\n` +
            `**❣️ Tricks** ${getRank(cat.stats.tricks)}\n` +
            `${getBar(getStatExp(cat.stats.tricks), getStatExpNext(cat.stats.tricks))}\n\n` +

            `**🧬 Genetics ${getDNARank(cat.stats.genetics.value)}**\n` +
            `**${genA}** ${cat.stats.genetics.A.toFixed(8)} **${genB}** ${cat.stats.genetics.B.toFixed(8)}\n` + 

            `\n`;

        statsEmbed.setDescription(embedDescription);	
        
        return statsEmbed;
    }     

    private createKittenSelectRow(player: IPlayerDocument): Discord.ActionRowBuilder<Discord.StringSelectMenuBuilder> {
        let kittenOptions: Discord.RestOrArray<Discord.StringSelectMenuOptionBuilder> = [];

        for (let i = 0; i < player.cats.length; i++) {
            let kitten: IPlayerCat = player.cats[i]; 
            let gender = '♀️';
            if (kitten.gender == 1) gender = '♂️';
            let fav = ``;
            if (kitten.active) fav = `(⭐ active)`;            

            kittenOptions.push(new Discord.StringSelectMenuOptionBuilder()
                .setValue(`${i}`)
                .setLabel(`${kitten.name} ${gender} ${fav}`)
                .setEmoji(`${kitten.data?.icon.left}`)
                // .setDescription(`🤍 ${kitten.stats.beauty} 💗 ${kitten.stats.cuteness} 🩰 ${kitten.stats.posture} ❣️ ${kitten.stats.tricks} 🧬 ${kitten.stats.genetics.value}`)
                .setDescription(`🤍 ${getRankShort(kitten.stats.beauty)} 💗 ${getRankShort(kitten.stats.cuteness)} 🩰 ${getRankShort(kitten.stats.posture)} ❣️ ${getRankShort(kitten.stats.tricks)} 🧬 ${getDNARankShort(kitten.stats.genetics.value)}`)
            );
        }        

        let kittenMenu = new Discord.StringSelectMenuBuilder()
            .setCustomId('kittenMenu')
            .setMinValues(0)
            .setMaxValues(1)
            .addOptions(kittenOptions);

        return new Discord.ActionRowBuilder<Discord.StringSelectMenuBuilder>()
            .addComponents(kittenMenu);        
    }    
    
}