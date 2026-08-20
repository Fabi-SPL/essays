# Reversed: GPT-4o transcription, replaced by self-hosted Whisper

> p95 first-token latency drifted from 600 ms to 1.4 seconds over three months, with no incident notice. Self-hosted Whisper large-v3 came back at 310 ms, 4.1% WER on German medical calls, and about 2.50 EUR per practice per month.

*28 May 2026 · 7 min read*

The first three Lina pilots shipped on the GPT-4o transcription API. It was the obvious default in late 2025. Three months in it came out, replaced by Whisper large-v3 on the Hetzner GPU box. Here is what actually broke, what the numbers looked like, and why "obvious default" lost.


 
## What shipped first

 
The original transcription path was: Telnyx audio in, 20 ms chunks streamed over WebSocket to the OpenAI realtime transcription endpoint, partials surfaced as they arrived, finals committed to the conversation log. End to end this was thirty lines of code. The German word error rate on test calls was about 4.5% headline. The medical vocabulary held up reasonably well. There was no diarisation to write, no model to host, no GPU to feed. For the first three pilots this was the entire point.

 
The cost was around 0.006 EUR per minute of audio. For a clinic averaging 90 minutes of call time a day that landed around 16 EUR per month per practice on transcription alone. Defensible against what the service charged.


 
## The signal that forced the reversal

 
Three things broke at roughly the same time, none of them catastrophic, all of them compounding.

 
**The latency tail got worse, not better.** Median first-token latency held at about 280 ms, which is fine. The p95 drifted from 600 ms in November to 1.4 seconds by mid-February with no public incident from OpenAI. A p95 over a second on a live phone call is audible silence. Callers start repeating themselves. That repetition then gets transcribed and confuses downstream logic.

 
**Pricing changed once and the math had to be re-modelled.** Not a huge jump, but enough that the unit economics on a scaled-out Essential tier stopped being obviously net-positive. That is margin exposure to a vendor outside the studio's control.

 
**The DSGVO conversation got harder, not easier.** Clinic data protection officers asked two questions that were hard to answer cleanly. Where exactly does the audio land for processing. What is the retention guarantee. OpenAI's enterprise terms cover both, but for a one-engineer studio routing audio for a German *Facharzt* through a US-headquartered provider, the conversation took 90 minutes instead of 15. Multiply that across a sales pipeline.


 
## What runs now

 
Whisper large-v3 on a single H100 on the Hetzner Falkenstein box. NeMo for streaming partials with a 200 ms chunk size. The same WebSocket interface to the rest of the stack so the downstream call graph did not change. Audio never leaves Germany. The retention answer is now *"the transcript is deleted at call end unless the practice opted into 30-day storage"* and the actual delete query is there to point at.

 
The numbers measured side by side over a two-week shadow run, same calls replayed against both pipelines:

 

 - WER on a 200-call German medical sample: 4.1% Whisper vs 4.5% GPT-4o. Whisper actually edged it on medical jargon because the decoder bias was fine-tuned on a small medical glossary.

 - p50 first-token: 140 ms Whisper vs 280 ms GPT-4o.

 - p95 first-token: 310 ms Whisper vs 1.4 s GPT-4o. The tail is the win.

 - Cost: ~2.50 EUR per practice per month in marginal GPU time at this load vs ~16 EUR. The H100 is already paid for by the Lucid workload; voice transcription rides along.

 


 
## Why this is not a "self-hosted is always better" essay

 
It is not. The reversal happened because three things lined up: the hardware was already there for unrelated reasons (Lucid's model training), the buyer was a German medical practice for whom data residency is not a feature but a contractual fact, and the call shape is narrow enough that fine-tuning the decoder bias on a glossary actually pays for itself.

 
For a US ecommerce chatbot serving English calls under no medical-secrecy regime, GPT-4o transcription is still the right default. The decision is not "which technology is better". It is "which path makes the next twelve conversations easier".


 
## The lesson

 
Convenience defaults are right until your domain catches up to you. The mistake was not shipping GPT-4o; the mistake was leaving it in place after the DSGVO conversations had said twice that it was costing deals. The signal was loud, and it took a louder one to force the move.

 
The standing rule from this reversal: if the same vendor question comes up in three procurement conversations in a row, the next architecture decision should remove the question, not answer it faster.

---

(c) 2026 Fabian Ilg. Licensed CC BY-NC-ND 4.0. Originally published at https://lucidailabs.com/essays-reversed-gpt4o-transcription
