# Why confidence thresholds beat intent classifiers for medical voice agents

> This architecture escalates 8 to 12 percent of calls to a human. An intent-classifier-only architecture on the same call mix gets below 4 percent. That gap is what it costs not to book a chest-pain caller for next Tuesday.

*21 May 2026 · 8 min read*

Most production voice systems start with intent classification: parse the sentence, route to a handler. For a medical call this pattern silently breaks in the cases that matter most. Here is the architecture that replaced it, why it ends up safer, and the explicit trade-off you accept in exchange.


 
## The default architecture

 
If you read any "build your own voice agent" tutorial from the last three years, the first diagram is the same. Audio comes in, gets transcribed, the transcript gets handed to an intent classifier (a fine-tuned BERT, or just GPT with a list of labels), and the chosen intent routes to a handler. `book_appointment` goes to the calendar tool. `cancel_appointment` goes to the cancel flow. `question_about_services` goes to a RAG lookup. There is usually a fallback called something like `other` or `fallback` that asks the caller to repeat.

 
For most domains that architecture is fine. For a non-emergency line at a private medical practice it is not. The reason has nothing to do with how accurate the classifier is on the average call. It has to do with the distribution of failure modes when the classifier is wrong.


 
## The class of failure that matters

 
An intent classifier returns a label. Whatever it returns, the system acts on it. If a caller says *"ich habe seit gestern ziemlich starke Brustschmerzen, ich glaube ich brauche einen Termin"*, a reasonable classifier returns `book_appointment` with high confidence. That is the headline of the sentence. The model is not wrong in the linguistic sense. It is wrong in the medical sense.

 
Now the voice agent cheerfully offers next Tuesday at 14:30. The caller, in pain, accepts. The agent says goodbye. The hold-times metric improves, the after-hours-coverage metric improves, and the brand-perception metric improves. And a person with potential chest pain has been booked for next Tuesday instead of being told, now, *"please hang up and dial 112"*.

 
The classifier was confident. The classifier was confidently wrong. There is no `book_appointment_unless_emergency` intent for it to choose because the classifier does not know what an emergency looks like in any structured sense. And nothing in the architecture forces it to think about the question.


 
## What replaced it

 
The architecture in production is not a stack with numbered tiers, even though it is tempting to draw it that way. It is four mechanisms running in parallel on every utterance, each able to force an escalation to a human, none with the option to mute the others. They each catch a different class of mistake. They do not have to agree to fire.


### Hard triggers: the layer with teeth
 
A list of medical emergency phrases is matched against the live transcript with regex-level brittleness on purpose. *Brustschmerzen, Atemnot, Bewusstlosigkeit, starke Blutung, Herzinfarkt, Schlaganfall, Krampfanfall*, plus the obvious English equivalents and the obvious typos. When one of these is seen, the agent stops generating, plays a pre-recorded "Bitte legen Sie auf und wählen Sie 112" announcement, and hands over to the practice's emergency number if one is configured. The LLM does not run a single inference on the post-trigger transcript. The escalation is built into the speech pipeline, not into the model.

 
The trigger list is short and stupid on purpose. A long list with edge cases is a list that argues with itself. A short list with high recall on the cases that kill people is a list that does the job.


### The confidence threshold itself
 
The LLM that handles conversation returns log-probabilities for its top sampled token. Cumulative confidence over the response is normalised to a [0, 1] score. Default threshold: **0.75**. Below that, the agent hands the call to a human, with the transcript displayed and the inferred intent labelled *as a suggestion, not a decision*.

 
The threshold is configurable per clinic. Pediatric practices typically push it to 0.85 because the cost of the wrong handoff is asymmetric: a parent calling about a child with a fever is not the right person to wait through three minutes of an agent that wasn't sure. A high-volume cosmetic clinic might run it at 0.65; the failure cost of an over-eager handoff is just a slightly annoyed booking consultant.


### A separate intent kill-switch
 
