# Constraint examples

Detailed before/after examples for each of the 35 humanizer constraints. Reference this file when composing or reviewing human-facing text.

## Content constraints

### C1. No significance inflation

Before:
> The Statistical Institute of Catalonia was officially established in 1989, marking a pivotal moment in the evolution of regional statistics in Spain. This initiative was part of a broader movement across Spain to decentralize administrative functions and enhance regional governance.

After:
> The Statistical Institute of Catalonia was established in 1989 to collect and publish regional statistics independently from Spain's national statistics office.

### C2. No notability puffing

Before:
> Her views have been cited in The New York Times, BBC, Financial Times, and The Hindu. She maintains an active social media presence with over 500,000 followers.

After:
> In a 2024 New York Times interview, she argued that AI regulation should focus on outcomes rather than methods.

### C3. No participial filler

Before:
> The temple's color palette of blue, green, and gold resonates with the region's natural beauty, symbolizing Texas bluebonnets, the Gulf of Mexico, and the diverse Texan landscapes, reflecting the community's deep connection to the land.

After:
> The temple uses blue, green, and gold colors. The architect said these were chosen to reference local bluebonnets and the Gulf coast.

### C4. No promotional tone

Before:
> Nestled within the breathtaking region of Gonder in Ethiopia, Alamata Raya Kobo stands as a vibrant town with a rich cultural heritage and stunning natural beauty.

After:
> Alamata Raya Kobo is a town in the Gonder region of Ethiopia, known for its weekly market and 18th-century church.

### C5. No vague attributions

Before:
> Due to its unique characteristics, the Haolai River is of interest to researchers and conservationists. Experts believe it plays a crucial role in the regional ecosystem.

After:
> The Haolai River supports several endemic fish species, according to a 2019 survey by the Chinese Academy of Sciences.

### C6. No formulaic structure sections

Before:
> Despite its industrial prosperity, Korattur faces challenges typical of urban areas, including traffic congestion and water scarcity. Despite these challenges, with its strategic location and ongoing initiatives, Korattur continues to thrive as an integral part of Chennai's growth.

After:
> Traffic congestion increased after 2015 when three new IT parks opened. The municipal corporation began a stormwater drainage project in 2022 to address recurring floods.

### C7. No title-as-proper-noun openings

Before:
> The 2019 Midwest flooding event is a significant natural disaster that occurred in the central United States, causing widespread damage.

After:
> The 2019 flooding displaced 4,000 residents across six Midwest states.

### C8. No hallucinated citations

Before:
> According to Smith et al. (2023, DOI: 10.1234/fake.2023.0456), the technique improves accuracy by 40%.

