import crypto from 'node:crypto';

/**
 * Enterprise Banking Network IP & MAC Address Registry.
 * Follows a clean hierarchical CIDR plan:
 * HQ Backbone: 10.0.0.0/16
 * Northern Region (REG-A): 10.1.0.0/16  (BR-A1: 10.1.1.0/24, BR-A2: 10.1.2.0/24)
 * Central Region (REG-B):  10.2.0.0/16  (BR-B1: 10.2.1.0/24, BR-B2: 10.2.2.0/24)
 * Southern Region (REG-C): 10.3.0.0/16  (BR-C1: 10.3.1.0/24, BR-C2: 10.3.2.0/24)
 */
export const NODE_NETWORK_CONFIG = {
  'HQ-CORE': { ip: '10.0.0.1', mac: '02:00:0a:00:00:01', label: 'HQ Core Gateway Router' },

  // Regional Routers
  'REG-A':   { ip: '10.1.0.1', mac: '02:00:0a:01:00:01', label: 'Northern Region Router' },
  'REG-B':   { ip: '10.2.0.1', mac: '02:00:0a:02:00:01', label: 'Central Region Router' },
  'REG-C':   { ip: '10.3.0.1', mac: '02:00:0a:03:00:01', label: 'Southern Region Router' },

  // Branch Routers
  'BR-A1':   { ip: '10.1.1.1', mac: '02:00:0a:01:01:01', label: 'Hyderabad Central Branch Router' },
  'BR-A2':   { ip: '10.1.2.1', mac: '02:00:0a:01:02:01', label: 'Secunderabad Branch Router' },
  'BR-B1':   { ip: '10.2.1.1', mac: '02:00:0a:02:01:01', label: 'Bengaluru Main Branch Router' },
  'BR-B2':   { ip: '10.2.2.1', mac: '02:00:0a:02:02:01', label: 'Mysuru City Branch Router' },
  'BR-C1':   { ip: '10.3.1.1', mac: '02:00:0a:03:01:01', label: 'Chennai Marina Branch Router' },
  'BR-C2':   { ip: '10.3.2.1', mac: '02:00:0a:03:02:01', label: 'Vellore Campus Branch Router' },

  // Customer Endpoints (BR-A1)
  'CUST-01': { ip: '10.1.1.101', mac: '02:00:0a:01:01:65', label: 'Aarav Mehta Endpoint' },
  'CUST-02': { ip: '10.1.1.102', mac: '02:00:0a:01:01:66', label: 'Ishita Reddy Endpoint' },
  'CUST-03': { ip: '10.1.1.103', mac: '02:00:0a:01:01:67', label: 'Vivaan Rao Endpoint' },

  // Customer Endpoints (BR-A2)
  'CUST-04': { ip: '10.1.2.101', mac: '02:00:0a:01:02:65', label: 'Saanvi Shah Endpoint' },
  'CUST-05': { ip: '10.1.2.102', mac: '02:00:0a:01:02:66', label: 'Reyansh Patel Endpoint' },
  'CUST-06': { ip: '10.1.2.103', mac: '02:00:0a:01:02:67', label: 'Aadhya Iyer Endpoint' },

  // Customer Endpoints (BR-B1)
  'CUST-07': { ip: '10.2.1.101', mac: '02:00:0a:02:01:65', label: 'Kabir Rao Endpoint' },
  'CUST-08': { ip: '10.2.1.102', mac: '02:00:0a:02:01:66', label: 'Myra Das Endpoint' },
  'CUST-09': { ip: '10.2.1.103', mac: '02:00:0a:02:01:67', label: 'Vihaan Kumar Endpoint' },

  // Customer Endpoints (BR-B2)
  'CUST-10': { ip: '10.2.2.101', mac: '02:00:0a:02:02:65', label: 'Atharv Singh Endpoint' },
  'CUST-11': { ip: '10.2.2.102', mac: '02:00:0a:02:02:66', label: 'Kiara Bose Endpoint' },
  'CUST-12': { ip: '10.2.2.103', mac: '02:00:0a:02:02:67', label: 'Dhruv Nair Endpoint' },

  // Customer Endpoints (BR-C1)
  'CUST-13': { ip: '10.3.1.101', mac: '02:00:0a:03:01:65', label: 'Anaya Iyer Endpoint' },
  'CUST-14': { ip: '10.3.1.102', mac: '02:00:0a:03:01:66', label: 'Aanya Krishnan Endpoint' },
  'CUST-15': { ip: '10.3.1.103', mac: '02:00:0a:03:01:67', label: 'Dev Malhotra Endpoint' },

  // Customer Endpoints (BR-C2)
  'CUST-16': { ip: '10.3.2.101', mac: '02:00:0a:03:02:65', label: 'Diya Sharma Endpoint' },
  'CUST-17': { ip: '10.3.2.102', mac: '02:00:0a:03:02:66', label: 'Rohan Bhat Endpoint' },
  'CUST-18': { ip: '10.3.2.103', mac: '02:00:0a:03:02:67', label: 'Pia Anand Endpoint' }
};

