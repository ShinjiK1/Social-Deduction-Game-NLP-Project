import { randomInt } from 'node:crypto';

// Word list. The larper only sees the category, so words should be concrete and guessable
// within their category. An entry can be a string, or [word, ...aliases] where aliases are
// other names for the same thing: innocents can't use them in hints either, and the larper
// can guess them.
export const WORDS = {
  Animals: [
    'elephant', 'giraffe', 'penguin', 'kangaroo', 'octopus', 'dolphin', 'owl', 'snake',
    'tiger', 'rabbit', 'shark', 'camel', 'bat', 'frog', 'spider', 'horse', 'eagle',
    'turtle', 'bee', 'squirrel', 'wolf', 'panda', 'flamingo', 'crocodile', 'jellyfish',
    'lion', 'zebra', 'gorilla', 'monkey', 'koala', 'sloth', ['hippo', 'hippopotamus'],
    ['rhino', 'rhinoceros'], 'cheetah', 'polar bear', 'peacock', 'parrot', 'ostrich',
    'hedgehog', 'skunk', 'raccoon', 'moose', 'deer', 'fox', 'chicken', 'cow', 'pig', 'sheep',
    'goat', 'duck', 'swan', 'seal', 'whale', 'crab', 'lobster', 'snail', 'butterfly', 'ant',
    'mosquito', 'scorpion', 'chameleon', 'hamster', 'goldfish', 'beaver', 'porcupine',
    'llama', 'walrus',
  ],
  Food: [
    'pizza', 'sushi', 'taco', 'pancake', 'popcorn', 'spaghetti', ['burger', 'hamburger'],
    'sandwich', 'cheese', 'chocolate', 'ice cream', 'donut', 'banana', 'watermelon', 'lemon',
    'avocado', 'bacon', 'cereal', 'soup', 'salad', 'cookie', 'pretzel', 'honey', 'egg',
    'garlic', 'steak', 'hot dog', ['french fries', 'fries'], 'burrito', 'ramen', 'dumpling',
    'croissant', 'bagel', 'waffle', 'cupcake', 'cheesecake', 'pie', 'brownie', 'lasagna',
    'curry', 'nachos', 'sausage', 'popsicle', 'marshmallow', 'peanut butter', 'pickle',
    'mushroom', 'carrot', 'broccoli', 'potato', 'tomato', 'corn', 'onion', 'strawberry',
    'pineapple', 'coconut', 'grapes', 'apple', 'orange', 'cherry', 'mango', 'peach', 'rice',
    'bread', 'butter', 'yogurt', 'milkshake', 'coffee', 'tea', 'lemonade', 'smoothie',
  ],
  Places: [
    'beach', 'library', 'airport', 'hospital', 'museum', 'desert', 'jungle', 'castle',
    'school', 'casino', 'prison', 'volcano', 'farm', 'stadium', 'church', 'gym', 'zoo',
    'cave', 'island', 'mall', 'subway', 'bakery', 'cemetery', 'igloo', 'lighthouse',
    'restaurant', 'hotel', 'bank', 'post office', 'gas station', 'supermarket', 'park',
    'playground', 'aquarium', 'swimming pool', 'office', 'factory', 'train station',
    'laboratory', 'space station', 'North Pole', 'water park', 'ski resort', 'campsite',
    'barn', 'garage', 'attic', 'basement', 'kitchen', 'bathroom', 'classroom', 'courtroom',
    'police station', 'fire station', 'pharmacy', 'laundromat', ['theme park', 'amusement park'],
    'skyscraper', 'bridge', 'harbor', 'swamp', 'coffee shop', 'nightclub', 'barbershop',
  ],
  'Household Items': [
    'toothbrush', 'pillow', 'mirror', 'candle', 'umbrella', 'scissors', 'blanket', 'ladder',
    'vacuum', 'microwave', ['refrigerator', 'fridge'], 'clock', 'lamp', 'sponge', 'broom',
    'toaster', 'key', 'remote', ['couch', 'sofa'], 'bathtub', 'curtain', 'hanger', 'doorbell',
    'trash can', 'calendar', 'fork', 'spoon', 'plate', 'mug', 'frying pan', 'kettle',
    'blender', 'dishwasher', 'washing machine', 'iron', 'hair dryer', 'towel', 'soap',
    'shampoo', 'toilet paper', 'light bulb', 'fan', 'heater', 'bookshelf', 'mattress',
    'picture frame', 'vase', 'rug', 'doormat', 'mailbox', 'flashlight', 'hammer',
    'screwdriver', 'tape', 'glue', 'stapler', 'paper clip', 'envelope', 'bucket', 'mop',
    'plunger', 'laundry basket', 'smoke detector', 'thermostat', 'oven mitt',
    'cutting board', 'can opener', 'teapot', 'chair', 'table', 'bed', 'desk',
  ],
  'Sports & Games': [
    'soccer', 'basketball', 'tennis', 'golf', 'chess', 'bowling', 'boxing', 'surfing',
    'skiing', 'baseball', 'volleyball', 'hockey', 'wrestling', 'archery', 'poker', 'karate',
    'swimming', 'marathon', 'skateboarding', 'darts', 'frisbee', 'badminton', 'fencing',
    'rugby', 'cricket',
  ],
  Jobs: [
    'doctor', 'teacher', 'chef', 'firefighter', 'pilot', 'astronaut', 'lawyer', 'plumber',
    'farmer', 'dentist', 'detective', 'clown', 'magician', 'librarian', 'mechanic', 'barber',
    'nurse', 'scientist', 'judge', 'cashier', 'lifeguard', 'janitor', 'photographer',
    'soldier', 'waiter', 'police officer', 'mail carrier', 'painter', 'architect',
    'electrician', 'carpenter', 'accountant', 'banker', 'pharmacist', ['veterinarian', 'vet'],
    'zookeeper', 'flight attendant', 'taxi driver', 'bus driver', 'construction worker',
    'cowboy', 'fisherman', 'baker', 'butcher', 'tailor', 'florist', 'journalist',
    'news anchor', 'actor', 'singer', 'dancer', 'comedian', 'coach', 'referee', 'surgeon',
    'therapist', 'programmer', 'YouTuber', 'president', 'priest', 'archaeologist',
    'bodyguard', 'spy', 'security guard', 'translator', 'real estate agent',
    'garbage collector',
  ],
  'Nature & Weather': [
    'rainbow', 'tornado', 'snow', 'thunder', 'lightning', 'river', 'mountain', 'ocean',
    'sunset', 'cloud', 'forest', 'waterfall', 'earthquake', 'fog', 'moon', 'star', 'flower',
    'tree', 'glacier', 'wind', 'rain', 'sand', 'rock', 'fire', 'hurricane',
  ],
  Transportation: [
    'bicycle', 'airplane', 'train', 'helicopter', 'submarine', 'motorcycle', 'taxi', 'bus',
    'rocket', 'sailboat', 'skateboard', 'ambulance', 'tractor', 'canoe', 'hot air balloon',
    'scooter', 'limousine', 'elevator', 'escalator', 'truck', 'ferry', 'cable car',
    'spaceship', 'sled', 'parachute',
  ],
  'Music & Entertainment': [
    'guitar', 'piano', 'drum', 'violin', 'trumpet', 'microphone', 'concert', 'karaoke',
    'opera', 'ballet', 'movie theater', 'circus', 'podcast', 'DJ', 'headphones', 'radio',
    'disco', 'orchestra', 'rap', 'rock band', 'choir', 'harmonica', 'saxophone', 'jukebox',
    'magic show',
  ],
  'Clothing & Accessories': [
    'hat', 'sock', 'glove', 'scarf', 'sunglasses', 'necklace', 'ring', 'watch', 'backpack',
    'boots', 'sneakers', 'tie', 'belt', 'wallet', 'crown', 'pajamas', 'jacket', 'dress',
    'wig', 'mask', 'earrings', 'bracelet', 'swimsuit', 'apron', 'helmet',
  ],
  'Events & Holidays': [
    'birthday', 'wedding', 'Halloween', 'Christmas', 'Thanksgiving', 'graduation', 'funeral',
    'picnic', 'sleepover', 'prom', 'New Year', 'Valentine\'s Day', 'camping trip', 'road trip',
    'job interview', 'first date', 'vacation', 'Easter', 'fireworks', 'parade', 'barbecue',
    'baby shower', 'garage sale', 'field trip', 'family reunion',
  ],
  'Fantasy & Fiction': [
    'dragon', 'wizard', 'vampire', 'zombie', 'ghost', 'mermaid', 'unicorn', 'robot', 'alien',
    'pirate', 'ninja', 'superhero', 'witch', 'fairy', 'giant', 'knight', 'princess',
    'werewolf', 'troll', 'genie', 'mummy', 'elf', 'time machine', 'treasure', 'haunted house',
  ],
  Technology: [
    'laptop', 'smartphone', 'email', 'wifi', 'battery', 'camera', 'printer', 'keyboard',
    'password', 'charger', 'selfie', 'emoji', 'satellite', 'calculator', 'television', 'GPS',
    'drone', 'computer virus', 'hashtag', 'bluetooth', 'spreadsheet', 'website', 'joystick',
    'flash drive', 'alarm clock',
  ],
  'Video Games': [
    'Minecraft', 'Fortnite', 'Tetris', 'Pac-Man', 'Pokémon', 'Mario Kart',
    ['The Legend of Zelda', 'Zelda'], ['Call of Duty', 'CoD'], ['Grand Theft Auto', 'GTA'],
    'Among Us', 'Roblox', ['The Sims', 'Sims'], 'Animal Crossing',
    ['Super Smash Bros', 'Smash Bros'], 'League of Legends', 'Overwatch', 'Halo',
    'Street Fighter', 'Space Invaders', 'Angry Birds', 'Candy Crush', 'Fall Guys',
    'Rocket League', 'Guitar Hero', 'Just Dance', 'Wii Sports', 'Skyrim', 'Elden Ring',
    'Fallout', 'Valorant', 'Counter-Strike', 'World of Warcraft', 'Stardew Valley',
    'Clash of Clans', 'Subway Surfers', 'Flappy Bird', 'Pong', 'Donkey Kong',
    'Mortal Kombat', 'Red Dead Redemption', 'The Last of Us', 'Geometry Dash', 'Terraria',
    ['Five Nights at Freddy\'s', 'FNAF'], 'Genshin Impact',
  ],
  'Fictional Characters': [
    'Batman', 'Superman', 'Spider-Man', 'Wonder Woman', 'Hulk', 'Iron Man',
    'Captain America', 'Darth Vader', 'Yoda', 'Harry Potter', 'Hermione', 'Gandalf', 'Frodo',
    'Gollum', 'Voldemort', 'Dumbledore', 'Shrek', 'SpongeBob', ['Mickey Mouse', 'Mickey'],
    'Bugs Bunny', ['Scooby-Doo', 'Scooby'], ['Homer Simpson', 'Homer'], 'Pikachu', 'Mario',
    'Sonic', 'Kirby', 'Elsa', 'Cinderella', 'Snow White', 'Pinocchio', 'Peter Pan',
    ['Winnie the Pooh', 'Pooh'], ['Sherlock Holmes', 'Sherlock'], 'Dracula', 'Frankenstein',
    ['James Bond', '007'], 'Indiana Jones', 'Jack Sparrow', 'Willy Wonka',
    ['Santa Claus', 'Santa'], 'Tarzan', 'Robin Hood', 'Captain Hook', 'Buzz Lightyear',
    'Simba', 'Nemo', 'Garfield', ['Kermit the Frog', 'Kermit'], 'Elmo', 'Cookie Monster',
    'Barbie', 'Godzilla', 'King Kong', 'Wolverine', 'Joker', 'Grinch', 'Optimus Prime',
    'Peppa Pig',
  ],
};

const ENTRIES = Object.fromEntries(
  Object.entries(WORDS).map(([category, entries]) => [
    category,
    entries.map((entry) => {
      const [word, ...aliases] = Array.isArray(entry) ? entry : [entry];
      return { word, aliases, category };
    }),
  ]),
);

export const CATEGORIES = Object.entries(ENTRIES).map(([name, entries]) => ({ name, count: entries.length }));

/**
 * Picks one of the given categories uniformly (so bigger categories don't come up more often),
 * then a word from it, avoiding words already used in this room until those categories run out.
 */
export function pickWord(usedWords, enabled = Object.keys(ENTRIES)) {
  const known = enabled.filter((c) => ENTRIES[c]);
  const unused = (category) => ENTRIES[category].filter(({ word }) => !usedWords.has(word));
  let categories = known.filter((c) => unused(c).length > 0);
  if (categories.length === 0) {
    for (const c of known) for (const { word } of ENTRIES[c]) usedWords.delete(word);
    categories = known;
  }
  const pool = unused(categories[randomInt(categories.length)]);
  return pool[randomInt(pool.length)];
}
