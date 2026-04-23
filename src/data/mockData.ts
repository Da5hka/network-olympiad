import { AppState } from '../types';

export const initialMockData: AppState = {
  competitionState: 'NOT_STARTED',
  isAdminAuthenticated: false,
  tasks: [
    {
      id: 't1',
      title: 'OSPF Basic Adjacency',
      category: 'Routing',
      difficulty: 'Easy',
      maxScore: 100,
      description: 'Үндсэн сүлжээтэй (10.0.0.1) холбогдохын тулд OSPF area 0 тохируулна уу. 192.168.100.0/24 сүлжээг зөв зарласан эсэхийг шалгана уу.',
      hints: [],
      writeup: 'The adjacency was failing because the interface was configured in Area 1 instead of Area 0. Command: \n\n```\nrouter ospf 1\n network 10.0.0.0 0.0.0.255 area 0\n```',
      isAvailable: true,
      scoreValueHint: '100 points for full routing table.',
      targetDevice: 'Edge Router',
      solversCount: 8,
    },
    {
      id: 't2',
      title: 'BGP Route Leaking',
      category: 'Routing',
      difficulty: 'Hard',
      maxScore: 250,
      description: 'Та бүрэн BGP зам хүлээн авч байгаа боловч зарим дотоод сүлжээнүүд гадаад үйлчилгээ үзүүлэгч (AS 65001) рүү алдагдаж байна. AS 65100-аас ирсэн замуудыг шүүх route-map тохируулна уу.',
      hints: [],
      writeup: 'Solution:\n```\nip as-path access-list 1 permit ^65100_\nroute-map UPSTREAM deny 10\n match as-path 1\nroute-map UPSTREAM permit 20\nrouter bgp 65000\n neighbor 203.0.113.1 route-map UPSTREAM out\n```',
      isAvailable: true,
      scoreValueHint: '250 points for passing automated leak tests.',
      targetDevice: 'Border Gateway',
      solversCount: 2,
    },
    {
      id: 't3',
      title: 'DHCP Snooping & ARP Inspection',
      category: 'Security',
      difficulty: 'Medium',
      maxScore: 150,
      description: 'VLAN 10 дээр явагдаж буй ARP spoofing халдлагыг зогсооно уу. Өөрт хуваарилагдсан свич дээр DHCP snooping болон Dynamic ARP Inspection (DAI) тохируулна уу.',
      hints: [],
      writeup: '```\nip dhcp snooping\nip dhcp snooping vlan 10\nip arp inspection vlan 10\ninterface GigabitEthernet0/1\n ip dhcp snooping trust\n ip arp inspection trust\n```',
      isAvailable: true,
      scoreValueHint: '150 points if ARP spoofing simulation fails.',
      targetDevice: 'Access Switch',
      solversCount: 5,
    },
    {
      id: 't4',
      title: 'IPsec Site-to-Site VPN',
      category: 'Services',
      difficulty: 'Expert',
      maxScore: 300,
      description: 'Салбар оффис руу (198.51.100.2) аюулгүй IPsec туннель үүсгэнэ үү. AES-256 болон SHA-256 ашигла. 10.10.10.0/24 болон 10.20.20.0/24 сүлжээнүүд хоорондоо холбогдох ёстой.',
      hints: [],
      writeup: 'Issue was a mismatched pre-shared key and incorrect crypto ACL. Correct configuration:\n```\ncrypto isakmp key secret123 address 198.51.100.2\naccess-list 100 permit ip 10.10.10.0 0.0.0.255 10.20.20.0 0.0.0.255\n```',
      isAvailable: true,
      scoreValueHint: '300 points upon successful ping between loopbacks.',
      targetDevice: 'VPN Gateway',
      solversCount: 1,
    },
    {
      id: 't5',
      title: 'IPv6 Transition (GRE Tunneling)',
      category: 'Routing',
      difficulty: 'Medium',
      maxScore: 200,
      description: 'Өөрийн рутер болон IPv6 цөм сүлжээний хооронд IPv6 over IPv4 GRE туннель тохируулна уу. Туннель дээгүүр OSPFv3 холболт үүсгэнэ үү.',
      hints: [],
      writeup: '```\ninterface Tunnel0\n tunnel mode gre ip\n ipv6 address 2001:db8:1::1/64\n ipv6 ospf 1 area 0\n```',
      isAvailable: true,
      scoreValueHint: '200 points for OSPFv3 FULL state.',
      targetDevice: 'Core Router',
      solversCount: 4,
    },
    {
      id: 't6',
      title: 'STP Root Bridge Protection',
      category: 'Switching',
      difficulty: 'Easy',
      maxScore: 100,
      description: 'Зөвшөөрөлгүй свичүүд spanning-tree root bridge болохоос сэргийлнэ үү. Захын портуудын аюулгүй байдлыг хангана уу.',
      hints: [],
      writeup: 'Enable spanning-tree root guard on edge interfaces and bpduguard.',
      isAvailable: true,
      scoreValueHint: '100 points for stable STP topology.',
      targetDevice: 'Distribution Switch',
      solversCount: 10,
    },
    {
      id: 't7',
      title: 'NAT Overload Troubleshooting',
      category: 'Troubleshooting',
      difficulty: 'Medium',
      maxScore: 150,
      description: 'Дотоод хэрэглэгчид интернетэд холбогдож чадахгүй байна. PAT тохируулагдсан боловч хаяг хөрвүүлэхгүй байна. Асуудлыг олж холболтыг сэргээнэ үү.',
      hints: [],
      writeup: 'The WAN interface was missing `ip nat outside`.',
      isAvailable: true,
      scoreValueHint: '150 points for successful ICMP to 8.8.8.8.',
      targetDevice: 'Edge Router',
      solversCount: 6,
    },
    {
      id: 't8',
      title: 'QoS Voice Prioritization',
      category: 'Services',
      difficulty: 'Hard',
      maxScore: 250,
      description: 'VoIP урсгал тасалдалтай байна. EF (Expedited Forwarding) урсгалд 2 Mbps зурвасын өргөн бүхий priority queue оноох QoS бодлого үүсгэнэ үү.',
      hints: [],
      writeup: '```\nclass-map match-all VOICE\n match dscp ef\npolicy-map QOS\n class VOICE\n  priority 2000\n```',
      isAvailable: true,
      scoreValueHint: '250 points for QoS policy application on WAN uplink.',
      targetDevice: 'WAN Edge',
      solversCount: 3,
    }
  ],
  participants: [
    {
      id: 'p1', name: 'Бат-Эрдэнэ', organization: 'ШУТИС-МХТС', category: 'Student', routerNumber: 'R01', routerIp: '172.16.1.1', totalScore: 850,
      taskScores: [{ taskId: 't1', score: 100, completedAt: '2026-04-23T02:15:00Z' }, { taskId: 't2', score: 250, completedAt: '2026-04-23T03:00:00Z' }, { taskId: 't3', score: 150, completedAt: '2026-04-23T04:10:00Z' }, { taskId: 't4', score: 300, completedAt: '2026-04-23T05:00:00Z'}],
      status: 'Online', lastUpdated: '2026-04-23T04:20:00Z'
    },
    {
      id: 'p2', name: 'Сүхбат', organization: 'МУИС', category: 'Student', routerNumber: 'R02', routerIp: '172.16.1.2', totalScore: 600,
      taskScores: [{ taskId: 't1', score: 100, completedAt: '2026-04-23T02:20:00Z' }, { taskId: 't3', score: 150, completedAt: '2026-04-23T03:45:00Z' }, { taskId: 't6', score: 100, completedAt: '2026-04-23T04:00:00Z' }, { taskId: 't8', score: 250, completedAt: '2026-04-23T05:10:00Z'}],
      status: 'Online', lastUpdated: '2026-04-23T04:22:00Z'
    },
    {
      id: 'p3', name: 'Тэмүүжин', organization: 'ХУИС', category: 'Student', routerNumber: 'R03', routerIp: '172.16.1.3', totalScore: 700,
      taskScores: [{ taskId: 't1', score: 100, completedAt: '2026-04-23T02:30:00Z' }, { taskId: 't5', score: 200, completedAt: '2026-04-23T03:30:00Z' }, { taskId: 't7', score: 150, completedAt: '2026-04-23T04:05:00Z' }, { taskId: 't2', score: 250, completedAt: '2026-04-23T05:20:00Z'}],
      status: 'Online', lastUpdated: '2026-04-23T04:21:00Z'
    },
    {
      id: 'p4', name: 'Анужин', organization: 'СЭЗИС', category: 'Student', routerNumber: 'R04', routerIp: '172.16.1.4', totalScore: 400,
      taskScores: [{ taskId: 't1', score: 100, completedAt: '2026-04-23T02:45:00Z' }, { taskId: 't6', score: 100, completedAt: '2026-04-23T03:10:00Z' }, { taskId: 't5', score: 200, completedAt: '2026-04-23T04:30:00Z' }],
      status: 'Issues', lastUpdated: '2026-04-23T04:15:00Z'
    },
    {
      id: 'p5', name: 'Ганболд', organization: 'Шинэ Монгол', category: 'Student', routerNumber: 'R05', routerIp: '172.16.1.5', totalScore: 350,
      taskScores: [{ taskId: 't1', score: 100, completedAt: '2026-04-23T02:50:00Z' }, { taskId: 't7', score: 150, completedAt: '2026-04-23T03:50:00Z' }, { taskId: 't6', score: 100, completedAt: '2026-04-23T04:40:00Z' }],
      status: 'Online', lastUpdated: '2026-04-23T04:21:30Z'
    },
    {
      id: 'p6', name: 'Хулан', organization: '1-р сургууль', category: 'Student', routerNumber: 'R06', routerIp: '172.16.1.6', totalScore: 250,
      taskScores: [{ taskId: 't1', score: 100, completedAt: '2026-04-23T03:00:00Z' }, { taskId: 't3', score: 150, completedAt: '2026-04-23T04:15:00Z' }],
      status: 'Connecting', lastUpdated: '2026-04-23T04:18:00Z'
    },
    {
      id: 'p7', name: 'Болдбаатар', organization: 'Юнител ХХК', category: 'Engineer', routerNumber: 'R07', routerIp: '172.16.1.7', totalScore: 100,
      taskScores: [{ taskId: 't6', score: 100, completedAt: '2026-04-23T03:20:00Z' }],
      status: 'Offline', lastUpdated: '2026-04-23T04:00:00Z'
    },
    {
      id: 'p8', name: 'Номин', organization: 'Мобиком', category: 'Engineer', routerNumber: 'R08', routerIp: '172.16.1.8', totalScore: 450,
      taskScores: [{ taskId: 't1', score: 100, completedAt: '2026-04-23T02:40:00Z' }, { taskId: 't7', score: 150, completedAt: '2026-04-23T03:15:00Z' }, { taskId: 't5', score: 200, completedAt: '2026-04-23T04:50:00Z'}],
      status: 'Online', lastUpdated: '2026-04-23T04:22:15Z'
    },
    {
      id: 'p9', name: 'Чингүүн', organization: 'Ай Ти Зон ХХК', category: 'Engineer', routerNumber: 'R09', routerIp: '172.16.1.9', totalScore: 300,
      taskScores: [{ taskId: 't6', score: 100, completedAt: '2026-04-23T03:05:00Z' }, { taskId: 't5', score: 200, completedAt: '2026-04-23T04:25:00Z' }],
      status: 'Issues', lastUpdated: '2026-04-23T04:15:00Z'
    },
    {
      id: 'p10', name: 'Мандах', organization: 'Эмпасофт', category: 'Engineer', routerNumber: 'R10', routerIp: '172.16.1.10', totalScore: 500,
      taskScores: [{ taskId: 't1', score: 100, completedAt: '2026-04-23T02:25:00Z' }, { taskId: 't3', score: 150, completedAt: '2026-04-23T03:40:00Z' }, { taskId: 't8', score: 250, completedAt: '2026-04-23T05:05:00Z'}],
      status: 'Online', lastUpdated: '2026-04-23T04:20:45Z'
    },
    {
      id: 'p11', name: 'Алтансүх', organization: 'Голомт Банк', category: 'Engineer', routerNumber: 'R11', routerIp: '172.16.1.11', totalScore: 650,
      taskScores: [{ taskId: 't1', score: 100, completedAt: '2026-04-23T02:10:00Z' }, { taskId: 't6', score: 100, completedAt: '2026-04-23T02:35:00Z' }, { taskId: 't5', score: 200, completedAt: '2026-04-23T03:50:00Z' }, { taskId: 't8', score: 250, completedAt: '2026-04-23T05:15:00Z'}],
      status: 'Online', lastUpdated: '2026-04-23T04:22:30Z'
    },
    {
      id: 'p12', name: 'Сарнай', organization: 'Хаан Банк', category: 'Engineer', routerNumber: 'R12', routerIp: '172.16.1.12', totalScore: 250,
      taskScores: [{ taskId: 't6', score: 100, completedAt: '2026-04-23T03:15:00Z' }, { taskId: 't7', score: 150, completedAt: '2026-04-23T04:30:00Z' }],
      status: 'Online', lastUpdated: '2026-04-23T04:19:00Z'
    }
  ],
  diagnostics: [
    {
      id: 'd1', participantId: 'p1', ip: '172.16.1.1', routerNumber: 'R01', status: 'Healthy', lastCheck: '2026-04-23T04:22:00Z',
      isReachable: true, servicesReachable: { 'SSH': true, 'ICMP': true, 'HTTP': false }, protocolsStatus: { 'OSPF': 'Up', 'BGP': 'Up' }, validationPassed: true,
      logs: [
        { id: 'l1', timestamp: '2026-04-23T04:21:55Z', level: 'INFO', message: 'Initiating diagnostics on 172.16.1.1' },
        { id: 'l2', timestamp: '2026-04-23T04:21:56Z', level: 'SUCCESS', message: 'ICMP reachable (avg: 2.1ms)' },
        { id: 'l3', timestamp: '2026-04-23T04:21:58Z', level: 'SUCCESS', message: 'OSPF Adjacency FULL with 10.0.0.1' },
      ]
    },
    {
      id: 'd2', participantId: 'p2', ip: '172.16.1.2', routerNumber: 'R02', status: 'Healthy', lastCheck: '2026-04-23T04:22:00Z',
      isReachable: true, servicesReachable: { 'SSH': true, 'ICMP': true, 'HTTP': false }, protocolsStatus: { 'OSPF': 'Up', 'BGP': 'Down' }, validationPassed: true,
      logs: [
        { id: 'l1', timestamp: '2026-04-23T04:21:55Z', level: 'INFO', message: 'Initiating diagnostics on 172.16.1.2' },
        { id: 'l2', timestamp: '2026-04-23T04:21:56Z', level: 'SUCCESS', message: 'ICMP reachable (avg: 5.4ms)' },
      ]
    },
    {
      id: 'd4', participantId: 'p4', ip: '172.16.1.4', routerNumber: 'R04', status: 'Degraded', lastCheck: '2026-04-23T04:22:00Z',
      isReachable: true, servicesReachable: { 'SSH': true, 'ICMP': true, 'HTTP': false }, protocolsStatus: { 'OSPF': 'Down', 'BGP': 'Down' }, validationPassed: false,
      logs: [
        { id: 'l1', timestamp: '2026-04-23T04:21:55Z', level: 'INFO', message: 'Initiating diagnostics on 172.16.1.4' },
        { id: 'l2', timestamp: '2026-04-23T04:21:57Z', level: 'ERROR', message: 'OSPF Adjacency INIT state - ExStart failed' },
      ]
    },
    {
      id: 'd7', participantId: 'p7', ip: '172.16.1.7', routerNumber: 'R07', status: 'Down', lastCheck: '2026-04-23T04:20:00Z',
      isReachable: false, servicesReachable: { 'SSH': false, 'ICMP': false, 'HTTP': false }, protocolsStatus: { 'OSPF': 'Down', 'BGP': 'Down' }, validationPassed: false,
      logs: [
        { id: 'l1', timestamp: '2026-04-23T04:20:00Z', level: 'ERROR', message: 'Connection timeout. No route to host 172.16.1.7' },
      ]
    }
  ]
};
