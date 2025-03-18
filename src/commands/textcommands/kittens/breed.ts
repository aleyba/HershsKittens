import * as Discord from "discord.js";
import * as notifications from "../../../helpers/notifications";
import { IPlayerDocument, IPlayerCat, createPlayerCat } from "../../../database/model/playerModel";
import { DefaultEmbed } from "../../../core/baseclasses";
import ManiClient from "../../../core/client";
import config from "../../../config";
import ManiCommand from "../../../core/command";
import { iconData, imageURLs } from "../../../database/data/imageData";
import { CatActions, getBar, getCatScore, getDNARank, getDNARankShort, getEmotion, getRank, getRankShort, getStatExp, getStatExpNext, ICatDocument, performAction } from "../../../database/model/catModel";
import { getDateNow, getNumToTimeStr, getSecondsBetweenDates } from "../../../helpers/dateUtils";
import { breedingData } from "../../../database/data/breedingData";
import { formatMoney, getGoldStr } from "../../../helpers/utils";
import { catData } from "../../../database/data/catData";

export default class BreedCommand extends ManiCommand {    
    public constructor(){
        super(["breed", "breeding", "baby"], config.commandGroups.Kittens);

        this.cooldown = 15_000;
        this.unlockable = true;
        this.description = "Breed 2 of your cats to get new kittens";
        this.examples = [
            "`h breed`"
        ]
    }

    private readonly secondsForBirth: number = 60 * 60 * 1 - 1; // 1 hour

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

        // get the breeding cats
        let selectedMale: IPlayerCat | undefined = player.cats.find(cat => cat.breeding && cat.gender == 1);
        let selectedFemale: IPlayerCat | undefined = player.cats.find(cat => cat.breeding && cat.gender == 0);

        // Create baby kitten if needed
        if (selectedMale && selectedFemale && player.breeding.breedingDate && !player.breeding.kitten) {
            const secondsSinceBreeding = getSecondsBetweenDates(getDateNow(), player.breeding.breedingDate);
            if (secondsSinceBreeding >= this.secondsForBirth) {
                const catIds: string[] = [selectedMale._id, selectedFemale._id];
                const potentialKittens = breedingData.filter(combination => combination.parents.includes(`${selectedMale?._id}`) && combination.parents.includes(`${selectedFemale?._id}`) && `${selectedMale?._id}` != `${selectedFemale?._id}`);
                for (let i = 0; i < potentialKittens.length; i++)
                    catIds.push(potentialKittens[i].child);

                const kittenID = catIds[Math.floor(Math.random() * catIds.length)];
                let gender: number = 0;
                let genA = selectedFemale.stats.genetics.A;
                let genB = selectedMale.stats.genetics.A;
                
                // Female gen
                if (Math.round(Math.random()) == 1) {
                    genA = selectedFemale.stats.genetics.B;
                }
                // Male gen
                if (Math.round(Math.random()) == 1) {
                    gender = 1;
                    genB = selectedMale.stats.genetics.B;
                }                

                player.breeding.kitten = createPlayerCat(kittenID, kittenID, gender, genA, genB);

                // Beauty
                if (Math.round(Math.random()) == 0)
                    player.breeding.kitten.stats.beauty = selectedFemale.stats.beauty
                else
                    player.breeding.kitten.stats.beauty = selectedMale.stats.beauty;

                // Cuteness
                if (Math.round(Math.random()) == 0)
                    player.breeding.kitten.stats.cuteness = selectedFemale.stats.cuteness
                else
                    player.breeding.kitten.stats.cuteness = selectedMale.stats.cuteness;
                
                // Posture
                if (Math.round(Math.random()) == 0)
                    player.breeding.kitten.stats.posture = selectedFemale.stats.posture
                else
                    player.breeding.kitten.stats.posture = selectedMale.stats.posture;
                
                // Tricks
                if (Math.round(Math.random()) == 0)
                    player.breeding.kitten.stats.tricks = selectedFemale.stats.tricks
                else
                    player.breeding.kitten.stats.tricks = selectedMale.stats.tricks;
                
                if (!player.breeding.seen.includes(player.breeding.kitten._id))
                    player.breeding.seen.push(player.breeding.kitten._id);
                if (await client.database.updatePlayer(player)) {
                    // succeeded
                }				
                else {
                    notifications.SendErrorMsg(message, notifications.ErrorMessages.DBConnectionFailed);
                }                  
            }
        }

        // Fetch kitten data
        let sellPrice: number = 0;
        if (player.breeding.kitten) {
            player.breeding.kitten.data = await client.database.getCat(player.breeding.kitten._id);
            sellPrice = 100 + Math.floor(Math.max(2000, getCatScore(player.breeding.kitten, false)) / 10 * (player.breeding.kitten.stats.genetics.value / 100));
        }

