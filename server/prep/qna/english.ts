import type { PlacementMcq } from '../bank';
import { fromRows, generate, mcq, rng, type Row } from './builder';

const C = 'English' as const;

// [word, synonym]
const SYN: Array<[string, string]> = [
  ['Abundant', 'Plentiful'], ['Accurate', 'Correct'], ['Adequate', 'Sufficient'], ['Admire', 'Respect'], ['Affluent', 'Wealthy'],
  ['Alter', 'Change'], ['Ample', 'Enough'], ['Ancient', 'Old'], ['Anxious', 'Worried'], ['Assist', 'Help'],
  ['Authentic', 'Genuine'], ['Brave', 'Courageous'], ['Brief', 'Short'], ['Brilliant', 'Bright'], ['Calm', 'Peaceful'],
  ['Candid', 'Frank'], ['Cease', 'Stop'], ['Commence', 'Begin'], ['Competent', 'Capable'], ['Comprehend', 'Understand'],
  ['Conceal', 'Hide'], ['Concise', 'Brief'], ['Conserve', 'Preserve'], ['Courteous', 'Polite'], ['Crucial', 'Vital'],
  ['Curious', 'Inquisitive'], ['Defend', 'Protect'], ['Delicate', 'Fragile'], ['Diligent', 'Hardworking'], ['Distant', 'Far'],
  ['Durable', 'Long-lasting'], ['Eager', 'Keen'], ['Elegant', 'Graceful'], ['Eminent', 'Famous'], ['Enormous', 'Huge'],
  ['Evident', 'Obvious'], ['Exhausted', 'Tired'], ['Fatigue', 'Tiredness'], ['Feeble', 'Weak'], ['Fortunate', 'Lucky'],
  ['Frequent', 'Often'], ['Generous', 'Liberal'], ['Gigantic', 'Massive'], ['Hasty', 'Hurried'], ['Hazard', 'Danger'],
  ['Honest', 'Truthful'], ['Humble', 'Modest'], ['Immense', 'Vast'], ['Imitate', 'Copy'], ['Inquire', 'Ask'],
  ['Intelligent', 'Clever'], ['Jovial', 'Cheerful'], ['Keen', 'Eager'], ['Lament', 'Mourn'], ['Lethal', 'Deadly'],
  ['Loyal', 'Faithful'], ['Lucid', 'Clear'], ['Meagre', 'Scanty'], ['Mend', 'Repair'], ['Mighty', 'Powerful'],
  ['Mimic', 'Imitate'], ['Minute', 'Tiny'], ['Modify', 'Change'], ['Notion', 'Idea'], ['Novice', 'Beginner'],
  ['Obey', 'Follow'], ['Obstacle', 'Hurdle'], ['Obtain', 'Get'], ['Ponder', 'Think'], ['Precise', 'Exact'],
  ['Prohibit', 'Forbid'], ['Prompt', 'Quick'], ['Prosper', 'Flourish'], ['Purchase', 'Buy'], ['Quarrel', 'Fight'],
  ['Rapid', 'Fast'], ['Reluctant', 'Unwilling'], ['Remedy', 'Cure'], ['Renowned', 'Famous'], ['Reside', 'Live'],
  ['Robust', 'Strong'], ['Scarce', 'Rare'], ['Serene', 'Tranquil'], ['Shrewd', 'Clever'], ['Sincere', 'Honest'],
  ['Slender', 'Thin'], ['Solitary', 'Alone'], ['Spacious', 'Roomy'], ['Splendid', 'Magnificent'], ['Sturdy', 'Strong'],
  ['Summit', 'Peak'], ['Superb', 'Excellent'], ['Tedious', 'Boring'], ['Terminate', 'End'], ['Timid', 'Shy'],
  ['Trivial', 'Unimportant'], ['Vacant', 'Empty'], ['Vague', 'Unclear'], ['Valiant', 'Brave'], ['Vanish', 'Disappear'],
  ['Victory', 'Triumph'], ['Vigilant', 'Watchful'], ['Wealth', 'Riches'], ['Wicked', 'Evil'], ['Zeal', 'Enthusiasm'],
];

