const quotes = [
  "The secret of getting ahead is getting started. — Mark Twain",
  "Hard work beats talent when talent doesn't work hard. — Tim Notke",
  "Don't watch the clock; do what it does. Keep going. — Sam Levenson",
  "Success is the sum of small efforts repeated day in and day out. — R. Collier",
  "You don't have to be great to start, but you have to start to be great. — Zig Ziglar",
  "Push yourself, because no one else is going to do it for you.",
  "Great things never come from comfort zones.",
  "Dream it. Wish it. Do it.",
  "The harder you work for something, the greater you'll feel when you achieve it.",
  "Don't stop when you're tired. Stop when you're done.",
];

export function getRandomQuote(): string {
  return quotes[Math.floor(Math.random() * quotes.length)]
}