        // Create an embed to show the user's profile
        let breedingEmbed: DefaultEmbed = this.createBreedingEmbed(message.author, player, selectedMale, selectedFemale);
        const kittenEmbed: DefaultEmbed = this.createKittenEmbed(message.author, selectedMale, selectedFemale, player.breeding.kitten);

        let kittenMaleSelectRow = this.createKittenSelectRow(player, 1, selectedMale);
        let kittenFemaleSelectRow = this.createKittenSelectRow(player, 0, selectedFemale);

        const adoptButton = new Discord.ButtonBuilder()
            .setCustomId('adopt')
            .setLabel(`Adopt`)
            // .setEmoji(`⭐`)
            .setStyle(Discord.ButtonStyle.Success);

        const sellButton = new Discord.ButtonBuilder()
            .setCustomId('sell')
            .setLabel(`${formatMoney(sellPrice)} | Sell`)
            .setEmoji(`${iconData.money}`)
            .setStyle(Discord.ButtonStyle.Danger);

        const breedingButtonRow = new Discord.ActionRowBuilder<Discord.ButtonBuilder>()
            .addComponents(adoptButton, sellButton);  

        let botMessage: Discord.Message;

        if (player.breeding.kitten)
            botMessage = await message.channel.send({ embeds: [kittenEmbed], components: [breedingButtonRow] });
        else
            botMessage = await message.channel.send({ embeds: [breedingEmbed], components: [kittenMaleSelectRow, kittenFemaleSelectRow] });

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

        selectMenuCollector.on('collect', async (i: Discord.StringSelectMenuInteraction) => {
            i.deferUpdate();
            if (i.values.length < 1) return;
    
            let selection = i.values[0];
            if (selection) {
                if (i.customId === 'maleMenu') {     
                    if (selectedMale) selectedMale.breeding = false;                                                       
                    selectedMale = player.cats.find(cat => cat.name == selection);              
                    if (selectedMale) selectedMale.breeding = true;
                    kittenMaleSelectRow = this.createKittenSelectRow(player, 1, selectedMale);        
                } 
                else if (i.customId === 'femaleMenu') { 
                    if (selectedFemale) selectedFemale.breeding = false;
                    selectedFemale = player.cats.find(cat => cat.name == selection);            
                    if (selectedFemale) selectedFemale.breeding = true;
                    kittenFemaleSelectRow = this.createKittenSelectRow(player, 0, selectedFemale);
                } 

                if (selectedMale && selectedFemale) {
                    player.breeding.breedingDate = getDateNow();
                }

                if (await client.database.updatePlayer(player)) {
                    breedingEmbed = this.createBreedingEmbed(message.author, player, selectedMale, selectedFemale);                    
                    botMessage.edit({ embeds: [breedingEmbed], components: [kittenMaleSelectRow, kittenFemaleSelectRow] }); 
                }				
                else {
                    notifications.SendErrorMsg(message, notifications.ErrorMessages.DBConnectionFailed);
                }                  
            }
        });

        buttonCollector.on('collect', async (i: Discord.ButtonInteraction) => {
            i.deferUpdate();
            
            // Check if the channel is a TextChannel
            if (message.channel.type !== Discord.ChannelType.GuildText) return;
            
            if (player.breeding.kitten) {
                if (i.customId === 'adopt') {
                    message.channel.send(`**[Enter Name]**:`);

                    let kittenName = player.breeding.kitten._id;
                    const messageCollector = message.channel.createMessageCollector({
                        filter: (i) => i.author.id === message.author.id,
                        time: 60_000,
                    });

                    messageCollector.on('collect', (msg) => {
                        if (msg.content.trim() != ''){
                            kittenName = msg.content;
                        }
                        messageCollector.stop();
                    });

                    messageCollector.on('end', () => {                        
                        if (player.cats.find(cat => cat.name == kittenName)) {
                            for (let num = 2; num < 99; num ++) {
                                if (!player.cats.find(cat => cat.name == `${kittenName}${num}`)) {
                                    kittenName = `${kittenName}${num}`;
                                    break;
                                }
                            }
                        }

                        // Check if the channel is a TextChannel
                        if (message.channel.type !== Discord.ChannelType.GuildText) return;

                        if (player.breeding.kitten) {
                            const adoptedKitten = player.breeding.kitten;
                            adoptedKitten.name = kittenName;                            
                            player.cats.push(adoptedKitten);
                            player.breeding.kitten = undefined;
                            player.breeding.breedingDate = getDateNow();
                            client.database.updatePlayer(player).then(succeeded => {
                                if (succeeded && (message.channel.type == Discord.ChannelType.GuildText)) {
                                    kittenMaleSelectRow = this.createKittenSelectRow(player, 1, selectedMale);        
                                    kittenFemaleSelectRow = this.createKittenSelectRow(player, 0, selectedFemale);  
                                    breedingEmbed = this.createBreedingEmbed(message.author, player, selectedMale, selectedFemale);                          
                                    botMessage.edit({ embeds: [breedingEmbed], components: [kittenMaleSelectRow, kittenFemaleSelectRow] }); 
                                    message.channel.send({ content: `${adoptedKitten.data?.icon.forward}` });
                                    message.channel.send(`You adopted **${kittenName}**!`);  
                                }
                                else notifications.SendErrorMsg(message, notifications.ErrorMessages.DBConnectionFailed);
                            });                        
                        }
                    });
                }
                else if (i.customId === 'sell') {
                    if (player.breeding.kitten) {                        
                        player.money += sellPrice;
                        player.currency.totalBreedingIncome += sellPrice;
                        player.breeding.kitten = undefined;
                        player.breeding.breedingDate = getDateNow();
                        client.database.updatePlayer(player).then(succeeded => {
                            if (succeeded) {
                                breedingEmbed = this.createBreedingEmbed(message.author, player, selectedMale, selectedFemale);                    
                                botMessage.edit({ embeds: [breedingEmbed], components: [kittenMaleSelectRow, kittenFemaleSelectRow] });
                                notifications.SendInfoMsg(message, notifications.InfoMessages.Custom, `you sold your kitten for **${getGoldStr(sellPrice, false)}**`);
                            }
                            else notifications.SendErrorMsg(message, notifications.ErrorMessages.DBConnectionFailed);
                        });                        
                    }
                }                 
            }
        });
        