export function getNodeConfig(nodeId) {
  if (NODE_NETWORK_CONFIG[nodeId]) {
    return NODE_NETWORK_CONFIG[nodeId];
  }
  // Deterministic fallback for any dynamic node
  const hash = crypto.createHash('md5').update(String(nodeId)).digest();
  const ip = `10.${hash[0] % 4}.${hash[1] % 4}.${(hash[2] % 200) + 1}`;
  const mac = `02:00:0a:${hash[0].toString(16).padStart(2, '0')}:${hash[1].toString(16).padStart(2, '0')}:${hash[2].toString(16).padStart(2, '0')}`;
  return { ip, mac, label: `Node ${nodeId}` };
}

/**
 * Standard RFC 1071 / RFC 791 / RFC 793 Internet Checksum calculation
 */
export function calculateChecksum(buf, offset = 0, length = buf.length) {
  let sum = 0;
  for (let i = 0; i < length - 1; i += 2) {
    sum += buf.readUInt16BE(offset + i);
  }
  if (length % 2 === 1) {
    sum += buf[offset + length - 1] << 8;
  }
  while (sum >> 16) {
    sum = (sum & 0xffff) + (sum >> 16);
  }
  return (~sum) & 0xffff;
}

export function parseMac(macStr) {
  return Buffer.from(macStr.replace(/[:-]/g, ''), 'hex');
}

export function parseIp(ipStr) {
  return Buffer.from(ipStr.split('.').map(x => parseInt(x, 10)));
}

/**
 * Standard Libpcap Global Header (24 bytes)
 * Magic number 0xa1b2c3d4 indicates microsecond resolution in host byte order (little endian).
 */
export function createPcapGlobalHeader() {
  const buf = Buffer.alloc(24);
  buf.writeUInt32LE(0xa1b2c3d4, 0); // magic_number (microsecond resolution)
  buf.writeUInt16LE(2, 4);          // version_major: 2
  buf.writeUInt16LE(4, 6);          // version_minor: 4
  buf.writeInt32LE(0, 8);           // thiszone (GMT to local correction)
  buf.writeUInt32LE(0, 12);         // sigfigs (accuracy of timestamps)
  buf.writeUInt32LE(65535, 16);     // snaplen (max captured packet length)
  buf.writeUInt32LE(1, 20);         // network (1 = LINKTYPE_ETHERNET)
  return buf;
}

/**
 * Standard Libpcap Packet Record Header (16 bytes)
 */
export function createPcapPacketRecord(packetData, timestampUs) {
  const sec = Math.floor(timestampUs / 1000000);
  const usec = Math.floor(timestampUs % 1000000);
  const header = Buffer.alloc(16);
  header.writeUInt32LE(sec, 0);
  header.writeUInt32LE(usec, 4);
  header.writeUInt32LE(packetData.length, 8);  // included length
  header.writeUInt32LE(packetData.length, 12); // original length
  return Buffer.concat([header, packetData]);
}

/**
 * Ethernet II Frame Header (14 bytes)
 */
export function buildEthernetFrame(srcMac, dstMac, etherType, payload) {
  const eth = Buffer.alloc(14);
  parseMac(dstMac).copy(eth, 0);
  parseMac(srcMac).copy(eth, 6);
  eth.writeUInt16BE(etherType, 12);
  return Buffer.concat([eth, payload]);
}

