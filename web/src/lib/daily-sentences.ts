/**
 * Two short sentences to copy-type for the daily check-in.
 *
 * Everyone gets the same pair on a given calendar day, and it changes each morning.
 * Each pair ends its first sentence with a period, so the sentence-pause feature always
 * has a sample, and sticks to plain words, commas and periods so typing speed reflects
 * rhythm rather than hunting for symbols.
 */
export const DAILY_SENTENCES: readonly string[] = [
  'The morning light comes in slowly through the window. I take a breath and start the day at my own pace.',
  'A warm cup of tea sits beside the keyboard. The list for today is short, and that is fine.',
  'The hallway is quiet before the first round begins. I check my notes and feel ready for the shift.',
  'Rain taps softly on the roof of the car park. Inside, the lights are on and the coffee is fresh.',
  'I slept a little better than I did last week. My shoulders feel loose and my hands are steady.',
  'The team meets for a quick hello at the desk. We share the plan and then go our separate ways.',
  'A small bird lands on the ledge outside. It looks around for a moment and then flies away.',
  'The city is still waking up on the walk in. Buses hum past and the air smells like bread.',
  'I packed a good lunch and a bottle of water. Today I will try to take my breaks on time.',
  'The first patient of the day is calm and kind. We talk about the weather while I check the chart.',
  'Clouds drift over the hills in long grey lines. The sun breaks through just as I park the car.',
  'My shoes are comfortable and my badge is clipped on. I walk through the doors with a clear head.',
  'There is a new plant on the nurses station today. Someone gave it water and a little card.',
  'The train was on time for once this morning. I read a few pages of my book on the way.',
  'I wrote three simple goals on a sticky note. If I finish two of them, it will be a good day.',
  'The kettle clicks off in the staff room. Someone has left a box of biscuits to share.',
  'Frost covers the grass along the path outside. My breath makes small clouds in the cold air.',
  'A friend sent a kind message before work. It made me smile all the way up the stairs.',
  'The ward is busy, but the plan is clear. We will take it one task at a time.',
  'I stretched for five minutes before leaving home. My back feels better than it did yesterday.',
  'The window by the lift looks over the park. Two dogs are running in circles on the wet grass.',
  'Today starts with a short meeting and a long walk. I have my water and my notes ready.',
  'The radio played an old song in the car. I hummed along and forgot about the traffic.',
  'A new week brings a fresh page in my diary. I have room to plan and room to rest.',
  'The sun is low and bright over the rooftops. It feels like a good day to be patient.',
  'My colleague brought in fruit for the whole team. The oranges are sweet and very cold.',
  'I made the bed and opened the curtains early. The room looked calm when I left the house.',
  'The lift was full, so I took the stairs instead. By the third floor I felt fully awake.',
  'Soft music plays in the waiting room downstairs. The first families are already settling in.',
  'I will speak slowly and listen with care today. Small moments of kindness add up over a shift.',
];

/** Days since the Unix epoch in the user's local time zone, so the pair flips at local midnight. */
export function localDayNumber(date = new Date()): number {
  return Math.floor((date.getTime() - date.getTimezoneOffset() * 60_000) / 86_400_000);
}

/** Today's pair of sentences. Stable for the whole local day, different tomorrow. */
export function sentencesFor(date = new Date()): string {
  const n = DAILY_SENTENCES.length;
  // A fixed stride walks the list in a scrambled order so neighbouring days feel different.
  return DAILY_SENTENCES[(((localDayNumber(date) * 7) % n) + n) % n];
}
