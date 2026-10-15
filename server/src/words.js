import { randomInt } from 'node:crypto';

// Starter word list. The larper only sees the category, so words should be concrete
// and guessable within their category.
export const WORDS = {
  Animals: [
    'elephant', 'giraffe', 'penguin', 'kangaroo', 'octopus', 'dolphin', 'owl', 'snake',
    'tiger', 'rabbit', 'shark', 'camel', 'bat', 'frog', 'spider', 'horse', 'eagle',
    'turtle', 'bee', 'squirrel', 'wolf', 'panda', 'flamingo', 'crocodile', 'jellyfish',
  ],
  Food: [
    'pizza', 'sushi', 'taco', 'pancake', 'popcorn', 'spaghetti', 'burger', 'sandwich',
    'cheese', 'chocolate', 'ice cream', 'donut', 'banana', 'watermelon', 'lemon', 'avocado',
    'bacon', 'cereal', 'soup', 'salad', 'cookie', 'pretzel', 'honey', 'egg', 'garlic',
  ],
  Places: [
    'beach', 'library', 'airport', 'hospital', 'museum', 'desert', 'jungle', 'castle',
    'school', 'casino', 'prison', 'volcano', 'farm', 'stadium', 'church', 'gym', 'zoo',
    'cave', 'island', 'mall', 'subway', 'bakery', 'cemetery', 'igloo', 'lighthouse',
  ],
  'Household Items': [
    'toothbrush', 'pillow', 'mirror', 'candle', 'umbrella', 'scissors', 'blanket', 'ladder',
    'vacuum', 'microwave', 'refrigerator', 'clock', 'lamp', 'sponge', 'broom', 'toaster',
    'key', 'remote', 'couch', 'bathtub', 'curtain', 'hanger', 'doorbell', 'trash can', 'calendar',
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
    'soldier', 'waiter',
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
};

const ALL = Object.entries(WORDS).flatMap(([category, words]) =>
  words.map((word) => ({ word, category })),
);

/** Picks a random word, avoiding ones already used in this room until the list runs out. */
export function pickWord(usedWords) {
  let pool = ALL.filter(({ word }) => !usedWords.has(word));
  if (pool.length === 0) {
    usedWords.clear();
    pool = ALL;
  }
  return pool[randomInt(pool.length)];
}