/**
 * ARP Packet (28 bytes)
 */
export function buildArpPacket(srcMac, srcIp, dstMac, dstIp, isReply = false) {
  const arp = Buffer.alloc(28);
  arp.writeUInt16BE(1, 0);      // Hardware type: Ethernet (1)
  arp.writeUInt16BE(0x0800, 2); // Protocol type: IPv4 (0x0800)
  arp[4] = 6;                   // Hardware size: 6
  arp[5] = 4;                   // Protocol size: 4
  arp.writeUInt16BE(isReply ? 2 : 1, 6); // Opcode: 1 = Request, 2 = Reply
  parseMac(srcMac).copy(arp, 8);
  parseIp(srcIp).copy(arp, 14);
  parseMac(dstMac).copy(arp, 18);
  parseIp(dstIp).copy(arp, 24);
  return arp;
}

/**
 * IPv4 Header (20 bytes) + Payload with calculated header checksum
 */
export function buildIpPacket(srcIp, dstIp, protocol, payload, ttl = 64, identification = 0x1000, dscp = 0) {
  const ip = Buffer.alloc(20);
  ip[0] = 0x45; // Version: 4, Header Length: 5 words (20 bytes)
  ip[1] = dscp; // DSCP / TOS (e.g. 0xb8 for Expedited Forwarding)
  ip.writeUInt16BE(20 + payload.length, 2);
  ip.writeUInt16BE(identification, 4);
  ip.writeUInt16BE(0x4000, 6); // Flags: Don't Fragment (DF=1)
  ip[8] = ttl;
  ip[9] = protocol; // 6 = TCP, 1 = ICMP
  ip.writeUInt16BE(0, 10); // Clear checksum before calculation
  parseIp(srcIp).copy(ip, 12);
  parseIp(dstIp).copy(ip, 16);

  const checksum = calculateChecksum(ip, 0, 20);
  ip.writeUInt16BE(checksum, 10);

  return Buffer.concat([ip, payload]);
}

/**
 * TCP Segment (20 bytes) + Payload with calculated pseudo-header checksum
 */
export function buildTcpPacket(srcPort, dstPort, seqNum, ackNum, flags, payload = Buffer.alloc(0), srcIp, dstIp, windowSize = 64240) {
  const tcp = Buffer.alloc(20);
  tcp.writeUInt16BE(srcPort, 0);
  tcp.writeUInt16BE(dstPort, 2);
  tcp.writeUInt32BE(seqNum, 4);
  tcp.writeUInt32BE(ackNum, 8);
  tcp[12] = 0x50; // Data offset: 5 words (20 bytes), Reserved 0
  tcp[13] = flags;
  tcp.writeUInt16BE(windowSize, 14);
  tcp.writeUInt16BE(0, 16); // Clear checksum
  tcp.writeUInt16BE(0, 18); // Urgent pointer

  // Pseudo-header: Src IP (4), Dst IP (4), Zero (1), Protocol (1 = 6), TCP Length (2)
  const pseudo = Buffer.alloc(12);
  parseIp(srcIp).copy(pseudo, 0);
  parseIp(dstIp).copy(pseudo, 4);
  pseudo[8] = 0;
  pseudo[9] = 6;
  pseudo.writeUInt16BE(20 + payload.length, 10);

  const forChecksum = Buffer.concat([pseudo, tcp, payload]);
  const checksum = calculateChecksum(forChecksum, 0, forChecksum.length);
  tcp.writeUInt16BE(checksum, 16);

  return Buffer.concat([tcp, payload]);
}

/**
 * ICMP Packet (e.g. Destination Unreachable / Administratively Prohibited)
 */
export function buildIcmpPacket(type, code, originalIpPacket) {
  // ICMP Header: Type (1), Code (1), Checksum (2), Unused (4) = 8 bytes
  // Followed by IP header + first 8 bytes of original transport header
  const quoteLength = Math.min(originalIpPacket.length, 28);
  const icmp = Buffer.alloc(8 + quoteLength);
  icmp[0] = type;
  icmp[1] = code;
  icmp.writeUInt16BE(0, 2); // Clear checksum
  icmp.writeUInt32BE(0, 4); // Unused / zero
  originalIpPacket.copy(icmp, 8, 0, quoteLength);

  const checksum = calculateChecksum(icmp, 0, icmp.length);
  icmp.writeUInt16BE(checksum, 2);
  return icmp;
}

