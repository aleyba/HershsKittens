import * as Discord from "discord.js";
import * as notifications from "../../../helpers/notifications";
import ManiClient from "../../../core/client";
import config from "../../../config";
import ManiCommand from "../../../core/command";
import { getDNARank, getRank, ICat, ICatDocument } from "../../../database/model/catModel";
import { copyPlayerCat, IPlayerCat, IPlayerDocument } from "../../../database/model/playerModel";
import { iconData, imageURLs } from "../../../database/data/imageData";
import { DefaultEmbed, HelpEmbed } from "../../../core/baseclasses";
import { formatMoney, getGoldStr } from "../../../helpers/utils";

export default class AdoptCommand extends ManiCommand {
    public constructor(){
        super(["adopt"], config.commandGroups.Owner);

        this.cooldown = 30_000;
		this.description = "Adopt a kitten";
        this.examples = [
            "`h adopt`"
        ]
    }

    public async runCommand(options: { client: ManiClient, message: Discord.Message, player: IPlayerDocument, args: string[] }): Promise<void> {
        const { client, message, player, args } = options;

        // Check if the channel is a TextChannel
        if (options.message.channel.type !== Discord.ChannelType.GuildText) return;

        const kittens: IPlayerCat[] = client.catstore.getCats();

        let catOptionString: string = ``;
        for (let i = 0; i < kittens.length; i++) {
            let kitten: IPlayerCat = kittens[i];
            kitten.data = await client.database.getCat(kitten._id);
            catOptionString += `${kitten.data?.icon.left}`;
        }

        const hershEmbed: DefaultEmbed = new HelpEmbed(client, `Hersh's kitten adoption centre`)            
            // .setAuthor(null)
            .setTitle("Hersh💬")  
            .setDescription(
                `Hello my lovelies! Have a look at our kittens today 🫰\n` +
                `We'll have new kittens every day!`
            )   
            .setThumbnail(imageURLs.avatar_hersh);

        let kittenEmbed: DefaultEmbed = new HelpEmbed(client, `adopt kitten`);  
        let kittenSelectRow = this.createKittenSelectRow(kittens);

        const adoptButton = new Discord.ButtonBuilder()
            .setCustomId('adopt')
            .setLabel(`${formatMoney(1000)} | Adopt`)
            .setEmoji(`${iconData.money}`)
            .setStyle(Discord.ButtonStyle.Success);     
                
        const backButton = new Discord.ButtonBuilder()
            .setCustomId('back')
            .setLabel(`Back`)
            // .setEmoji(`↩️`) // 🔙
            .setStyle(Discord.ButtonStyle.Secondary);              

        const adoptButtonRow = new Discord.ActionRowBuilder<Discord.ButtonBuilder>()
            .addComponents(backButton, adoptButton);         

        let kittenSelection: IPlayerCat | undefined = undefined;

        // Check if the channel is a TextChannel
        if (message.channel.type !== Discord.ChannelType.GuildText) return;

        // let catMessage = await message.channel.send(catOptionString);
        await message.channel.send("**Hersh:** It's a beautiful day to adopt a kitten don't you think?");
        let botMessage = await message.channel.send({ embeds: [hershEmbed], components: [kittenSelectRow] });


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
    
            let selection = i.values[0];
            if (i.customId === 'kittenMenu') {                            
                kittenSelection = kittens.find(kitten => kitten._id == selection);
                if (kittenSelection) {
                    kittenEmbed = this.createKittenEmbed(client, kittenSelection);
                    botMessage.edit({ embeds: [kittenEmbed], components: [adoptButtonRow] });
                }
            } 
        });

        buttonCollector.on('collect', async (i: Discord.ButtonInteraction) => {
            i.deferUpdate();	
            
            // Check if the channel is a TextChannel
            if (message.channel.type !== Discord.ChannelType.GuildText) return;

            if (i.customId === 'back') {
                botMessage.edit({ embeds: [hershEmbed], components: [kittenSelectRow] });
            }
            else if (i.customId === 'adopt') {
                if (kittenSelection) {
                    if (player.money < 1000) {
                        notifications.SendInfoMsg(message, notifications.InfoMessages.NotEnoughMoney);
                        return;
                    }

                    botMessage.edit({ /*content: `What do you want to call your new kitten?`, embeds: [],*/ components: [] });
                    await message.channel.send(`**Hersh:** Cool!`);
                    await message.channel.send(`**Hersh:** So...`);
                    await message.channel.send(`**Hersh:** What do you want to call your new kitten?`);
                    await message.channel.send(`**[Enter Name]**:`);

                    let kittenName = kittenSelection._id;
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
                        if (!kittenSelection) return;

                        // Check if the channel is a TextChannel
                        if (message.channel.type !== Discord.ChannelType.GuildText) return;
                      
                        if (player.cats.find(cat => cat.name == kittenName)) {
                            for (let num = 2; num < 99; num ++) {
                                if (!player.cats.find(cat => cat.name == `${kittenName}${num}`)) {
                                    kittenName = `${kittenName}${num}`;
                                    break;
                                }
                            }
                        }

                        const adoptedKitten = copyPlayerCat(kittenSelection);
                        adoptedKitten.name = kittenName;
                        if (player.cats.length < 1) adoptedKitten.active = true;
                        player.cats.push(adoptedKitten);
                        if (!player.breeding.seen.includes(adoptedKitten._id))
                            player.breeding.seen.push(adoptedKitten._id);
                        player.money -= 1000;
                        player.currency.totalAdoptionSpendings -= 1000;
                        client.database.updatePlayer(player).then(succeeded => {
                            if (succeeded && (message.channel.type == Discord.ChannelType.GuildText)) {
                                message.channel.send({ content: `${kittenSelection?.data?.icon.forward}` });
                                message.channel.send(`You adopted **${kittenName}**!`);  
                                if (player.cats.length > 0) {                                    
                                    message.channel.send(
                                        'You can have one kitten active at a time.\n' +
                                        'You can use the following commands:\n\n' +
                                        '`h kitten`: Manage your active kitten\n' +
                                        '`h play`: Play with your kitten\n' +                                        
                                        '`h train`: Train your kitten\n' +
                                        '`h photoshoot`: Take your kitten for a photoshoot\n' +
                                        '`h salon`: Take your kitten to the salon\n' +
                                        '`h contest`: Join a contest with your kitten\n'
                                    );
                                }
                            }
                            else notifications.SendErrorMsg(message, notifications.ErrorMessages.DBConnectionFailed);
                        });                        
                    });
                }
            }                                
        });          
                
        selectMenuCollector.on('end', () => {
            botMessage.edit({ components: [] })
        });
        
        buttonCollector.on('end', () => {
            botMessage.edit({ components: [] });
        }); 

    }

    private createKittenSelectRow(kittens: IPlayerCat[]): Discord.ActionRowBuilder<Discord.StringSelectMenuBuilder> {
        let kittenOptions: Discord.RestOrArray<Discord.StringSelectMenuOptionBuilder> = [];

        for (let i = 0; i < kittens.length; i++) {
            let kitten: IPlayerCat = kittens[i]; 
            let gender = '♀️';
            if (kitten.gender == 1) gender = '♂️';

            kittenOptions.push(new Discord.StringSelectMenuOptionBuilder()
                .setValue(kitten._id)
                .setLabel(`${kitten._id} ${gender}`)
                .setEmoji(`${kitten.data?.icon.left}`)
                .setDescription(`${kitten.data?.description}`) // 🧬 ${kitten.stats.genetics.value}`)
                // .setDescription(`🩷 ${kitten.stats.beauty} 🩰 ${kitten.stats.cuteness} 🐈 ${kitten.stats.posing} 🪽 ${kitten.stats.tricks} 🧬 ${kitten.stats.genetics.value}`)
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

    private createKittenEmbed(client: ManiClient, cat: IPlayerCat): DefaultEmbed {
        let gender = '♀️';
        if (cat.gender == 1) gender = '♂️';
        let genA = iconData.gen_x;
        let genB = iconData.gen_x;
        if (cat.gender == 1) genB = iconData.gen_y;

        let kittenEmbed: DefaultEmbed = new HelpEmbed(client, `Hersh's kitten adoption centre`)
            .setTitle(`${cat.data?.description}`)
            .setThumbnail(`${cat.data?.image.forward}`);
            // .setThumbnail(imageURLs.avatar_hersh);      

        let embedDescription = 
            `Gender ${gender}\n` +    

            `**🧬 Genetics ${getDNARank(cat.stats.genetics.value)}**\n` +
            `**${genA}** ${cat.stats.genetics.A.toFixed(8)} **${genB}** ${cat.stats.genetics.B.toFixed(8)}\n` +  

            `\n` +
            `Price: **${getGoldStr(1000, false)}**\n`;    

        kittenEmbed.setDescription(embedDescription);	
        
        return kittenEmbed;
    }  
    
}