        selectMenuCollector.on('end', () => {
            botMessage.edit({ components: [] })
        });

        buttonCollector.on('end', () => {
            // botMessage.edit({ embeds: [catEmbed], components: [] })
        });         

    }

    private createBreedingEmbed(author: Discord.User, player: IPlayerDocument, maleKitten: IPlayerCat | undefined, femaleKitten: IPlayerCat | undefined): DefaultEmbed {        
        let breedingEmbed: DefaultEmbed = new DefaultEmbed(author)
            // .setTitle(`${author.username}'s breeding box`)          
            .setAuthor({ name: `${author.username}'s breeding box`, iconURL: author.displayAvatarURL() });
            // .setThumbnail(`${cat.data?.image.forward}`);
        
        let embedDescription = '';

        if (maleKitten) {
            embedDescription +=
                `**${maleKitten.data?.icon.left} ${maleKitten.name}** ♂️\n` +

                `**🤍 ${getRank(maleKitten.stats.beauty)} 💗 ${getRank(maleKitten.stats.cuteness)} 🩰 ${getRank(maleKitten.stats.posture)} ❣️ ${getRank(maleKitten.stats.tricks)}**\n` +            

                `**🧬 Genetics ${getDNARank(maleKitten.stats.genetics.value)}**\n` +
                `**${iconData.gen_x}** ${maleKitten.stats.genetics.A.toFixed(8)} **${iconData.gen_y}** ${maleKitten.stats.genetics.B.toFixed(8)}\n` +
                `\n\n`;
        }
        else {
            embedDescription += `**Male** ♂️\n[none]\n\n`;
        }

        if (femaleKitten) {
            embedDescription +=
                `**${femaleKitten.data?.icon.left} ${femaleKitten.name}** ♀️\n` +

                `**🤍 ${getRank(femaleKitten.stats.beauty)} 💗 ${getRank(femaleKitten.stats.cuteness)} 🩰 ${getRank(femaleKitten.stats.posture)} ❣️ ${getRank(femaleKitten.stats.tricks)}**\n` +            
                
                `**🧬 Genetics ${getDNARank(femaleKitten.stats.genetics.value)}**\n` +
                `**${iconData.gen_x}** ${femaleKitten.stats.genetics.A.toFixed(8)} **${iconData.gen_x}** ${femaleKitten.stats.genetics.B.toFixed(8)}\n` + 
                `\n`;
        }    
        else {
            embedDescription += `**Female** ♀️\n[none]\n\n`;
        } 
        
        if (maleKitten && femaleKitten && player.breeding.breedingDate) {
            const secondsSinceBreeding = getSecondsBetweenDates(getDateNow(), player.breeding.breedingDate);
            const secondsUntilBirth = Math.max(1, this.secondsForBirth - secondsSinceBreeding);
            const timeStr = getNumToTimeStr(secondsUntilBirth);
            const potentialKittens = breedingData.filter(combination => combination.parents.includes(maleKitten._id) && combination.parents.includes(femaleKitten._id) && maleKitten._id != femaleKitten._id);
            let potentialStr = `${maleKitten.data?.icon.forward} `;
            if (femaleKitten._id != maleKitten._id)
                potentialStr += `${femaleKitten.data?.icon.forward} `;
            for (let i = 0; i < potentialKittens.length; i++) {
                if (player.breeding.seen.includes(potentialKittens[i].child)) {
                    let childData = catData.find(data => data._id == potentialKittens[i].child);
                    potentialStr += `${childData?.icon.forward} `;
                }
                else
                    potentialStr += '❔ ';
            }
            embedDescription += `Potential kittens:\n${potentialStr}\n\n`;
            breedingEmbed.setFooter({ text: `${timeStr} until birth...` });
        }
        
        breedingEmbed.setDescription(embedDescription);	
        
        return breedingEmbed;
    } 

    private createKittenEmbed(author: Discord.User, maleKitten: IPlayerCat | undefined, femaleKitten: IPlayerCat | undefined, kitten: IPlayerCat | undefined): DefaultEmbed {                
        let kittenEmbed: DefaultEmbed = new DefaultEmbed(author)         
            .setAuthor({ name: `${author.username}'s breeding box`, iconURL: author.displayAvatarURL() });

        if (kitten) {           
            let gender = '♀️';
            if (kitten.gender == 1) gender = '♂️';
            let genA = iconData.gen_x;
            let genB = iconData.gen_x;
            if (kitten.gender == 1) genB = iconData.gen_y;

            kittenEmbed.setTitle(`${maleKitten?.data?.icon.left} **${maleKitten?.name}** ♂️ and ${femaleKitten?.data?.icon.left} **${femaleKitten?.name}** ♀️ received a baby kitten!`) 
            kittenEmbed.setThumbnail(`${kitten.data?.image.forward}`);

            let embedDescription =
                `*${kitten.data?.description}*\n` +
                `Gender ${gender}\n` +  
                `\n` +

                `**🤍 ${getRank(kitten.stats.beauty)} 💗 ${getRank(kitten.stats.cuteness)} 🩰 ${getRank(kitten.stats.posture)} ❣️ ${getRank(kitten.stats.tricks)}**\n\n` +            

                `**🧬 Genetics ${getDNARank(kitten.stats.genetics.value)}**\n` +
                `**${genA}** ${kitten.stats.genetics.A.toFixed(8)} **${genB}** ${kitten.stats.genetics.B.toFixed(8)}\n` +         

                `\n`;
            
            kittenEmbed.setDescription(embedDescription);	
        }
        
        return kittenEmbed;
    }   

    private createKittenSelectRow(player: IPlayerDocument, selectGender: number, selectKitten: IPlayerCat | undefined): Discord.ActionRowBuilder<Discord.StringSelectMenuBuilder> {
        let kittenOptions: Discord.RestOrArray<Discord.StringSelectMenuOptionBuilder> = [];

        let gender = '♀️';
        let customId = 'femaleMenu';
        let placeholder = 'Select Female...';
        if (selectGender == 1) gender = '♂️';  
        if (selectGender == 1) customId = 'maleMenu';
        if (selectGender == 1) placeholder = 'Select Male...';        

        // if (selectKitten) {
            kittenOptions.push(new Discord.StringSelectMenuOptionBuilder()
                .setValue(`none`)
                .setLabel(`[none]`)
                .setEmoji(`❌`)
                .setDescription(`Remove selection...`)
            );
        // }

        for (let i = 0; i < player.cats.length; i++) {
            let kitten: IPlayerCat = player.cats[i]; 

            if (kitten.gender != selectGender) continue; // only show selected gender in this menu 
            // if (kitten.active) continue; // keep your active kitten with you
            if (kitten.breeding) continue; // kitten is already breeding  
            
            let fav = ``;
            if (kitten.active) fav = `(⭐ active)`;            

            kittenOptions.push(new Discord.StringSelectMenuOptionBuilder()
                .setValue(`${kitten.name}`)
                .setLabel(`${kitten.name} ${gender} ${fav}`)
                .setEmoji(`${kitten.data?.icon.left}`)
                .setDescription(`🤍 ${getRankShort(kitten.stats.beauty)} 💗 ${getRankShort(kitten.stats.cuteness)} 🩰 ${getRankShort(kitten.stats.posture)} ❣️ ${getRankShort(kitten.stats.tricks)} 🧬 ${getDNARankShort(kitten.stats.genetics.value)}`)
            );
        }        

        let kittenMenu = new Discord.StringSelectMenuBuilder()
            .setCustomId(customId)
            .setPlaceholder(placeholder)
            .setMinValues(0)
            .setMaxValues(1)
            .addOptions(kittenOptions);

        return new Discord.ActionRowBuilder<Discord.StringSelectMenuBuilder>()
            .addComponents(kittenMenu);        
    }    
    
}