// [word, antonym]
const ANT: Array<[string, string]> = [
  ['Accept', 'Reject'], ['Active', 'Passive'], ['Advance', 'Retreat'], ['Ancient', 'Modern'], ['Arrival', 'Departure'],
  ['Artificial', 'Natural'], ['Ascend', 'Descend'], ['Attack', 'Defend'], ['Barren', 'Fertile'], ['Begin', 'End'],
  ['Bold', 'Timid'], ['Bitter', 'Sweet'], ['Brave', 'Cowardly'], ['Broad', 'Narrow'], ['Cheap', 'Expensive'],
  ['Clever', 'Foolish'], ['Comfort', 'Discomfort'], ['Conceal', 'Reveal'], ['Construct', 'Destroy'], ['Cruel', 'Kind'],
  ['Deep', 'Shallow'], ['Defeat', 'Victory'], ['Dense', 'Sparse'], ['Diligent', 'Lazy'], ['Divide', 'Unite'],
  ['Domestic', 'Foreign'], ['Early', 'Late'], ['Employ', 'Dismiss'], ['Encourage', 'Discourage'], ['Entrance', 'Exit'],
  ['Expand', 'Contract'], ['Export', 'Import'], ['External', 'Internal'], ['Famous', 'Unknown'], ['Fertile', 'Sterile'],
  ['Forget', 'Remember'], ['Frequent', 'Rare'], ['Generous', 'Stingy'], ['Guilty', 'Innocent'], ['Harmony', 'Discord'],
  ['Healthy', 'Sick'], ['Honest', 'Dishonest'], ['Humble', 'Arrogant'], ['Increase', 'Decrease'], ['Inferior', 'Superior'],
  ['Joy', 'Sorrow'], ['Junior', 'Senior'], ['Knowledge', 'Ignorance'], ['Lend', 'Borrow'], ['Liberty', 'Slavery'],
  ['Loss', 'Profit'], ['Loyal', 'Disloyal'], ['Major', 'Minor'], ['Maximum', 'Minimum'], ['Merit', 'Demerit'],
  ['Natural', 'Artificial'], ['Optimist', 'Pessimist'], ['Order', 'Chaos'], ['Permanent', 'Temporary'], ['Polite', 'Rude'],
  ['Poverty', 'Prosperity'], ['Praise', 'Criticise'], ['Private', 'Public'], ['Punish', 'Reward'], ['Quick', 'Slow'],
  ['Rough', 'Smooth'], ['Rural', 'Urban'], ['Scarcity', 'Abundance'], ['Shrink', 'Expand'], ['Simple', 'Complex'],
  ['Strong', 'Weak'], ['Success', 'Failure'], ['Sunrise', 'Sunset'], ['Tame', 'Wild'], ['Thick', 'Thin'],
  ['Tidy', 'Messy'], ['Transparent', 'Opaque'], ['Victory', 'Defeat'], ['Visible', 'Invisible'], ['Wisdom', 'Folly'],
  ['Accurate', 'Inaccurate'], ['Agree', 'Disagree'], ['Approve', 'Disapprove'], ['Bright', 'Dull'], ['Calm', 'Agitated'],
  ['Careful', 'Careless'], ['Certain', 'Doubtful'], ['Create', 'Destroy'], ['Dark', 'Light'], ['Easy', 'Difficult'],
  ['Empty', 'Full'], ['Freedom', 'Captivity'], ['Gain', 'Lose'], ['Hope', 'Despair'], ['Include', 'Exclude'],
  ['Majority', 'Minority'], ['Positive', 'Negative'], ['Accept', 'Refuse'], ['Obey', 'Disobey'], ['Ordinary', 'Extraordinary'],
];

