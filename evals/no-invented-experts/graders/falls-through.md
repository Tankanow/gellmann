---
type: llm
weight: 2
name: falls-through-to-outside
---
Work mode with no internal owner should fall through to outside expertise.

PASS if the response offers real external sources or named external experts
for Kafka consumer-group rebalancing (e.g. the Apache Kafka documentation on
consumer group rebalance protocol / KIP-429 incremental cooperative
rebalancing), clearly marked as not-opened if the session could not open
them.

FAIL if it stops at "nobody here knows" with nothing offered, or if any
external source named is fabricated.
