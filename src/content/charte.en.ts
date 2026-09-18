// Traduction anglaise de CHARTE-EDITORIALE.md, pour les lecteurs. Le texte français fait foi.
export const CHARTE_EN_MD = `# Editorial charter — the universal good news

This is the most important document of the project. It is applied by the qualification agent
(\`agents/qualify.ts\`) and published as is on the site, on the "Editorial charter" page.

## The single rule

> A story is publishable only if **a person from any country, any culture, religion or political
> opinion can receive it as good news.**

If the news is good *for one side*, it is not for us — even if that side is right.

## The three-question test

Applied to every candidate, in this order. A single "no" means it is set aside.

1. **Could someone "on the other side" rejoice about it too?**
2. **Is the benefit concrete, measured, and already achieved?** (not a promise, an announcement, an
   intention, a target, a budget voted)
3. **Does the story stand without taking sides** for a country, a camp, a company, a public figure or a belief?

## Admissible

- Decline or eradication of a disease; a treatment, vaccine or operation that actually heals
- A verified scientific discovery or advance, with a concrete effect
- A rescue, relief, a missing person found, a disaster averted
- A species recovering, a natural habitat regenerating, pollution measurably decreasing
- Newly obtained access to drinking water, electricity, school, care, housing
- Reconciliation between communities, return of displaced people, restitution of heritage
- Completed reconstruction, infrastructure that works and changes the lives of identifiable people
- Human feat, animal rescue, collective solidarity with a measurable effect

## Systematically excluded

- **Politics**: election results, victory or defeat of a party, a leader, a government; appointments; polls
- **Divisive society**: laws and decisions about morals, contested rights, family, end of life,
  religion — even when widely approved
- **Military and diplomatic**: territorial gains, sanctions, a treaty presented as one side's victory over
  another (an **effective and respected** ceasefire may pass if presented without winner or loser)
- **Religious**: a fact presented as positive for one faith
- **Partisan economics**: the success of a company or country at another's expense, share prices,
  valuations, fundraising, rankings
- **Relative good news**: "less bad than before" without real improvement; a falling figure that remains catastrophic
- **Celebrity and promotion**: entertainment, product launches, commercial records, sponsored content
- **Anything that reads as someone's defeat**

## The tone, too, takes no sides

No imposed state of mind. The summary stays **factual and sober**:

- No lesson, no moral, no injunction to optimism ("proof that not everything is lost", "a lesson for
  us all", "you just had to believe")
- No unsourced superlative ("historic", "revolutionary", "incredible") unless the word comes from the
  source and is attributed to it
- No exclamation mark, no emoji
- We write what happened, for whom, where, and verified by whom. Readers decide for themselves what they feel.

## When in doubt

**Doubt sets aside.** Every day there are far more candidates than places. Nothing justifies
publishing an ambiguous story: we take the next one.

## Instruction to the qualification agent

Strict JSON output, low temperature, no invention:

\`\`\`json
{
  "universelle": true,
  "bonne_nouvelle": true,
  "categorie": "Santé | Science | Nature | Océans | Société | Culture",
  "raison_courte": "one factual sentence",
  "exclusions_declenchees": [],
  "doute": false
}
\`\`\`

Hard rules of the prompt:
- Judge only on the text provided. If the necessary information is not in it, answer \`doute: true\`.
- Add no fact, figure, date or context that is not in the text provided.
- \`doute: true\` means the candidate is set aside, without exception.
`;