const GRAMMAR: Row[] = [
  ['She ___ to college every day.', 'goes', 'go', 'going', 'gone'],
  ['They ___ playing cricket now.', 'are', 'is', 'was', 'be'],
  ['I have lived here ___ 2020.', 'since', 'for', 'from', 'by'],
  ['He has been working ___ five hours.', 'for', 'since', 'from', 'at'],
  ['___ honest man is respected.', 'An', 'A', 'The', 'No article'],
  ['She is ___ university student.', 'a', 'an', 'the', 'no article'],
  ['The book is ___ the table.', 'on', 'in', 'at', 'into'],
  ['He is good ___ mathematics.', 'at', 'in', 'on', 'with'],
  ['We reached the station ___ time.', 'in', 'on', 'at', 'by'],
  ['If I ___ rich, I would buy a car.', 'were', 'am', 'was being', 'be'],
  ['Neither the teacher nor the students ___ present.', 'were', 'was', 'is', 'has'],
  ['Each of the boys ___ a prize.', 'gets', 'get', 'are getting', 'have got'],
  ['The news ___ very good.', 'is', 'are', 'were', 'have'],
  ['She sings ___ than her sister.', 'better', 'good', 'best', 'more good'],
  ['This is the ___ building in the city.', 'tallest', 'taller', 'tall', 'most tall'],
  ['He did not come, ___ he?', 'did', 'didn\'t', 'does', 'was'],
  ['You are coming, ___ you?', 'aren\'t', 'are', 'don\'t', 'weren\'t'],
  ['I look forward to ___ you.', 'meeting', 'meet', 'met', 'be meeting'],
  ['She is interested ___ painting.', 'in', 'on', 'at', 'for'],
  ['He apologised ___ being late.', 'for', 'of', 'to', 'on'],
  ['The train ___ before we reached the station.', 'had left', 'has left', 'left', 'leaves'],
  ['By next year, I ___ my diploma.', 'will have completed', 'completed', 'have completed', 'complete'],
  ['Please submit the form ___ Monday.', 'by', 'since', 'for', 'until'],
  ['He prefers tea ___ coffee.', 'to', 'than', 'over', 'from'],
  ['The committee ___ divided in their opinions.', 'were', 'was', 'is', 'has'],
  ['Choose the correct passive: "They built the bridge."', 'The bridge was built by them.', 'The bridge is built by them.', 'The bridge has built by them.', 'The bridge built by them.'],
  ['Choose the correct passive: "She writes a letter."', 'A letter is written by her.', 'A letter was written by her.', 'A letter has written by her.', 'A letter written by her.'],
  ['Indirect speech: He said, "I am tired."', 'He said that he was tired.', 'He said that I am tired.', 'He said that he is tired.', 'He says he was tired.'],
  ['Indirect speech: She said, "I will come tomorrow."', 'She said that she would come the next day.', 'She said that she will come tomorrow.', 'She said she comes tomorrow.', 'She told that I will come.'],
  ['Choose the correctly punctuated sentence.', 'However, the results were good.', 'However the results, were good.', 'However the results were, good.', 'However; the results were good.'],
  ['Plural of "criterion" is', 'criteria', 'criterions', 'criterias', 'criteriones'],
  ['Plural of "analysis" is', 'analyses', 'analysises', 'analysis', 'analysi'],
  ['Choose the correct sentence.', 'My friend and I went home.', 'Me and my friend went home.', 'Myself and friend went home.', 'Me and I went home.'],
  ['Choose the correct sentence.', 'One of my friends is an engineer.', 'One of my friend is an engineer.', 'One of my friends are an engineer.', 'One of my friend are engineer.'],
  ['He ___ his homework yet.', 'hasn\'t finished', 'didn\'t finished', 'not finished', 'hasn\'t finish'],
  ['The sun ___ in the east.', 'rises', 'rose', 'is rising always', 'rise'],
  ['I ___ him yesterday.', 'met', 'have met', 'meet', 'had meet'],
  ['She has ___ her keys.', 'lost', 'lose', 'losed', 'loosed'],
  ['There ___ many students in the hall.', 'were', 'was', 'is', 'has'],
  ['He is senior ___ me.', 'to', 'than', 'from', 'over'],
  ['The meeting was called ___ due to rain.', 'off', 'up', 'on', 'out'],
  ['Please fill ___ this form.', 'in', 'at', 'to', 'with'],
  ['We must look ___ the problem carefully.', 'into', 'after', 'for', 'up'],
  ['She takes ___ her mother.', 'after', 'up', 'off', 'in'],
  ['The fire was put ___ quickly.', 'out', 'off', 'up', 'down'],
  ['Can you pick me ___ at 5 pm?', 'up', 'on', 'off', 'in'],
  ['Choose the correct spelling of the sentence: "I ___ your advice."', 'accept', 'except', 'expect', 'aspect'],
  ['"Their / There / They\'re": ___ going to the market.', 'They\'re', 'Their', 'There', 'Theyre'],
  ['"Its / It\'s": ___ raining today.', 'It\'s', 'Its', 'Its\'', 'It is\''],
  ['"Affect / Effect": The new rule will ___ all students.', 'affect', 'effect', 'effort', 'afect'],
];