/**
 * Generates an authentic, standard Libpcap binary Buffer from a PaySafe simulation run.
 */
export function generateSimulationPcap(sim, state) {
  const baseTimeUs = (new Date(sim.createdAt || Date.now()).getTime() - 200) * 1000;
  let currentUs = baseTimeUs;

  const srcConfig = getNodeConfig(sim.source);
  const dstConfig = getNodeConfig(sim.destination);
  const route = sim.route || [sim.source, sim.destination];

  // Resolve gateway router for source endpoint
  const gatewayNodeId = route.length > 1 ? route[1] : sim.source;
  const gatewayConfig = getNodeConfig(gatewayNodeId);

  const packets = [];
  let packetId = 1;

  // Helper to append a packet
  function addFrame(srcMac, dstMac, etherType, l3Packet, deltaMs = 0) {
    currentUs += Math.round(deltaMs * 1000);
    const ethFrame = buildEthernetFrame(srcMac, dstMac, etherType, l3Packet);
    packets.push(createPcapPacketRecord(ethFrame, currentUs));
  }

  // ---------------------------------------------------------
  // 1. ARP Resolution Phase at Source Local Subnet
  // ---------------------------------------------------------
  // ARP Request: "Who has gateway IP? Tell client IP"
  const arpReq = buildArpPacket(srcConfig.mac, srcConfig.ip, '00:00:00:00:00:00', gatewayConfig.ip, false);
  addFrame(srcConfig.mac, 'ff:ff:ff:ff:ff:ff', 0x0806, arpReq, 0);

  // ARP Reply: "Gateway IP is at gateway MAC"
  const arpReply = buildArpPacket(gatewayConfig.mac, gatewayConfig.ip, srcConfig.mac, srcConfig.ip, true);
  addFrame(gatewayConfig.mac, srcConfig.mac, 0x0806, arpReply, 1.2);

  // ---------------------------------------------------------
  // 2. TCP 3-Way Handshake (Client <-> Destination / Banking Gateway)
  // ---------------------------------------------------------
  const clientPort = 52400 + (parseInt(sim.source.replace(/\D/g, ''), 10) || 1);
  const serverPort = 8443; // Standard Banking HTTPS/TLS Gateway Port
  const initialClientSeq = 100000;
  const initialServerSeq = 500000;
  const pathLatency = Math.max(5, Math.round((sim.latency || 20) / 2));

  // Frame 3: TCP [SYN]
  const tcpSyn = buildTcpPacket(clientPort, serverPort, initialClientSeq, 0, 0x02, Buffer.alloc(0), srcConfig.ip, dstConfig.ip);
  const ipSyn = buildIpPacket(srcConfig.ip, dstConfig.ip, 6, tcpSyn, 64, packetId++);
  addFrame(srcConfig.mac, gatewayConfig.mac, 0x0800, ipSyn, 2.0);

  // Frame 4: TCP [SYN, ACK]
  const tcpSynAck = buildTcpPacket(serverPort, clientPort, initialServerSeq, initialClientSeq + 1, 0x12, Buffer.alloc(0), dstConfig.ip, srcConfig.ip);
  const ipSynAck = buildIpPacket(dstConfig.ip, srcConfig.ip, 6, tcpSynAck, 64, packetId++);
  addFrame(gatewayConfig.mac, srcConfig.mac, 0x0800, ipSynAck, pathLatency);

  // Frame 5: TCP [ACK]
  const tcpAckHandshake = buildTcpPacket(clientPort, serverPort, initialClientSeq + 1, initialServerSeq + 1, 0x10, Buffer.alloc(0), srcConfig.ip, dstConfig.ip);
  const ipAckHandshake = buildIpPacket(srcConfig.ip, dstConfig.ip, 6, tcpAckHandshake, 64, packetId++);
  addFrame(srcConfig.mac, gatewayConfig.mac, 0x0800, ipAckHandshake, 1.5);

  // ---------------------------------------------------------
  // 3. Application Banking Payload Construction
  // ---------------------------------------------------------
  const originalTxPayload = {
    protocol: 'PaySafe-NetBankX/1.1',
    standard: 'ISO20022-pain.001.001.09',
    simulationId: sim.id,
    transactionId: sim.transactionId || `TX-${sim.id.replace('SIM-', '')}`,
    sourceEndpoint: sim.source,
    destinationEndpoint: sim.destination,
    amount: sim.amount || 2500.00,
    currency: 'INR',
    reference: sim.reference || 'Customer Wire Transfer',
    security: {
      algorithm: 'AES-256-GCM',
      keyDerivation: 'HKDF-SHA256',
      iv: crypto.randomBytes(12).toString('hex'),
      authTag: crypto.randomBytes(16).toString('hex'),
      integrityStatus: 'VALID_AUTHENTICATED'
    }
  };

  const validPayloadBuffer = Buffer.from(JSON.stringify(originalTxPayload, null, 2), 'utf8');

  // If tampered, generate the modified MITM payload with altered ciphertext bits
  const tamperedTxPayload = JSON.parse(JSON.stringify(originalTxPayload));
  tamperedTxPayload.amount = (sim.amount || 2500) * 10;
  tamperedTxPayload.reference = `${sim.reference || 'Wire'} [MALICIOUS_ADVERSARY_MODIFIED]`;
  tamperedTxPayload.security.integrityStatus = 'TAMPERED_CIPHERTEXT_BITS_ALTERED_IN_TRANSIT';
  tamperedTxPayload.security.tamperedAt = sim.blockedAt || 'INTERMEDIATE_TRANSIT_ROUTER';
  const tamperedPayloadBuffer = Buffer.from(JSON.stringify(tamperedTxPayload, null, 2), 'utf8');

  // ---------------------------------------------------------
  // 4. Multi-Hop Forwarding Trace (Hop-by-Hop Router Transit)
  // ---------------------------------------------------------
  const tamperHopIndex = sim.tampered ? Math.min(route.length - 2, Math.max(1, Math.floor((route.length - 1) / 2))) : -1;
  let currentSeq = initialClientSeq + 1;
  let currentAck = initialServerSeq + 1;
  let lastDataIpPacket = null;

  for (let i = 0; i < route.length - 1; i++) {
    const hopFrom = route[i];
    const hopTo = route[i + 1];
    const fromConfig = getNodeConfig(hopFrom);
    const toConfig = getNodeConfig(hopTo);

    // Find link latency
    const link = state.links.find(l => (l.from === hopFrom && l.to === hopTo) || (l.to === hopFrom && l.from === hopTo));
    const hopLatency = link ? link.latency : 10;

    // Check if packet was tampered prior to this hop
    const isTamperedHop = sim.tampered && i >= tamperHopIndex;
    const currentPayload = isTamperedHop ? tamperedPayloadBuffer : validPayloadBuffer;

    // Check if events show retry/loss on this hop
    const hopRetries = sim.events.filter(e => e.type === 'packet.retrying' && e.from === hopFrom && e.to === hopTo).length;

    for (let r = 0; r <= hopRetries; r++) {
      if (r > 0) {
        // TCP Retransmission delay (+200ms RTO)
        currentUs += 200000;
      }

      // TTL decrements with each router hop (64 -> 63 -> 62...)
      const hopTtl = Math.max(1, 64 - i);

      // TCP [PSH, ACK] Data Segment
      const tcpData = buildTcpPacket(clientPort, serverPort, currentSeq, currentAck, 0x18, currentPayload, srcConfig.ip, dstConfig.ip);
      const ipData = buildIpPacket(srcConfig.ip, dstConfig.ip, 6, tcpData, hopTtl, packetId++, 0xb8); // DSCP 0xb8 = EF (Expedited Forwarding for Banking)
      lastDataIpPacket = ipData;

      addFrame(fromConfig.mac, toConfig.mac, 0x0800, ipData, r === 0 ? hopLatency : 0);
    }

    // If packet dropped permanently on this link
    const isDroppedHere = sim.status === 'FAILED' && i === route.length - 2;
    if (isDroppedHere && !sim.tampered) {
      // Emit ICMP Destination Host Unreachable from the dropping router
      const icmpUnreach = buildIcmpPacket(3, 1, lastDataIpPacket); // Type 3 Code 1 = Host Unreachable
      const ipIcmp = buildIpPacket(toConfig.ip, srcConfig.ip, 1, icmpUnreach, 64, packetId++);
      addFrame(toConfig.mac, fromConfig.mac, 0x0800, ipIcmp, 5.0);
      break;
    }

    // If tampered and this is the router that blocks it
    if (sim.tampered && i === tamperHopIndex) {
      // The receiving router detects AES-GCM Tag Mismatch!
      // Router emits ICMP Type 3 Code 13 (Communication Administratively Prohibited)
      const icmpProhibited = buildIcmpPacket(3, 13, lastDataIpPacket);
      const ipIcmp = buildIpPacket(toConfig.ip, srcConfig.ip, 1, icmpProhibited, 64, packetId++);
      addFrame(toConfig.mac, fromConfig.mac, 0x0800, ipIcmp, 2.0);

      // Router also sends TCP [RST, ACK] back to abort the connection
      const tcpRst = buildTcpPacket(serverPort, clientPort, currentAck, currentSeq + currentPayload.length, 0x14, Buffer.alloc(0), dstConfig.ip, srcConfig.ip);
      const ipRst = buildIpPacket(dstConfig.ip, srcConfig.ip, 6, tcpRst, 64, packetId++);
      addFrame(toConfig.mac, fromConfig.mac, 0x0800, ipRst, 1.0);
      break;
    }
  }

  // ---------------------------------------------------------
  // 5. Completion Phase (If simulation succeeded)
  // ---------------------------------------------------------
  if (sim.status === 'COMPLETED') {
    const payloadLen = validPayloadBuffer.length;
    currentSeq += payloadLen;

    // Frame: Destination sends TCP [ACK] for data
    const tcpAckData = buildTcpPacket(serverPort, clientPort, currentAck, currentSeq, 0x10, Buffer.alloc(0), dstConfig.ip, srcConfig.ip);
    const ipAckData = buildIpPacket(dstConfig.ip, srcConfig.ip, 6, tcpAckData, 64, packetId++);
    addFrame(gatewayConfig.mac, srcConfig.mac, 0x0800, ipAckData, pathLatency);

    // Frame: Destination sends HTTP/JSON 200 OK Ledger Response
    const responseBody = {
      status: 200,
      statusText: 'OK',
      message: 'Transaction verified and committed to ledger',
      transactionId: sim.transactionId || `TX-${sim.id.replace('SIM-', '')}`,
      cryptographicVerification: 'AES-256-GCM_PASS',
      fundsTransferred: `INR ${sim.amount ? sim.amount.toFixed(2) : '2500.00'}`
    };
    const responsePayload = Buffer.from(
      `HTTP/1.1 200 OK\r\nContent-Type: application/json; charset=utf-8\r\nContent-Length: ${Buffer.byteLength(JSON.stringify(responseBody))}\r\nConnection: close\r\n\r\n${JSON.stringify(responseBody, null, 2)}`,
      'utf8'
    );
    const tcpResp = buildTcpPacket(serverPort, clientPort, currentAck, currentSeq, 0x18, responsePayload, dstConfig.ip, srcConfig.ip);
    const ipResp = buildIpPacket(dstConfig.ip, srcConfig.ip, 6, tcpResp, 64, packetId++);
    addFrame(gatewayConfig.mac, srcConfig.mac, 0x0800, ipResp, 3.0);
    currentAck += responsePayload.length;

    // Frame: Client sends TCP [ACK] for HTTP response
    const tcpAckResp = buildTcpPacket(clientPort, serverPort, currentSeq, currentAck, 0x10, Buffer.alloc(0), srcConfig.ip, dstConfig.ip);
    const ipAckResp = buildIpPacket(srcConfig.ip, dstConfig.ip, 6, tcpAckResp, 64, packetId++);
    addFrame(srcConfig.mac, gatewayConfig.mac, 0x0800, ipAckResp, 1.0);

    // -------------------------------------------------------
    // 6. Graceful 4-Way TCP FIN Teardown
    // -------------------------------------------------------
    // Client sends FIN-ACK
    const tcpFinClient = buildTcpPacket(clientPort, serverPort, currentSeq, currentAck, 0x11, Buffer.alloc(0), srcConfig.ip, dstConfig.ip);
    const ipFinClient = buildIpPacket(srcConfig.ip, dstConfig.ip, 6, tcpFinClient, 64, packetId++);
    addFrame(srcConfig.mac, gatewayConfig.mac, 0x0800, ipFinClient, 1.0);

    // Server sends ACK
    const tcpAckFin = buildTcpPacket(serverPort, clientPort, currentAck, currentSeq + 1, 0x10, Buffer.alloc(0), dstConfig.ip, srcConfig.ip);
    const ipAckFin = buildIpPacket(dstConfig.ip, srcConfig.ip, 6, tcpAckFin, 64, packetId++);
    addFrame(gatewayConfig.mac, srcConfig.mac, 0x0800, ipAckFin, pathLatency);

    // Server sends FIN-ACK
    const tcpFinServer = buildTcpPacket(serverPort, clientPort, currentAck, currentSeq + 1, 0x11, Buffer.alloc(0), dstConfig.ip, srcConfig.ip);
    const ipFinServer = buildIpPacket(dstConfig.ip, srcConfig.ip, 6, tcpFinServer, 64, packetId++);
    addFrame(gatewayConfig.mac, srcConfig.mac, 0x0800, ipFinServer, 1.0);

    // Client sends final ACK
    const tcpAckFinal = buildTcpPacket(clientPort, serverPort, currentSeq + 1, currentAck + 1, 0x10, Buffer.alloc(0), srcConfig.ip, dstConfig.ip);
    const ipAckFinal = buildIpPacket(srcConfig.ip, dstConfig.ip, 6, tcpAckFinal, 64, packetId++);
    addFrame(srcConfig.mac, gatewayConfig.mac, 0x0800, ipAckFinal, 1.0);
  }

  const globalHeader = createPcapGlobalHeader();
  return Buffer.concat([globalHeader, ...packets]);
}

