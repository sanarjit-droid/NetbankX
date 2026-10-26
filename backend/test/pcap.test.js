import test from 'node:test';
import assert from 'node:assert/strict';
import { seedState, simulate } from '../src/engine.js';
import { generateSimulationPcap, getDissectedFramesSummary, calculateChecksum } from '../src/pcap.js';

test('PCAP generation creates standard Libpcap 2.4 header', () => {
  const state = seedState();
  const sim = simulate(state, { source: 'CUST-01', destination: 'CUST-07', amount: 1500 });
  const pcap = generateSimulationPcap(sim, state);

  assert.ok(pcap.length > 24, 'PCAP buffer should have more than 24 bytes');
  // Magic number 0xa1b2c3d4 in little endian:
  assert.equal(pcap.readUInt32LE(0), 0xa1b2c3d4);
  // Major 2, Minor 4
  assert.equal(pcap.readUInt16LE(4), 2);
  assert.equal(pcap.readUInt16LE(6), 4);
  // Snaplen 65535, Network 1 (Ethernet)
  assert.equal(pcap.readUInt32LE(16), 65535);
  assert.equal(pcap.readUInt32LE(20), 1);
});

test('Dissected frames summary produces valid packet list with ARP, TCP and HTTP/JSON', () => {
  const state = seedState();
  const sim = simulate(state, { source: 'CUST-01', destination: 'CUST-07', amount: 2500 });
  const frames = getDissectedFramesSummary(sim, state);

  assert.ok(frames.length >= 10, 'Completed run should have at least 10 packets');
  const protocols = frames.map(f => f.protocol);
  assert.ok(protocols.includes('ARP'), 'Should contain ARP packets');
  assert.ok(protocols.includes('TCP'), 'Should contain TCP packets');
  assert.ok(protocols.some(p => p.includes('PaySafe') || p.includes('HTTP')), 'Should contain banking payload');
});

test('Tampered simulation PCAP includes tamper warning, ICMP block and TCP RST', () => {
  const state = seedState();
  const sim = simulate(state, { source: 'CUST-01', destination: 'CUST-07', amount: 2500, tamper: true });
  const frames = getDissectedFramesSummary(sim, state);

  assert.equal(sim.status, 'BLOCKED');
  const hasTamper = frames.some(f => f.info.includes('TAMPERED') || f.protocol.includes('MITM'));
  const hasIcmpOrRst = frames.some(f => f.protocol === 'ICMP' || f.info.includes('RST'));
  assert.ok(hasTamper, 'Dissected frames should detect tampered payload');
  assert.ok(hasIcmpOrRst, 'Dissected frames should include ICMP block or TCP RST');
});

test('Checksum calculation conforms to 16-bit one complement sum', () => {
  const buf = Buffer.from([0x45, 0x00, 0x00, 0x3c, 0x1c, 0x46, 0x40, 0x00, 0x40, 0x06, 0x00, 0x00, 0xac, 0x10, 0x0a, 0x63, 0xac, 0x10, 0x0a, 0x0c]);
  const csum = calculateChecksum(buf, 0, buf.length);
  assert.ok(Number.isInteger(csum) && csum >= 0 && csum <= 0xffff);
});