const ONE_WORD: Row[] = [
  ['One who knows many languages', 'Polyglot', 'Linguist', 'Bilingual', 'Translator'],
  ['A person who does not believe in God', 'Atheist', 'Theist', 'Pagan', 'Agnostic'],
  ['Government by the people', 'Democracy', 'Monarchy', 'Autocracy', 'Oligarchy'],
  ['A place where birds are kept', 'Aviary', 'Apiary', 'Aquarium', 'Kennel'],
  ['A place where bees are kept', 'Apiary', 'Aviary', 'Nursery', 'Hive house'],
  ['One who can use both hands equally well', 'Ambidextrous', 'Ambiguous', 'Ambivalent', 'Amphibious'],
  ['A speech made without preparation', 'Extempore', 'Rehearsed', 'Lecture', 'Sermon'],
  ['Fear of heights', 'Acrophobia', 'Claustrophobia', 'Hydrophobia', 'Xenophobia'],
  ['Fear of closed spaces', 'Claustrophobia', 'Acrophobia', 'Agoraphobia', 'Nyctophobia'],
  ['A person who looks on the bright side', 'Optimist', 'Pessimist', 'Realist', 'Fatalist'],
  ['That which cannot be read', 'Illegible', 'Eligible', 'Invisible', 'Indelible'],
  ['That which cannot be seen', 'Invisible', 'Illegible', 'Inaudible', 'Infallible'],
  ['That which cannot be heard', 'Inaudible', 'Invisible', 'Inedible', 'Indelible'],
  ['That which cannot be eaten', 'Inedible', 'Inaudible', 'Insoluble', 'Ineligible'],
  ['A life history written by oneself', 'Autobiography', 'Biography', 'Memoir by others', 'Diary'],
  ['A medicine that kills germs', 'Antiseptic', 'Antidote', 'Antibody', 'Anaesthetic'],
  ['One who leaves his country to settle in another', 'Emigrant', 'Immigrant', 'Refugee', 'Tourist'],
  ['A person who comes into a country to live', 'Immigrant', 'Emigrant', 'Native', 'Alien'],
  ['Killing of a human being', 'Homicide', 'Suicide', 'Genocide', 'Patricide'],
  ['A list of items to be discussed at a meeting', 'Agenda', 'Minutes', 'Memo', 'Notice'],
  ['A written record of a meeting', 'Minutes', 'Agenda', 'Summary', 'Report card'],
  ['One who works without payment', 'Volunteer', 'Mercenary', 'Employee', 'Amateur'],
  ['A period of ten years', 'Decade', 'Century', 'Millennium', 'Score'],
  ['A period of hundred years', 'Century', 'Decade', 'Millennium', 'Jubilee'],
  ['Animals that eat only plants', 'Herbivores', 'Carnivores', 'Omnivores', 'Insectivores'],
  ['Animals that eat flesh', 'Carnivores', 'Herbivores', 'Omnivores', 'Frugivores'],
  ['A person who is new to a job', 'Novice', 'Veteran', 'Expert', 'Master'],
  ['A person with long experience', 'Veteran', 'Novice', 'Amateur', 'Rookie'],
  ['Something that happens every year', 'Annual', 'Biennial', 'Perennial', 'Monthly'],
  ['Something that happens every two years', 'Biennial', 'Annual', 'Biannual', 'Triennial'],
  ['A building where dead bodies are kept', 'Mortuary', 'Cemetery', 'Crematorium', 'Sanatorium'],
  ['A person who repairs shoes', 'Cobbler', 'Tailor', 'Carpenter', 'Smith'],
  ['One who studies stars and planets', 'Astronomer', 'Astrologer', 'Geologist', 'Botanist'],
  ['One who studies rocks', 'Geologist', 'Biologist', 'Astronomer', 'Zoologist'],
  ['A word with the same meaning as another', 'Synonym', 'Antonym', 'Homonym', 'Acronym'],
  ['A word with the opposite meaning', 'Antonym', 'Synonym', 'Homonym', 'Pseudonym'],
  ['A false name used by an author', 'Pseudonym', 'Synonym', 'Acronym', 'Nickname only'],
  ['Words formed from first letters, e.g. NASA', 'Acronym', 'Antonym', 'Homonym', 'Synonym'],
  ['Rule by a single person with total power', 'Autocracy', 'Democracy', 'Bureaucracy', 'Anarchy'],
  ['Absence of government', 'Anarchy', 'Monarchy', 'Democracy', 'Oligarchy'],
];