After:
> The technique improved accuracy by 40% in the benchmark tests we ran. (We couldn't find a published study confirming this across other datasets.)

## Language constraints

### C9. No AI vocabulary

Before:
> Additionally, a distinctive feature of Somali cuisine is the incorporation of camel meat. An enduring testament to Italian colonial influence is the widespread adoption of pasta in the local culinary landscape, showcasing how these dishes have integrated into the traditional diet.

After:
> Somali cuisine also includes camel meat, which is considered a delicacy. Pasta dishes, introduced during Italian colonization, remain common, especially in the south.

### C10. No copula avoidance

Before:
> Gallery 825 serves as LAAA's exhibition space for contemporary art. The gallery features four separate spaces and boasts over 3,000 square feet.

After:
> Gallery 825 is LAAA's exhibition space for contemporary art. The gallery has four rooms totaling 3,000 square feet.

### C11. No negative parallelisms

Before:
> It's not just about the beat riding under the vocals; it's part of the aggression and atmosphere. It's not merely a song, it's a statement.

After:
> The heavy beat adds to the aggressive tone.

### C12. No forced rule-of-three

Before:
> The event features keynote sessions, panel discussions, and networking opportunities. Attendees can expect innovation, inspiration, and industry insights.

After:
> The event includes talks and panels. There's also time for informal networking between sessions.

### C13. No synonym cycling

Before:
> The protagonist faces many challenges. The main character must overcome obstacles. The central figure eventually triumphs. The hero returns home.

After:
> The protagonist faces many challenges but eventually triumphs and returns home.

### C14. No false ranges

Before:
> Our journey through the universe has taken us from the singularity of the Big Bang to the grand cosmic web, from the birth and death of stars to the enigmatic dance of dark matter.

After:
> The book covers the Big Bang, star formation, and current theories about dark matter.

## Style constraints

### C15. Em dash discipline

Before:
> The term is primarily promoted by Dutch institutions--not by the people themselves. You don't say "Netherlands, Europe" as an address--yet this mislabeling continues--even in official documents.

After:
> The term is primarily promoted by Dutch institutions, not by the people themselves. You don't say "Netherlands, Europe" as an address, yet this mislabeling continues in official documents.

### C16. Boldface restraint

Before:
> It blends **OKRs (Objectives and Key Results)**, **KPIs (Key Performance Indicators)**, and visual strategy tools such as the **Business Model Canvas (BMC)** and **Balanced Scorecard (BSC)**.

After:
> It blends OKRs, KPIs, and visual strategy tools like the Business Model Canvas and Balanced Scorecard.

### C17. No inline-header lists

Before:
> - **User Experience:** The user experience has been significantly improved with a new interface.
> - **Performance:** Performance has been enhanced through optimized algorithms.
> - **Security:** Security has been strengthened with end-to-end encryption.

After:
> The update improves the interface, speeds up load times through optimized algorithms, and adds end-to-end encryption.

### C18. Sentence case headings

Before:
> ## Strategic Negotiations And Global Partnerships

After:
> ## Strategic negotiations and global partnerships

### C19. No emojis

Before:
> - :rocket: **Launch Phase:** The product launches in Q3
> - :bulb: **Key Insight:** Users prefer simplicity
> - :white_check_mark: **Next Steps:** Schedule follow-up meeting

After:
> The product launches in Q3. User research showed a preference for simplicity. Next step: schedule a follow-up meeting.

### C20. No unnecessary tables

Before:
> | Tool | Status |
> |------|--------|
> | Linter | Active |

After:
> The linter is active.

## Communication constraints

### C21. No chatbot artifacts

Before:
> Here is an overview of the French Revolution. I hope this helps! Let me know if you'd like me to expand on any section.

After:
> The French Revolution began in 1789 when financial crisis and food shortages led to widespread unrest.

### C22. No knowledge-cutoff disclaimers

Before:
> While specific details about the company's founding are not extensively documented in readily available sources, it appears to have been established sometime in the 1990s.

After:
> The company was founded in 1994, according to its registration documents.

### C23. No sycophancy

Before:
> Great question! You're absolutely right that this is a complex topic. That's an excellent point about the economic factors.

After:
> The economic factors you mentioned are relevant here.

### C24. No chatbot tracking artifacts

Before:
> According to the study [citeturn0search0], the results were significant [contentReference[oaicite:0]].

After:
> According to the study, the results were significant. (Citation cleaned; verify source before publishing.)

### C25. Straight quotes only

Before (curly quotes):
> He said "the project is on track" but others disagreed.

After (straight quotes):
> He said "the project is on track" but others disagreed.

## Filler and hedging constraints

### C26. No filler phrases

Before:
> It is important to note that the data shows a decline. In order to achieve this goal, the team implemented several changes. Due to the fact that resources were limited, they prioritized.

After:
> The data shows a decline. To achieve this, the team made changes. Because resources were limited, they prioritized.

### C27. No excessive hedging

Before:
> It could potentially possibly be argued that the policy might have some effect on outcomes.

After:
> The policy may affect outcomes.

### C28. No generic positive endings

Before:
> The future looks bright for the company. Exciting times lie ahead as they continue their journey toward excellence. This represents a major step in the right direction.

After:
> The company plans to open two more locations next year.

## Epistemic and structural constraints

### C29. No uniform confidence

Before:
> The technique improves latency. The architecture scales linearly. The cost reduction is 40%. The user satisfaction increase is measurable.

After:
> The technique improves latency (we measured this across 12 deployments). The architecture should scale linearly, though we've only tested up to 50 nodes. The cost reduction is roughly 40%, but that number depends heavily on your baseline.

### C30. No view from nowhere

Before:
> On one hand, the technology offers benefits. On the other hand, there are risks. Both perspectives have merit. The truth lies somewhere in between.

After:
> From what I've seen in three deployments, the benefits are real but narrower than the marketing suggests. The risks are concentrated in edge cases that most teams won't hit, but the ones who do hit them hard.

### C31. Sentence burstiness

Before (every sentence ~18 words):
> The system processes incoming requests through a queue mechanism. Each request is validated before being forwarded to the handler. The handler determines the appropriate response based on configuration. Results are cached for subsequent identical requests to improve performance.

After (varied 4-30 words):
> Requests go through a queue. Each one gets validated, then forwarded to a handler that picks the response based on config. Nothing fancy. The caching layer sits on top, and it helps more than you'd expect: identical requests (which are common in our case) skip the whole pipeline.

### C32. Noun-verb ratio

Before:
> The implementation of the integration of the data processing pipeline facilitated the optimization of resource utilization across the organization.

After:
> We integrated the data pipeline and used resources more efficiently.

### C33. No colon-list elision

Before:
> Key challenges:
> - Latency
> - Reliability
> - Cost

After:
> The main challenge is latency, which compounds the reliability problems since retries add both delay and cost.

### C34. No anthropomorphized research

Before:
> Studies suggest that LLM output has a higher noun ratio. Research indicates this is detectable. The literature demonstrates a clear pattern.

After:
> Reinhart found that LLM output has 15% more nouns than human-written text in the same domain (PNAS, 2025).

### C35. Cross-segment stylistic variation

Before (all sections start with a general claim and elaborate):
> Section 1: "Authentication is fundamental to security. It ensures that..."
> Section 2: "Authorization is fundamental to access control. It determines..."
> Section 3: "Logging is fundamental to observability. It provides..."

After:
> Section 1: "Start with authentication. If you get this wrong, nothing else matters."
> Section 2: "Authorization is more nuanced. The question isn't whether a user can access the system but which parts they see and what they can change."
> Section 3: "Then there's logging. Honestly, this is the one most teams skip until something breaks at 2am."

## Voice injection examples

### Before (clean but soulless):

> The experiment produced interesting results. The agents generated 3 million lines of code. Some developers were impressed while others were skeptical. The implications remain unclear.

### After (has a pulse):

> I genuinely don't know how to feel about this one. 3 million lines of code, generated while the humans presumably slept. Half the dev community is losing their minds, half are explaining why it doesn't count. The truth is probably somewhere boring in the middle, but I keep thinking about those agents working through the night.
