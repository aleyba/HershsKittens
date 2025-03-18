import { IQuest } from "../../managers/questManager";

export enum QuestID { daily = 1, contest = 2, play = 3, train = 4, photoshoot = 5, salon = 6 }

export let questData: IQuest[] = [
    {        
        _id: QuestID.daily,
        icon: "⏱️",
        name: "Daily",
        description: "Collect your daily",
        target: 1
    },
    {        
        _id: QuestID.contest,
        icon: "🎀",
        name: "Contest",
        description: "Join a contest 1 time",
        target: 1
    },
    {        
        _id: QuestID.play,
        icon: "💗",
        name: "Play",
        description: "Play with your kitten 3 times",
        target: 3
    },
    {        
        _id: QuestID.train,
        icon: "🐾",
        name: "Train",
        description: "Train your kitten 3 times",
        target: 3
    },
    {        
        _id: QuestID.photoshoot,
        icon: "📸",
        name: "Photoshoot",
        description: "Do a photoshoot 3 times",
        target: 3
    },
    {        
        _id: QuestID.salon,
        icon: "💅",
        name: "Salon",
        description: "Visit the salon 3 times",
        target: 3
    },
]