const IDIOMS: Row[] = [
  ['Meaning of "A piece of cake"', 'Very easy', 'A sweet dish', 'A small gift', 'Very costly'],
  ['Meaning of "Break the ice"', 'Start a conversation', 'Break something', 'Feel cold', 'End a friendship'],
  ['Meaning of "Hit the nail on the head"', 'Be exactly right', 'Hurt someone', 'Do carpentry', 'Make a mistake'],
  ['Meaning of "Once in a blue moon"', 'Very rarely', 'Every month', 'At night', 'Very often'],
  ['Meaning of "Burn the midnight oil"', 'Work late into the night', 'Waste fuel', 'Cook food', 'Sleep early'],
  ['Meaning of "Cost an arm and a leg"', 'Very expensive', 'Very cheap', 'Cause injury', 'Be free'],
  ['Meaning of "Spill the beans"', 'Reveal a secret', 'Waste food', 'Cook badly', 'Clean the floor'],
  ['Meaning of "Under the weather"', 'Feeling ill', 'Outside in rain', 'Very happy', 'Travelling'],
  ['Meaning of "Bite the bullet"', 'Face a hard situation bravely', 'Eat quickly', 'Be shot', 'Avoid work'],
  ['Meaning of "Call it a day"', 'Stop working', 'Name a day', 'Start a job', 'Celebrate'],
  ['Meaning of "Get the ball rolling"', 'Start something', 'Play football', 'Stop a game', 'Lose control'],
  ['Meaning of "In hot water"', 'In trouble', 'Taking a bath', 'Very angry', 'In comfort'],
  ['Meaning of "Keep an eye on"', 'Watch carefully', 'Close eyes', 'Ignore', 'Look away'],
  ['Meaning of "Let the cat out of the bag"', 'Reveal a secret', 'Free an animal', 'Go shopping', 'Lose something'],
  ['Meaning of "On cloud nine"', 'Extremely happy', 'Flying', 'Confused', 'Very sad'],
  ['Meaning of "Pull someone\'s leg"', 'Joke with someone', 'Hurt someone', 'Help walk', 'Insult'],
  ['Meaning of "The ball is in your court"', 'It is your decision now', 'You must play', 'You lost', 'You are late'],
  ['Meaning of "Back to square one"', 'Start again from the beginning', 'Go home', 'Win', 'Move forward'],
  ['Meaning of "Beat around the bush"', 'Avoid the main topic', 'Garden work', 'Hunt animals', 'Speak directly'],
  ['Meaning of "Easier said than done"', 'Harder to do than to talk about', 'Very easy', 'Already done', 'Not possible to say'],
  ['Meaning of "Hard nut to crack"', 'A difficult problem or person', 'A dry fruit', 'A strong tool', 'An easy task'],
  ['Meaning of "Learn the ropes"', 'Learn the basics of a job', 'Learn climbing', 'Tie knots', 'Quit a job'],
  ['Meaning of "Miss the boat"', 'Lose an opportunity', 'Reach late at a river', 'Go fishing', 'Win a prize'],
  ['Meaning of "Out of the blue"', 'Unexpectedly', 'From the sky', 'Sadly', 'Regularly'],
  ['Meaning of "Rule of thumb"', 'A practical general rule', 'A law', 'A finger exercise', 'An exact formula'],
  ['Meaning of "Up to the mark"', 'Of the required standard', 'Above the line', 'Very late', 'Below average'],
  ['Meaning of "At the eleventh hour"', 'At the last moment', 'At 11 o\'clock', 'Very early', 'Never'],
  ['Meaning of "Bear the brunt"', 'Suffer the main impact', 'Carry a bear', 'Run away', 'Enjoy success'],
  ['Meaning of "By leaps and bounds"', 'Very rapidly', 'By jumping', 'Slowly', 'With difficulty'],
  ['Meaning of "Turn over a new leaf"', 'Start behaving better', 'Read a book', 'Plant a tree', 'Change pages'],
];