/**
 * Returns a high-level array of dissected frames for in-browser Wireshark inspection UI.
 */
export function getDissectedFramesSummary(sim, state) {
  const pcapBuffer = generateSimulationPcap(sim, state);
  const frames = [];

  // Parse records from the generated buffer
  let offset = 24; // skip 24-byte global header
  let frameNumber = 1;
  let firstSec = 0, firstUsec = 0;

  while (offset + 16 <= pcapBuffer.length) {
    const sec = pcapBuffer.readUInt32LE(offset);
    const usec = pcapBuffer.readUInt32LE(offset + 4);
    const inclLen = pcapBuffer.readUInt32LE(offset + 8);
    offset += 16;

    if (offset + inclLen > pcapBuffer.length) break;
    const packetData = pcapBuffer.subarray(offset, offset + inclLen);
    offset += inclLen;

    if (frameNumber === 1) {
      firstSec = sec;
      firstUsec = usec;
    }

    const relTimeMs = ((sec - firstSec) * 1000) + ((usec - firstUsec) / 1000);

    // Dissect Ethernet
    const dstMac = packetData.subarray(0, 6).toString('hex').match(/../g).join(':');
    const srcMac = packetData.subarray(6, 12).toString('hex').match(/../g).join(':');
    const etherType = packetData.readUInt16BE(12);

    let protocol = 'Ethernet';
    let srcIp = '-', dstIp = '-';
    let info = '';
    let badge = 'neutral';
    let details = {};

    if (etherType === 0x0806) {
      protocol = 'ARP';
      const opcode = packetData.readUInt16BE(20);
      srcIp = Array.from(packetData.subarray(28, 32)).join('.');
      dstIp = Array.from(packetData.subarray(38, 42)).join('.');
      info = opcode === 1 ? `Who has ${dstIp}? Tell ${srcIp}` : `${srcIp} is at ${srcMac}`;
      badge = 'info';
      details = {
        hardwareType: 'Ethernet (1)',
        protocolType: 'IPv4 (0x0800)',
        opcode: opcode === 1 ? 'Request (1)' : 'Reply (2)',
        senderMac: srcMac,
        senderIp: srcIp,
        targetMac: opcode === 1 ? '00:00:00:00:00:00' : dstMac,
        targetIp: dstIp
      };
    } else if (etherType === 0x0800) {
      const ipLen = (packetData[14] & 0x0f) * 4;
      const ipProto = packetData[23];
      const ttl = packetData[22];
      srcIp = Array.from(packetData.subarray(26, 30)).join('.');
      dstIp = Array.from(packetData.subarray(30, 34)).join('.');

      if (ipProto === 6) { // TCP
        protocol = 'TCP';
        const tcpOffset = 14 + ipLen;
        const srcPort = packetData.readUInt16BE(tcpOffset);
        const dstPort = packetData.readUInt16BE(tcpOffset + 2);
        const seqNum = packetData.readUInt32BE(tcpOffset + 4);
        const ackNum = packetData.readUInt32BE(tcpOffset + 8);
        const flags = packetData[tcpOffset + 13];
        const dataOffset = ((packetData[tcpOffset + 12] >> 4) & 0x0f) * 4;
        const payloadOffset = tcpOffset + dataOffset;
        const payloadLen = packetData.length - payloadOffset;

        const flagList = [];
        if (flags & 0x02) flagList.push('SYN');
        if (flags & 0x01) flagList.push('FIN');
        if (flags & 0x04) flagList.push('RST');
        if (flags & 0x08) flagList.push('PSH');
        if (flags & 0x10) flagList.push('ACK');

        info = `${srcPort} → ${dstPort} [${flagList.join(', ')}] Seq=${seqNum} Ack=${ackNum} Win=64240 Len=${payloadLen}`;

        if (payloadLen > 0) {
          const payloadStr = packetData.subarray(payloadOffset).toString('utf8');
          if (payloadStr.includes('TAMPERED')) {
            protocol = 'PaySafe/MITM';
            info = `⚠️ [TAMPERED_IN_TRANSIT] Adversary modified ciphertext bits! ${info}`;
            badge = 'danger';
          } else if (payloadStr.startsWith('HTTP')) {
            protocol = 'HTTP/JSON';
            info = `HTTP/1.1 200 OK (Transfer Committed) - ${info}`;
            badge = 'success';
          } else {
            protocol = 'PaySafe/Wire';
            info = `ISO20022/AES-GCM Banking Payload (${payloadLen} bytes) - ${info}`;
            badge = 'primary';
          }
        } else if (flags & 0x04) {
          badge = 'danger';
          info = `[RST, ACK] Connection aborted due to integrity failure! ${info}`;
        } else if (flags & 0x02) {
          badge = 'info';
        }

        details = {
          ipVersion: 4,
          ttl,
          sourceIp: srcIp,
          destIp: dstIp,
          protocol: 'TCP (6)',
          srcPort,
          dstPort,
          flags: flagList.join(', '),
          seq: seqNum,
          ack: ackNum,
          payloadBytes: payloadLen,
          payloadPreview: payloadLen > 0 ? packetData.subarray(payloadOffset, Math.min(payloadOffset + 300, packetData.length)).toString('utf8') : null
        };
      } else if (ipProto === 1) { // ICMP
        protocol = 'ICMP';
        const icmpOffset = 14 + ipLen;
        const type = packetData[icmpOffset];
        const code = packetData[icmpOffset + 1];

        if (type === 3 && code === 13) {
          info = 'Destination Unreachable (Communication Administratively Prohibited - AES-GCM Tag Mismatch)';
          badge = 'danger';
        } else if (type === 3 && code === 1) {
          info = 'Destination Unreachable (Host Unreachable - Maximum Retries Exceeded)';
          badge = 'danger';
        } else {
          info = `ICMP Type ${type} Code ${code}`;
          badge = 'warn';
        }

        details = {
          type,
          code,
          description: info,
          sourceIp: srcIp,
          destIp: dstIp
        };
      }
    }

    frames.push({
      frameNumber: frameNumber++,
      relTimeMs: Number(relTimeMs.toFixed(3)),
      protocol,
      srcMac,
      dstMac,
      srcIp,
      dstIp,
      length: packetData.length,
      info,
      badge,
      details
    });
  }

  return frames;
}
