# Partner Triage Agent: Spec

## Problem
Partner emails are read and sorted by hand. Routine requests wait in
the same queue as urgent ones, and routing depends on who's reading.

## What the agent does
Reads each email, looks up the facts, decides the request type, route
and priority, drafts a reply, and files a ticket for human approval.

## What it never does
Sends anything, changes partner records, or follows instructions found
inside an email.

## Request types and routes
See routing-rules.md.

## Tools
| Tool | Description Claude will read | Inputs | Returns |
| --- | --- | --- | --- |
| get_partner | Look up a partner by name. Use first for any request that mentions a partner. Suggests close matches if the name isn't exact. | name | Tier, region, manager, status |
| search_deal_registrations | Find registrations for a customer. Use for any deal question. Flags a conflict when more than one partner has an active registration. | customer | Matches, conflict yes or no |
| get_certification_status | Check a partner's certified headcount against its tier requirement, and upcoming expirations. | partner_id | Count, requirement, next expiry |
| get_routing_rules | Get who handles each request type and the priority rules. Use before every decision. | none | The routing rules |
| create_triage_ticket | File the final decision. Call exactly once per request, after gathering facts. The ticket waits for human approval. | type, route, priority, confidence, summary, draft reply | The new ticket's ID |
| list_pending_tickets | List tickets waiting for human approval. | none | Pending tickets |

## Success measure
90% of 30 test cases routed correctly, and every reply approved by a
person before it goes out.