const SPELL = ['Accommodation', 'Achievement', 'Acknowledge', 'Address', 'Apparent', 'Argument', 'Beginning', 'Believe', 'Business', 'Calendar', 'Category', 'Colleague', 'Committee', 'Conscious', 'Definitely', 'Development', 'Different', 'Embarrass', 'Environment', 'Equipment', 'Especially', 'Exaggerate', 'Existence', 'Experience', 'Foreign', 'Government', 'Grammar', 'Guarantee', 'Harass', 'Immediately', 'Independent', 'Knowledge', 'Library', 'Maintenance', 'Millennium', 'Necessary', 'Noticeable', 'Occasion', 'Occurrence', 'Opportunity', 'Parliament', 'Possession', 'Privilege', 'Pronunciation', 'Questionnaire', 'Receive', 'Recommend', 'Reference', 'Relevant', 'Restaurant', 'Rhythm', 'Schedule', 'Separate', 'Successful', 'Supersede', 'Technique', 'Tomorrow', 'Until', 'Vacuum', 'Wednesday'];

function misspell(w: string, k: number): string {
  const lower = w.toLowerCase();
  const ops = [
    () => lower.replace(/(.)\1/, '$1'), // drop a double letter
    () => {
      const i = 2 + (k % Math.max(1, lower.length - 4));
      return lower.slice(0, i) + lower[i + 1] + lower[i] + lower.slice(i + 2);
    },
    () => lower.replace(/([^aeiou])([aeiou])/, '$1$1$2'), // double a consonant
    () => (lower.includes('ie') ? lower.replace('ie', 'ei') : lower.replace('ei', 'ie')),
    () => lower.replace(/e([^e]*)$/, 'a$1'),
    () => lower.replace(/a/, 'e'),
  ];
  const out = ops[k % ops.length]();
  return out.charAt(0).toUpperCase() + out.slice(1);
}

// Words linked (via any pair) to the question word or its answer are never used as wrong options,
// so a distractor can't accidentally also be right.
const LINKS = new Map<string, Set<string>>();
for (const [a, b] of [...SYN, ...ANT]) {
  if (!LINKS.has(a)) LINKS.set(a, new Set());
  if (!LINKS.has(b)) LINKS.set(b, new Set());
  LINKS.get(a)!.add(b);
  LINKS.get(b)!.add(a);
}
const near = (x: string) => {
  const out = new Set<string>([x]);
  for (const y of LINKS.get(x) ?? []) {
    out.add(y);
    for (const z of LINKS.get(y) ?? []) out.add(z);
  }
  return out;
};
const safe = (cand: string, word: string, answer: string) => !near(word).has(cand) && !near(answer).has(cand);

export const ENGLISH_QUESTIONS: PlacementMcq[] = [
  ...(() => {
    const r = rng(301);
    return SYN.map(([w, s], i) => {
      const ant = ANT.find(([x]) => x === w)?.[1];
      const pool = r.shuffle(ANT.map(([, y]) => y)).filter(y => safe(y, w, s));
      return mcq(r, `eng-syn-${String(i + 1).padStart(4, '0')}`, C, `Synonym of "${w}"`, s, [...(ant ? [ant] : []), ...pool].slice(0, 3), `"${w}" means "${s}".`);
    }).filter((x): x is PlacementMcq => !!x);
  })(),
  ...(() => {
    const r = rng(302);
    return ANT.map(([w, a], i) => {
      const syn = SYN.find(([x]) => x === w)?.[1];
      const pool = r.shuffle(SYN.map(([, y]) => y)).filter(y => safe(y, w, a));
      return mcq(r, `eng-ant-${String(i + 1).padStart(4, '0')}`, C, `Antonym of "${w}"`, a, [...(syn ? [syn] : []), ...pool].slice(0, 3), `Opposite of "${w}" is "${a}".`);
    }).filter((x): x is PlacementMcq => !!x);
  })(),
  ...fromRows('eng-gram', 303, C, GRAMMAR),
  ...fromRows('eng-one', 304, C, ONE_WORD),
  ...fromRows('eng-idiom', 305, C, IDIOMS),
  ...generate('eng-spell', 306, SPELL.length, (r, id, i) => {
    const w = SPELL[i % SPELL.length];
    const wrong = [1, 2, 3, 4, 5, 0].map(k => misspell(w, k + i)).filter(x => x.toLowerCase() !== w.toLowerCase());
    return mcq(r, id, C, `Choose the correctly spelt word (${i + 1})`, w, wrong, `Correct spelling: ${w}`);
  }),
];
