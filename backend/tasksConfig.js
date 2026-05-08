// Device name to management IP mapping (inside each EVE environment)
// Device name to SSH port mapping
// All devices are accessed via the EVE host IP, only port differs
const DEVICE_IP = '10.16.15.4';
const DEVICE_MAP = {
  'corp-dsw02': { port: 30002 },
  'corp-dsw01': { port: 30003 },
  'corp-esw01': { port: 30004 },
  'corp-esw02': { port: 30005 },
  'corp-esw03': { port: 30006 },
  'Br1GW': { port: 30008 },
  'Fusion-rtr01': { port: 30013 },
  'wan-rtr01': { port: 30014 },
  'wan-rtr02': { port: 30015 },
  'Fusion-rtr02': { port: 30016 },
};

// All challenges from the competition spreadsheet
// Each challenge has checks[] - ALL checks must pass for points to be awarded
// matchRules: string = simple contains check, object = special rule
const challenges = [
  {
    id: 'c1',
    category: 'Troubleshooting',
    subCategory: 'iBGP',
    description: 'CorpGW router 1 2 хоорондын ibgp session down байгааг засна уу (ipv4, ipv6)',
    owner: 'Ulsaa',
    points: 3,
    checks: [
      {
        device: 'wan-rtr01',
        commands: ['show bgp all summary'],
        matchRules: ['10.1.18.10', '17000', '2001:DB8:ABCD:17::10']
      }
    ]
  },
  {
    id: 'c2',
    category: 'Implementation',
    subCategory: 'BGP',
    description: 'public ipv4 сүлжээг 2 sub сүлжээ болгон ISP-руу зарлаж интернэтд холбогдоно уу!, ipv6 сүлжээг /32-оор ISP-руу зарлаж интернэтд холбогдоно уу!',
    owner: 'Ulsaa',
    points: 2,
    checks: [
      {
        device: 'wan-rtr01',
        commands: [
          'show ip bgp neighbors 202.43.65.1 advertised-routes',
          'show bgp ipv6 unicast neighbors 2001:DB9:0:10::2 advertised-routes'
        ],
        matchRules: ['133.34.12.0/24', '133.34.13.0/24', ' 0.0.0.0', '32768', '2001:DB8::/32']
      },
      {
        device: 'wan-rtr02',
        commands: [
          'show ip bgp neighbors 103.88.34.1 advertised-routes',
          'show bgp ipv6 unicast neighbors 2001:D29:0:10::2 advertised-routes'
        ],
        matchRules: ['133.34.12.0/24', '133.34.13.0/24', ' 0.0.0.0', '32768', '2001:DB8::/32']
      }
    ]
  },
  {
    id: 'c3',
    category: 'Implementation',
    subCategory: 'BGP',
    description: 'CorpGW router 1 нь интернэтийн үндсэн гарц байх ба BGP route-үүдийн хувьд бүгд ISP-A аар гарах тул тохиргоог хийнэ үү',
    owner: 'Ulsaa',
    points: 3,
    checks: [
      {
        device: 'wan-rtr02',
        commands: ['show ip route bgp'],
        matchRules: [
          '103.88.34.0/24 [200/0] via 10.1.18.8',
          '202.43.65.0/24 [200/0] via 10.1.18.8'
        ]
      }
    ]
  },
  {
    id: 'c4',
    category: 'Implementation',
    subCategory: 'BGP',
    description: 'ISP-ээс ирж буй BGP community-тай IPv6 сүлжээнүүг GW2-оор гаргах ба community-г new format-аар нь барьж авна. Бусад бүх сүлжээг GW1-ээр явуулна',
    owner: 'Ulsaa',
    points: 4,
    checks: [
      {
        device: 'wan-rtr02',
        commands: ['show ipv6 route bgp'],
        matchRules: [
          '2001:D29::/32',
          'via 2001:DB8:ABCD:17::8',
          '2001:DB9::/32',
          'via FE80::5200:FF:FE0E:0',
          'GigabitEthernet0/2'
        ]
      }
    ]
  },
  {
    id: 'c5',
    category: 'Implementation',
    subCategory: 'VRRP',
    description: 'CorpGW-1 router ийн uplink унасан тохиолдолд санхүүгийн албаны сүлжээний active гарцны төхөөрөмж нь CorpGW-2 болох ёстой',
    owner: 'Altai',
    points: 2,
    checks: [
      {
        device: 'corp-dsw01',
        commands: ['show vrrp interface vlan 20 all'],
        matchRules: [
          'Track object 1 state Up decrement',
          { type: 'regex_gt', pattern: 'decrement\\s+(\\d+)', minValue: 12 }
        ]
      }
    ]
  },
  {
    id: 'c6',
    category: 'Troubleshooting',
    subCategory: 'OSPF',
    description: 'Техникийн болон санхүүгийн албаны гарцны төхөөрөмжөөс харгалзах хаягуудыг dynamic routing протокоор зарлах, дутуу тохиргоог гүйцээх',
    owner: 'Altai',
    points: 2,
    checks: [
      {
        device: 'corp-dsw01',
        commands: ['show ip ospf interface brief'],
        matchRules: ['Vl30', 'Vl20']
      },
      {
        device: 'corp-dsw02',
        commands: ['show ip ospf interface brief'],
        matchRules: ['Vl30', 'Vl20']
      }
    ]
  },
  {
    id: 'c7',
    category: 'Implementation',
    subCategory: 'OSPF',
    description: 'Fusion Router дээр dynamic routing protocol-ийн default тохиргоо нь интерфэйсүүд дээр neighbor relationship үүсгэхийг хориглох мөн зөвхөн шаардлагатай интерфэйсүүд дээр уг тохиргоог идэвхгүй болгож, routing neighbor үүсгэхээр тохируулна.',
    owner: 'Altai',
    points: 3,
    checks: [
      {
        device: 'Fusion-rtr01',
        commands: ['show run | sec ospf'],
        matchRules: [
          'passive-interface default',
          'no passive-interface GigabitEthernet0/0.1010',
          'no passive-interface GigabitEthernet0/0.1020',
          'no passive-interface GigabitEthernet0/0.1030',
          'no passive-interface GigabitEthernet0/1'
        ]
      },
      {
        device: 'Fusion-rtr02',
        commands: ['show run | sec ospf'],
        matchRules: [
          'passive-interface default',
          'no passive-interface GigabitEthernet0/0.1010',
          'no passive-interface GigabitEthernet0/0.1020',
          'no passive-interface GigabitEthernet0/0.1030',
          'no passive-interface GigabitEthernet0/1'
        ]
      }
    ]
  },
  {
    id: 'c8',
    category: 'Implementation',
    subCategory: 'OSPF',
    description: 'CorpGW-2 router дээр ipv6 dynamic routing protocol ийн тохиргоог хийж гүйцэтгэх',
    owner: 'Altai',
    points: 2,
    checks: [
      {
        device: 'corp-dsw02',
        commands: ['show ipv6 ospf neighbor'],
        matchRules: [
          '10.1.18.4',
          '10.1.18.1',
          'FULL/DR',
          'Vlan1011',
          '10.1.18.12',
          'Vlan1010'
        ]
      }
    ]
  },
  {
    id: 'c9',
    category: 'Implementation',
    subCategory: 'OSPF',
    description: 'IPv6 сүлжээний хувьд WAN router ээс BGP-гийн default route ээс үл харгалзан дотоод сүлжээнд байнгын default route зарлах тохиргоог хийж гүйцэтгэ',
    owner: 'Altai',
    points: 2,
    checks: [
      {
        device: 'wan-rtr01',
        commands: ['show ipv6 ospf 1'],
        matchRules: ['Originate Default Route with always']
      },
      {
        device: 'wan-rtr02',
        commands: ['show ipv6 ospf 1'],
        matchRules: ['Originate Default Route with always']
      }
    ]
  },
  {
    id: 'c10',
    category: 'Troubleshooting',
    subCategory: 'OSPF',
    description: 'Finance department болон Technology department -ийн default route суралцахгүй байгаа асуудлыг шийдвэрлэнэ үү?',
    owner: 'Altai',
    points: 3,
    checks: [
      {
        device: 'corp-dsw01',
        commands: ['show run | sec inc router ospf 2'],
        matchRules: ['capability vrf-lite']
      },
      {
        device: 'corp-dsw01',
        commands: ['show run | sec inc router ospf 3'],
        matchRules: ['capability vrf-lite']
      }
    ]
  },
  {
    id: 'c11',
    category: 'Troubleshooting',
    subCategory: 'NAT',
    description: 'Байгууллагын дотоод сүлжээнээс(FinDep, TechDep) интернэт холбогдохгүй байгаа асуудлыг шийднэ үү?',
    owner: 'Altai',
    points: 2,
    checks: [
      {
        device: 'wan-rtr01',
        commands: ['show ip nat statistics'],
        matchRules: [
          'GigabitEthernet0/0.300',
          'GigabitEthernet0/1.300',
          'GigabitEthernet0/2'
        ]
      },
      {
        device: 'wan-rtr01',
        commands: ['show run | inc access-list'],
        matchRules: [
          'deny ip 10.1.1.0 0.0.0.255 10.1.8.0 0.0.0.255',
          'deny ip 10.1.2.0 0.0.0.255 10.1.8.0 0.0.0.255',
          'permit ip 10.1.1.0 0.0.0.255 any',
          'permit ip 10.1.2.0 0.0.0.255 any'
        ]
      }
    ]
  },
  {
    id: 'c13',
    category: 'Implementation',
    subCategory: 'IPsec',
    description: 'Байгууллагын дотоод сүлжээ болон салбарын дотоод сүлжээг холбосон site to site VPN тохиргоог BrachGW болон GW-1 router дээр хийж гүйцэтгэнэ үү?',
    owner: 'Altai',
    points: 4,
    checks: [
      {
        device: 'wan-rtr01',
        commands: ['show crypto ipsec sa'],
        matchRules: [
          '10.1.8.0/255.255.255.0/0/0',
          { type: 'regex_gt', pattern: '#pkts encaps:\\s*(\\d+)', minValue: 1 },
          { type: 'regex_gt', pattern: '#pkts decaps:\\s*(\\d+)', minValue: 1 }
        ]
      }
    ]
  },
  {
    id: 'c14',
    category: 'Service',
    subCategory: 'NTP',
    description: 'Fusion router#1 дээр NTP Master тохиргоо хийнэ үү, Fusion router#2-ын цагийн тохиргоогоо fusion router#1-ээс авна. Fusion router#1 цагаа EVE-NG системийн хаягаасаа sync хийдэг байхаар тохируулна. Цагийн бүсийг ULAT 8 байхаар заана. Source interface-ийг төхөөрөмжийн management interface-ээр хийх хэрэгтэйг санаарай.',
    owner: 'Byambaa',
    points: 2,
    checks: [
      {
        device: 'Fusion-rtr01',
        commands: ['show ntp associations', 'show clock'],
        matchRules: ['10.16.15.3', 'ULAT']
      },
      {
        device: 'Fusion-rtr02',
        commands: ['show ntp associations', 'show clock'],
        matchRules: ['10.1.17.3', 'ULAT']
      }
    ]
  },
  {
    id: 'c15',
    category: 'Service',
    subCategory: 'HSRP',
    description: 'CorpGW#2 дээр Vlan 20-ийн HSRP Master төлөвийг шилжүүлэх тохиргоог хийнэ үү.',
    owner: 'Byambaa',
    points: 2,
    checks: [
      {
        device: 'corp-dsw02',
        commands: ['show standby vlan 20 | include State'],
        matchRules: ['State is Active']
      }
    ]
  },
  {
    id: 'c16',
    category: 'DevOps',
    subCategory: 'TCLSH',
    description: 'Fusion router болон Wan router-ийн OSPF BGP Status-уудыг шалгадаг TCLSH script-ийг хөгжүүл. Script-ыг wan router#1 дээр statuscheck нэртэй file үүсгэн хадгална.',
    owner: 'Byambaa',
    points: 2,
    checks: []
  },
  {
    id: 'c17',
    category: 'Troubleshooting',
    subCategory: 'OSPF',
    description: 'Fusion router#2 дээр өгсөн OSPF Log дээрээс асуудлыг илрүүлж Neighbor full болохгүй байгаа асуудлыг шийдвэрлэж засварла',
    owner: 'Byambaa',
    points: 2,
    checks: [
      {
        device: 'Fusion-rtr02',
        commands: ['show ip ospf neighbor | inc 1020'],
        matchRules: ['FULL/', '10.1.18.5', 'GigabitEthernet0/0.1020']
      }
    ]
  },
  {
    id: 'c18',
    category: 'Service',
    subCategory: 'TFTP',
    description: 'Corp-esw#3 ийн дээр hardware гэмтсэний улмаас төхөөрөмж эвдэрсэн тул сүлжээний инженер шинээр төхөөрөмж суурилуулсан. Хуучин төхөөрөмжийн тохиргоо TFPT Server дээр хадгалагдаж байгаа тул backup тохиргоог switch-рүү татаж авч үйлчиллэгээг сэргээ. corp-esw03-confg',
    owner: 'Byambaa',
    points: 2,
    checks: [
      {
        device: 'corp-esw03',
        commands: ['show running-config | include JwX0|/M4P+S4'],
        matchRules: ['JwX0|/M4P+S4']
      }
    ]
  },
  {
    id: 'c19',
    category: 'Implementation',
    subCategory: 'TFTP',
    description: 'Corp-esw01 тохиргоогоо backup хийдэг тохиргоо байхгүй, Corp-esw02 дээр гарсан асуудал дахин үүсэхээс сэргийлж төхөөрөмжүүдийн running-config ийг TFTP Server-лүү 10 минут тутамд automate-аар хадгалдаг шийдлийг олж хэрэгжүүл. TFTP Server дээр тохиргоог хадгалахдаа Hostname-time форматаар хадгална.',
    owner: 'Byambaa',
    points: 2,
    checks: [
      {
        device: 'corp-esw01',
        commands: ['show running-config | sec archive'],
        matchRules: ['path tftp://10.16.15.3/$h-$t', 'time-period 10']
      }
    ]
  },
  {
    id: 'c20',
    category: 'Troubleshooting',
    subCategory: 'STP',
    description: 'corp-esw02 ийн Uplink нь CorpGW-1 рүү холбогдсон холболт бүх vlan spanning-tree block төлөвт орсон асуудлыг засварла.',
    owner: 'Byambaa',
    points: 2,
    checks: [
      {
        device: 'corp-esw02',
        commands: ['show spanning-tree | inc Et0/1'],
        matchRules: [
          { type: 'count', substring: 'Root FWD', minCount: 3 }
        ]
      }
    ]
  }
];

module.exports = { challenges, DEVICE_MAP, DEVICE_IP };
