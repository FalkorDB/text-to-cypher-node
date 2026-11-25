/**
 * Live schema discovery tests.
 *
 * Skipped unless FALKORDB_TEST_URL (host:port of a FalkorDB instance) is set, e.g.
 * FALKORDB_TEST_URL=localhost:6379 npm test
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { createConnection } from 'node:net';
import { TextToCypher } from '../index';

/** Sends one command to FalkorDB over RESP; rejects on an error reply. Used to seed graphs. */
function falkordbCommand(url: string, args: string[]): Promise<string> {
  const [host, port] = url.split(':');
  const payload =
    `*${args.length}\r\n` + args.map((a) => `$${Buffer.byteLength(a)}\r\n${a}\r\n`).join('');
  return new Promise((resolve, reject) => {
    const socket = createConnection({ host, port: Number(port) }, () => socket.write(payload));
    socket.once('data', (data) => {
      socket.end();
      const reply = data.toString();
      if (reply.startsWith('-')) reject(new Error(reply.trim()));
      else resolve(reply);
    });
    socket.once('error', reject);
  });
}

interface DiscoveredSchema {
  entities: { label: string; attributes?: { name: string; type: string }[] }[];
  relations: { label: string; source: string; target: string }[];
}

const falkordbTestUrl = process.env.FALKORDB_TEST_URL;

describe.skipIf(!falkordbTestUrl)('discoverSchema (live FalkorDB)', () => {
  const url = falkordbTestUrl as string;
  const graph = `t2c_node_schema_${process.pid}`;

  async function discover(): Promise<DiscoveredSchema> {
    const client = new TextToCypher({
      model: 'gpt-4o-mini',
      apiKey: 'test-key',
      falkordbConnection: `falkor://${url}`,
    });
    return JSON.parse(await client.discoverSchema(graph));
  }

  beforeEach(async () => {
    await falkordbCommand(url, ['GRAPH.DELETE', graph]).catch(() => undefined);
  });

  it('reports temporal, duration, vector and point attribute types', async () => {
    await falkordbCommand(url, [
      'GRAPH.QUERY',
      graph,
      "CREATE (:Event {at: localdatetime('2024-01-02T03:04:05'), day: date('2024-01-02'), " +
        "t: localtime('03:04:05'), dur: duration('P1D'), emb: vecf32([1.0, 2.0]), " +
        'loc: point({latitude: 1, longitude: 2})})',
    ]);

    const schema = await discover();
    const event = schema.entities.find((e) => e.label === 'Event');
    const types = Object.fromEntries((event?.attributes ?? []).map((a) => [a.name, a.type]));

    expect(types).toEqual({
      at: 'DateTime',
      day: 'Date',
      t: 'Time',
      dur: 'Duration',
      emb: 'Vector',
      loc: 'Point',
    });
  });

  it('discovers labels and relationship types that need escaping', async () => {
    await falkordbCommand(url, [
      'GRAPH.QUERY',
      graph,
      "CREATE (:`Delivery Driver` {name: 'bob'})-[:`HANDLED BY` {since: 2020}]->(:`Pick-Up` {code: 'X'})",
    ]);

    const schema = await discover();

    expect(schema.entities.map((e) => e.label).sort()).toEqual(['Delivery Driver', 'Pick-Up']);
    expect(schema.relations).toEqual([
      expect.objectContaining({
        label: 'HANDLED BY',
        source: 'Delivery Driver',
        target: 'Pick-Up',
      }),
    ]);
  });
});
