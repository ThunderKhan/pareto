# Read-only disputed evidence review (AE-03)

proposeEvidenceReview is a narrowly scoped typed task for ONE disputed resume claim and a bounded owner-authorized excerpt. It never loads a private resume, queries the database, changes facts, confirms a search, or approves/rejects a candidate.

The caller must authenticate and load the excerpt using the existing owner-scoped server path. The task accepts field, value, excerpt (at most 1800 characters) and sends only that JSON to the configured Gemini/Groq gateway under task ID resume.evidence-review.v1.

The model returns verdict, quote, and reasonCode in a strict schema. An evidence quote must be an exact substring of the excerpt. Deterministic field-specific checking then corroborates the claim; if either test is uncertain or conflicts with the proposal, the result abstains as unknown. All responses require separate HUMAN REVIEW against the original source.

Unit tests verify supported and negated skills, Java vs JavaScript, fabricated quotes, false notice periods, and overlong inputs. This is not calibrated extraction accuracy, nor proof of live provider functionality. No public endpoint is exposed and no changes are persisted without the existing human review transaction.