Running in parallel to the main conversation model is a small intent classifier whose only job is to detect three things: *diagnosis-seeking, triage-seeking, treatment-recommendation-seeking*. Not "what does the caller want". Not "should this get booked". Specifically, "is this caller asking the agent to do something a doctor should do".

 
If the soft classifier returns confidence &ge; 0.7 on any of the three categories, the main model's medical-content response is suppressed at the generation layer and the call escalates. The caller might not even hear the half-finished response. The soft classifier is the kill switch for the conversation model's tendency to be helpful in ways that are illegal under the AI Act and the Heilkundevorbehalt of § 1 HeilprG.


### The system prompt as the polite floor
 
The conversation model itself runs with a system prompt that explicitly forbids diagnosis, triage, treatment advice, dosing information, drug interaction commentary, and any kind of medical opinion. It is instructed to repeat the identical phrase *"Diese Frage kann ich nicht beantworten. Ich verbinde Sie jetzt mit der Praxis."* when it detects that it has been asked one. Anti-hallucination guardrails prevent it from filling silence with confident-sounding medical content.

 
System prompts are the weakest of the four mechanisms because they can be overridden by clever callers, by prompt-injection through transcribed audio that contains adversarial content, or by the model just deciding it knows better. The system prompt does not stand alone. It is the polite version of the boundary that the hard-trigger list, the confidence threshold, and the intent kill-switch enforce with actual teeth.


 
## The trade-off you accept

 
This architecture over-escalates. There are calls that would have been fine to handle automatically that get handed to the human anyway. The all-up handoff rate in production is around 8 to 12% of calls; an intent-classifier-only architecture for the same call mix can get below 4%.

 
Twice the handoff rate is a price worth paying. The buyer accepts it too, because the buyer is a clinic owner, not an investor optimising for "AI deflection rate". For a clinic, the cost of a missed call deflected to voicemail is roughly zero (most callers redial within five minutes anyway). The cost of a missed emergency handoff is unbounded. The expected-value math is not close.

 
The interesting part is that German clinic owners *like* the high handoff rate when they understand what it costs them. It maps onto the way a good human receptionist behaves: if the call is even slightly off, escalate to the doctor on call. That is what they want their phone to feel like.


 
## Where this approach does not transfer

 
This architecture is the wrong choice for a customer-support line at an e-commerce brand. The base rate of "this needs a human" is too low and the cost of over-handoff is real (a paid support agent's time). An internal IT helpdesk fails the same test.

 
It transfers cleanly to: notarial offices (where a wrong intent could route a probate question to a real-estate handler and lose a client), tax advisors around the BFH-Urteile months, energy auditors when a caller is mid-grant-application. Anywhere the cost of a confidently-wrong response exceeds the cost of an over-cautious handoff, you want this stack.


 
## How to instrument it

 
Log which mechanism triggered the escalation, not just the fact of escalation. Over the first six weeks of a deployment that data tells you whether your hard-trigger list is too narrow (firing under 0.5% of escalations means you are relying too much on the confidence threshold), whether your confidence threshold is calibrated (firing on more than 30% of escalations means it is too high for the practice's risk appetite), or whether the intent kill-switch classifier needs retraining (firing on benign appointment requests means the classifier is hallucinating medical intent where there is none).

 
The metric that matters less than people think: *"AI deflection rate"*. The metric that matters more: *"handoffs the doctor agreed with"*. If the practice's back-channel feedback rate on escalations stays above 90% agreement, the system is calibrated. Below that, you are escalating noise.


 
## The shorter version

 
Intent classifiers route to a handler. Hand-off architectures route to a human. For a medical phone line, what you want is "route to a human when in doubt". Confidence thresholds combined with hard triggers and a soft kill-switch classifier give you that. Intent classification by itself does not.

 
There is a customer-facing version of this and a contractual version (AVV § 10.4). This essay is the engineering version: what one engineer would tell another who is about to build the wrong thing for the right reason.

---

(c) 2026 Fabian Ilg. Licensed CC BY-NC-ND 4.0. Canonical copy: https://github.com/Fabi-SPL/essays
