import { IItem } from "../model/itemModel";


export let itemData: IItem[] = [
    {        
        _id: "food",
        icon: "🥫",
        name: "Cat Food",
        description: "A delicious combination of ingredients that satisfies your cat's hunger.",
        price: 15,
        maxQuantity: 999,
        orderId: 1
    },
    {        
        _id: "soap",
        icon: "🧼",
        name: "Soap",
        description: "A dermatologically tested formula to keep your favourite cat sprakling.",
        price: 40,
        maxQuantity: 999,
        orderId: 2
    },
    {        
        _id: "meds",
        icon: "💉",
        name: "Medicine",
        description: "A shot of antibodies to fight any disease your cat suffers from.",
        price: 500,
        maxQuantity: 99,
        orderId: 3
    },
    {        
        _id: "pill",
        icon: "💊",
        name: "GenPill",
        description: "A special pill that changes your cat's genetics.",
        price: 2500,
        maxQuantity: 99,
        orderId: 4
    },
    {        
        _id: "trickstoy",
        icon: "🐁",
        name: "Mouse Toy",
        description: "Increases exp gained in training by 25%.",
        price: 5000,
        maxQuantity: 1,
        orderId: 8
    },
    {        
        _id: "beautytoy",
        icon: "🪶",
        name: "Feather Toy",
        description: "Increases exp gained in beauty by 25%.",
        price: 5000,
        maxQuantity: 1,
        orderId: 5
    },
    {        
        _id: "posturetoy",
        icon: "🪀", //🎣
        name: "Yo-yo Toy",
        description: "Increases exp gained in posture by 25%.",
        price: 5000,
        maxQuantity: 1,
        orderId: 7
    },
    {        
        _id: "cutenesstoy",
        icon: "🧶",
        name: "Yarn Toy",
        description: "Increases exp gained in cuteness by 25%.",
        price: 5000,
        maxQuantity: 1,
        orderId: 6
    },            
]